import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyAction, seedLedger, summarize, type Action, type Ledger } from './model'
import { LedgerSync } from './sync'

const add = (id: string): Action => ({ type: 'add', ringId: 'ring-3', entry: { id, who: 'others', amount: 5, date: null } })

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

function memoryStorage() {
  const map = new Map<string, string>()
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) }
}

/** A stand-in server: same reducer as the real one, with a switch to go offline. */
function fakeServer() {
  const server = { ledger: seedLedger() as Ledger, down: false, signedIn: true, posts: 0 }
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    if (server.down) throw new TypeError('offline')
    if (!server.signedIn) return reply({ error: 'sign in' }, 401)
    if (init?.method === 'POST') {
      server.posts++
      const { actions } = JSON.parse(String(init.body)) as { actions: Action[] }
      server.ledger = actions.reduce((l, a) => applyAction(l, a), server.ledger)
    }
    return reply({ ledger: server.ledger, version: 1 })
  }) as unknown as typeof globalThis.fetch
  return { server, fetch }
}

const value = (sync: LedgerSync) => summarize(sync.getSnapshot().ledger!).value

describe('LedgerSync', () => {
  const live: LedgerSync[] = []
  const make = (options: ConstructorParameters<typeof LedgerSync>[0]) => {
    const sync = new LedgerSync(options)
    live.push(sync)
    return sync
  }
  afterEach(() => live.splice(0).forEach((s) => s.stop()))

  it('loads the ledger', async () => {
    const { fetch } = fakeServer()
    const sync = make({ storage: null, fetch })
    await sync.refresh()
    expect(sync.getSnapshot()).toMatchObject({ phase: 'ready', unsaved: 0 })
    expect(value(sync)).toBe(657)
  })

  it('shows a tap immediately, then saves it', async () => {
    const { server, fetch } = fakeServer()
    const sync = make({ storage: null, fetch })
    await sync.refresh()
    sync.dispatch(add('a'))
    expect(value(sync)).toBe(662)
    await vi.waitFor(() => expect(sync.getSnapshot().unsaved).toBe(0))
    expect(summarize(server.ledger).value).toBe(662)
    expect(value(sync)).toBe(662)
  })

  it('keeps taps made with no signal and sends them on retry', async () => {
    const { server, fetch } = fakeServer()
    const sync = make({ storage: null, fetch, retryMs: 5 })
    await sync.refresh()
    server.down = true
    sync.dispatch(add('a'))
    await vi.waitFor(() => expect(sync.getSnapshot().offline).toBe(true))
    expect(value(sync)).toBe(662)
    expect(sync.getSnapshot().unsaved).toBe(1)
    server.down = false
    await vi.waitFor(() => expect(sync.getSnapshot().unsaved).toBe(0))
    expect(summarize(server.ledger).value).toBe(662)
    expect(sync.getSnapshot().offline).toBe(false)
  })

  it('still has unsent taps after the page is closed and reopened', async () => {
    const storage = memoryStorage()
    const { server, fetch } = fakeServer()
    const first = make({ storage, fetch })
    await first.refresh()
    server.down = true
    first.dispatch(add('a'))
    await vi.waitFor(() => expect(first.getSnapshot().offline).toBe(true))
    first.stop()

    server.down = false
    const second = make({ storage, fetch })
    second.start()
    expect(value(second)).toBe(662) // straight from the phone, before any network reply
    await vi.waitFor(() => expect(second.getSnapshot().unsaved).toBe(0))
    expect(summarize(server.ledger).value).toBe(662)
  })

  it('does not double-count when a save is retried after a lost reply', async () => {
    const { server, fetch: inner } = fakeServer()
    let dropNext = true
    const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const res = await inner(url, init)
      if (init?.method === 'POST' && dropNext) {
        dropNext = false
        throw new TypeError('reply lost')
      }
      return res
    }) as typeof globalThis.fetch
    const sync = make({ storage: null, fetch, retryMs: 5 })
    await sync.refresh()
    sync.dispatch(add('a'))
    await vi.waitFor(() => expect(sync.getSnapshot().unsaved).toBe(0))
    expect(server.posts).toBe(2)
    expect(summarize(server.ledger).value).toBe(662)
  })

  it('ignores a slow read that finishes after a newer save', async () => {
    const { fetch: inner } = fakeServer()
    let holdReads = false
    let releaseRead: () => void = () => {}
    const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const res = await inner(url, init)
      if (holdReads && init?.method !== 'POST') await new Promise<void>((resolve) => (releaseRead = resolve))
      return res
    }) as typeof globalThis.fetch
    const sync = make({ storage: null, fetch })
    await sync.refresh()

    holdReads = true
    const slowRead = sync.refresh() // answer computed now, before the save below
    sync.dispatch(add('a'))
    await vi.waitFor(() => expect(sync.getSnapshot().unsaved).toBe(0))
    expect(value(sync)).toBe(662)

    releaseRead()
    await slowRead
    expect(value(sync)).toBe(662)
  })

  it('asks for the password when signed out, then sends what was waiting', async () => {
    const { server, fetch: inner } = fakeServer()
    const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).endsWith('/login')) {
        const { password } = JSON.parse(String(init?.body)) as { password: string }
        if (password !== 'right') return reply({ error: 'no' }, 401)
        server.signedIn = true
        return reply({ ok: true })
      }
      return inner(url, init)
    }) as typeof globalThis.fetch
    const sync = make({ storage: null, fetch })
    await sync.refresh()
    server.signedIn = false
    sync.dispatch(add('a'))
    await vi.waitFor(() => expect(sync.getSnapshot().phase).toBe('login'))
    expect(await sync.login('wrong')).toBe('wrong')
    expect(await sync.login('right')).toBe('ok')
    await vi.waitFor(() => expect(sync.getSnapshot().unsaved).toBe(0))
    expect(sync.getSnapshot().phase).toBe('ready')
    expect(summarize(server.ledger).value).toBe(662)
  })

  it('reports a change the server refuses instead of retrying forever', async () => {
    const fetch = (async (_url: string | URL | Request, init?: RequestInit) =>
      init?.method === 'POST' ? reply({ error: 'bad' }, 400) : reply({ ledger: seedLedger(), version: 1 })) as typeof globalThis.fetch
    const sync = make({ storage: null, fetch })
    await sync.refresh()
    sync.dispatch(add('a'))
    await vi.waitFor(() => expect(sync.getSnapshot().unsaved).toBe(0))
    expect(sync.getSnapshot().rejected).toBe(1)
    expect(value(sync)).toBe(657)
  })

  it('shows an error on first load with no connection and nothing saved', async () => {
    const { server, fetch } = fakeServer()
    server.down = true
    const sync = make({ storage: null, fetch })
    await sync.refresh()
    expect(sync.getSnapshot().phase).toBe('error')
  })
})
