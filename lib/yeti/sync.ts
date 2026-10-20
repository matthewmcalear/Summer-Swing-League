import { apply, applyAll, type Action } from './actions'
import type { Board } from './model'
import { sanitizeBoard } from './validate'

/**
 * Keeps one phone's copy of the board in step with the shared one.
 *
 * The phone shows `server board + its own pending actions`. Changes save in
 * the background with the version they were based on; if another phone saved
 * first (HTTP 409) the server sends its newer board and this phone replays its
 * pending actions on top of it, so neither phone's change is lost. While the
 * page is visible it polls for changes made elsewhere. Everything is cached in
 * localStorage, so the board opens instantly and edits made offline are sent
 * once the connection is back.
 */

export type SyncStatus = 'loading' | 'live' | 'saving' | 'offline' | 'error'

export interface SyncState {
  board: Board | null
  status: SyncStatus
  version: number
  /** When the shared board last changed (ISO), as reported by the server. */
  updatedAt: string | null
  canUndo: boolean
  /** Increments whenever a change made on another phone arrives. */
  remoteChanges: number
  error: string | null
}

export interface SyncOptions {
  endpoint: string
  fetch?: typeof fetch
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
  storageKey?: string
  pollMs?: number
  debounceMs?: number
}

interface ServerPayload {
  version: number
  updatedAt: string | null
  board?: unknown
}

interface Cached {
  board: unknown
  version: number
  updatedAt: string | null
  pending: Action[]
}

const UNDO_LIMIT = 40

export class BoardSync {
  private server: Board | null = null
  private version = 0
  private updatedAt: string | null = null
  private pending: Action[] = []
  private undoStack: Board[] = []
  private view: Board | null = null
  private status: SyncStatus = 'loading'
  private remoteChanges = 0
  private error: string | null = null

  private inflight = false
  private fetching = false
  private running = false
  private visible = true
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private retryMs = 0
  private conflicts = 0

  private listeners = new Set<() => void>()
  private snapshot: SyncState

  private readonly endpoint: string
  private readonly fetchImpl: typeof fetch
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null
  private readonly storageKey: string
  private readonly pollMs: number
  private readonly debounceMs: number

  constructor(opts: SyncOptions) {
    this.endpoint = opts.endpoint
    this.fetchImpl = opts.fetch ?? ((...args) => fetch(...args))
    this.storage = opts.storage ?? null
    this.storageKey = opts.storageKey ?? 'yeti:board'
    this.pollMs = opts.pollMs ?? 4000
    this.debounceMs = opts.debounceMs ?? 300
    this.snapshot = this.makeSnapshot()
  }

