import { applyAction, type Action, type Ledger } from './model'

// Keeps the phone and the server in step. Every tap shows immediately and goes
// in an outbox saved on the phone, so a sharpening logged with no signal is
// kept and sent when the connection comes back.

export type Phase = 'loading' | 'login' | 'ready' | 'error'

export interface SyncState {
  ledger: Ledger | null
  phase: Phase
  /** Changes waiting to reach the server. */
  unsaved: number
  /** The last attempt to reach the server failed. */
  offline: boolean
  /** Changes the server refused. Should never happen; shown rather than hidden. */
  rejected: number
}

export const EMPTY_SYNC: SyncState = { ledger: null, phase: 'loading', unsaved: 0, offline: false, rejected: 0 }

interface Options {
  storage: Pick<Storage, 'getItem' | 'setItem'> | null
  fetch?: typeof fetch
  retryMs?: number
}

const ENDPOINT = '/api/sparx'
const STORAGE_KEY = 'sparx:v1'
const BATCH = 50
const JSON_HEADERS = { 'Content-Type': 'application/json' }

export type LoginResult = 'ok' | 'wrong' | 'error'

export class LedgerSync {
  private server: Ledger | null = null
  private pending: Action[] = []
  private phase: Phase = 'loading'
  private offline = false
  private rejected = 0
  private flushing = false
  private retry: ReturnType<typeof setTimeout> | null = null
  // Responses can land out of order; only ever accept a newer request's answer.
  private requests = 0
  private accepted = 0
  private snapshot: SyncState = EMPTY_SYNC
  private listeners = new Set<() => void>()

  private readonly storage: Options['storage']
  private readonly fetcher: typeof fetch
  private readonly retryMs: number

  constructor(options: Options) {
    this.storage = options.storage
    this.fetcher = options.fetch ?? ((...args) => fetch(...args))
    this.retryMs = options.retryMs ?? 15_000
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.snapshot

  start() {
    this.restore()
    this.emit()
    void this.refresh()
  }

  stop() {
    if (this.retry) clearTimeout(this.retry)
    this.retry = null
  }

  dispatch(action: Action) {
    this.pending = [...this.pending, action]
    this.persist()
    this.emit()
    void this.flush()
  }

  async refresh(): Promise<void> {
    if (this.pending.length > 0) return this.flush()
    const seq = ++this.requests
    try {
      const res = await this.fetcher(ENDPOINT, { cache: 'no-store' })
      if (res.status === 401) return this.needLogin()
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      this.accept(seq, await res.json())
    } catch {
      this.offline = true
      if (!this.server) this.phase = 'error'
      this.emit()
    }
  }

  async login(password: string): Promise<LoginResult> {
    try {
      const res = await this.fetcher(`${ENDPOINT}/login`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ password }) })
      if (res.status === 401) return 'wrong'
      if (!res.ok) return 'error'
      this.phase = 'loading'
      this.emit()
      await this.refresh()
      return 'ok'
    } catch {
      return 'error'
    }
  }

  private async flush(): Promise<void> {
    if (this.flushing || this.pending.length === 0) return
    this.flushing = true
    if (this.retry) clearTimeout(this.retry)
    this.retry = null
    let failed = false
    try {
      while (this.pending.length > 0 && this.phase !== 'login') {
        const batch = this.pending.slice(0, BATCH)
        const seq = ++this.requests
        const res = await this.fetcher(ENDPOINT, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ actions: batch }) })
        if (res.status === 401) {
          this.needLogin()
          break
        }
        if (res.status === 400) {
          // Retrying can't fix a change the server calls invalid, and it would block the rest.
          this.pending = this.pending.slice(batch.length)
          this.rejected += batch.length
          this.persist()
          this.emit()
          continue
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = await res.json()
        this.pending = this.pending.slice(batch.length)
        this.accept(seq, body)
      }
    } catch {
      failed = true
      this.offline = true
      this.emit()
    } finally {
      this.flushing = false
    }
    if (failed) this.retry = setTimeout(() => void this.flush(), this.retryMs)
  }

  private accept(seq: number, body: { ledger: Ledger }) {
    if (seq > this.accepted) {
      this.accepted = seq
      this.server = body.ledger
    }
    this.phase = 'ready'
    this.offline = false
    this.persist()
    this.emit()
  }

  private needLogin() {
    this.phase = 'login'
    this.emit()
  }

  private view(): Ledger | null {
    return this.server ? this.pending.reduce((ledger, action) => applyAction(ledger, action), this.server) : null
  }

  private emit() {
    this.snapshot = { ledger: this.view(), phase: this.phase, unsaved: this.pending.length, offline: this.offline, rejected: this.rejected }
    this.listeners.forEach((l) => l())
  }

  private persist() {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify({ ledger: this.server, pending: this.pending }))
    } catch {
      // storage full or blocked: still works, just not across a reload
    }
  }

  private restore() {
    try {
      const saved = JSON.parse(this.storage?.getItem(STORAGE_KEY) ?? 'null') as { ledger: Ledger | null; pending: Action[] } | null
      if (!saved?.ledger) return
      this.server = saved.ledger
      this.pending = Array.isArray(saved.pending) ? saved.pending : []
      this.phase = 'ready'
    } catch {
      // unreadable cache: start clean from the server
    }
  }
}