  // ── Subscription (shaped for React's useSyncExternalStore) ────────────────

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): SyncState => this.snapshot

  private makeSnapshot(): SyncState {
    return {
      board: this.view,
      status: this.status,
      version: this.version,
      updatedAt: this.updatedAt,
      canUndo: this.undoStack.length > 0,
      remoteChanges: this.remoteChanges,
      error: this.error,
    }
  }

  private emit() {
    this.snapshot = this.makeSnapshot()
    for (const l of this.listeners) l()
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  start() {
    if (this.running) return
    this.running = true
    this.loadCache()
    this.emit()
    void this.refresh()
  }

  stop() {
    this.running = false
    for (const t of [this.flushTimer, this.pollTimer, this.retryTimer]) if (t) clearTimeout(t)
    this.flushTimer = this.pollTimer = this.retryTimer = null
  }

  /** Poll only while the page is on screen; check right away when it comes back. */
  setVisible(visible: boolean) {
    this.visible = visible
    if (!visible) {
      if (this.pollTimer) clearTimeout(this.pollTimer)
      this.pollTimer = null
    } else if (this.running) {
      void this.refresh()
    }
  }

  // ── Editing ────────────────────────────────────────────────────────────────

  dispatch(action: Action): boolean {
    if (!this.view) return false
    const next = apply(this.view, action)
    if (next === this.view) return false
    this.undoStack.push(this.view)
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift()
    this.pending.push(action)
    this.view = next
    this.afterLocalChange()
    return true
  }

  undo(): boolean {
    const prev = this.undoStack.pop()
    if (!prev || !this.view) return false
    this.pending.push({ t: 'restore', board: prev })
    this.view = apply(this.view, { t: 'restore', board: prev })
    this.afterLocalChange()
    return true
  }

  private afterLocalChange() {
    this.error = null
    this.persist()
    this.emit()
    if (this.flushTimer) clearTimeout(this.flushTimer)
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      void this.flush()
    }, this.debounceMs)
  }

  // ── Network ────────────────────────────────────────────────────────────────

  /** Fetch the latest board (if it changed) and send anything pending. */
  async refresh(): Promise<void> {
    if (this.pollTimer) clearTimeout(this.pollTimer)
    this.pollTimer = null
    if (!this.inflight && !this.fetching) {
      this.fetching = true
      try {
        const url = this.server ? `${this.endpoint}?v=${this.version}` : this.endpoint
        const res = await this.fetchImpl(url, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = (await res.json()) as ServerPayload
        this.receive(body)
        if (this.status === 'offline' || this.status === 'loading' || this.status === 'error') {
          this.status = this.pending.length ? 'saving' : 'live'
        }
        this.retryMs = 0
      } catch {
        this.status = 'offline'
      } finally {
        this.fetching = false
      }
      this.persist()
      this.emit()
    }
    if (this.pending.length && !this.inflight) void this.flush()
    this.schedulePoll()
  }

  private schedulePoll() {
    if (!this.running || !this.visible) return
    if (this.pollTimer) clearTimeout(this.pollTimer)
    this.pollTimer = setTimeout(() => void this.refresh(), this.status === 'offline' ? Math.max(this.pollMs, 8000) : this.pollMs)
  }

  /** Take in a board from the server (a poll result or a 409 conflict). */
  private receive(body: ServerPayload) {
    if (body.board === undefined || body.board === null) return // unchanged
    const incoming = sanitizeBoard(body.board)
    if (!incoming) return
    const remote = this.server !== null && body.version !== this.version
    this.server = incoming
    this.version = body.version
    this.updatedAt = body.updatedAt ?? null
    if (remote) {
      // Someone else changed the board: older undo snapshots would wipe their work.
      this.undoStack = []
      this.pending = this.pending.filter((a) => a.t !== 'restore')
      this.remoteChanges++
    }
    this.view = applyAll(this.server, this.pending)
  }

  private async flush(): Promise<void> {
    if (this.inflight || !this.pending.length || !this.server) return
    this.inflight = true
    this.status = 'saving'
    this.emit()

    const batch = this.pending.slice()
    const board = applyAll(this.server, batch)
    let retryNow = false
    try {
      const res = await this.fetchImpl(this.endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseVersion: this.version, board }),
      })
      if (res.ok) {
        const body = (await res.json()) as ServerPayload
        this.pending = this.pending.slice(batch.length)
        this.server = sanitizeBoard(body.board) ?? board
        this.version = body.version
        this.updatedAt = body.updatedAt ?? null
        this.view = applyAll(this.server, this.pending)
        this.status = this.pending.length ? 'saving' : 'live'
        this.retryMs = 0
        this.conflicts = 0
        retryNow = this.pending.length > 0
      } else if (res.status === 409) {
        // Another phone saved first: replay our pending actions on its board.
        this.receive((await res.json()) as ServerPayload)
        this.conflicts++
        if (this.conflicts < 5) retryNow = true
        else throw new Error('Repeated save conflicts')
      } else if (res.status === 400 || res.status === 413) {
        // The server refused these changes; drop them and resync.
        this.pending = this.pending.slice(batch.length)
        this.view = this.server ? applyAll(this.server, this.pending) : this.view
        this.status = 'error'
        this.error = "That change couldn't be saved, so it was undone."
      } else {
        throw new Error(`HTTP ${res.status}`)
      }
    } catch {
      this.status = 'offline'
      this.retryMs = Math.min(30000, Math.max(2000, this.retryMs * 2))
      if (this.retryTimer) clearTimeout(this.retryTimer)
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null
        void this.flush()
      }, this.retryMs)
    } finally {
      this.inflight = false
    }
    this.persist()
    this.emit()
    if (retryNow) void this.flush()
    else if (this.status === 'error') void this.refresh()
  }

  // ── Local cache ────────────────────────────────────────────────────────────

  private loadCache() {
    if (!this.storage) return
    try {
      const raw = this.storage.getItem(this.storageKey)
      if (!raw) return
      const cached = JSON.parse(raw) as Cached
      const board = sanitizeBoard(cached.board)
      if (!board || typeof cached.version !== 'number') return
      this.server = board
      this.version = cached.version
      this.updatedAt = cached.updatedAt ?? null
      this.pending = Array.isArray(cached.pending) ? cached.pending.filter((a) => a && typeof a === 'object' && 't' in a) : []
      this.view = applyAll(board, this.pending)
    } catch {
      // A corrupt cache just means a fresh load from the server.
    }
  }

  private persist() {
    if (!this.storage || !this.server) return
    try {
      const cached: Cached = { board: this.server, version: this.version, updatedAt: this.updatedAt, pending: this.pending }
      this.storage.setItem(this.storageKey, JSON.stringify(cached))
    } catch {
      // Storage full or blocked (private mode): the board still works, just not offline.
    }
  }
}
