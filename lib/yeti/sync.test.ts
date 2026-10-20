import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyAll } from './actions'
import { attendanceOf, sheetSeed, type Board } from './model'
import { BoardSync } from './sync'
import { sanitizeBoard } from './validate'

const GAME = 'g-2026-10-20'
const game = (b: Board | null) => b!.games.find((g) => g.id === GAME)!

/** In-memory stand-in for /api/yeti with the same contract as the real route. */
class FakeServer {
  board: Board = sheetSeed()
  version = 1
  updatedAt = '2026-10-20T12:00:00.000Z'
  puts = 0
  conflicts = 0
  offline = false

  fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (this.offline) throw new TypeError('Failed to fetch')
    const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
    if (!init?.method || init.method === 'GET') {
      const v = Number(new URL(String(input), 'http://test').searchParams.get('v'))
      return v === this.version
        ? reply(200, { version: this.version, updatedAt: this.updatedAt })
        : reply(200, { version: this.version, updatedAt: this.updatedAt, board: this.board })
    }
    this.puts++
    const { baseVersion, board } = JSON.parse(String(init.body))
    if (baseVersion !== this.version) {
      this.conflicts++
      return reply(409, { version: this.version, updatedAt: this.updatedAt, board: this.board })
    }
    this.board = sanitizeBoard(board)!
    this.version++
    return reply(200, { version: this.version, updatedAt: this.updatedAt, board: this.board })
  }) as typeof fetch
}

class MemoryStorage {
  data = new Map<string, string>()
  getItem = (k: string) => this.data.get(k) ?? null
  setItem = (k: string, v: string) => void this.data.set(k, v)
}

const settle = () => vi.advanceTimersByTimeAsync(1000)

describe('BoardSync', () => {
  let server: FakeServer
  const clients: BoardSync[] = []
  const client = (storage: MemoryStorage | null = null) => {
    const c = new BoardSync({ endpoint: '/api/yeti', fetch: server.fetch, storage, pollMs: 60_000, debounceMs: 50 })
    clients.push(c)
    c.start()
    return c
  }

  beforeEach(() => {
    vi.useFakeTimers()
    server = new FakeServer()
  })
  afterEach(() => {
    clients.splice(0).forEach((c) => c.stop())
    vi.useRealTimers()
  })

  it('loads the shared board and goes live', async () => {
    const a = client()
    expect(a.getSnapshot().status).toBe('loading')
    await settle()
    expect(a.getSnapshot().status).toBe('live')
    expect(a.getSnapshot().board).toEqual(server.board)
  })

  it('shows a change at once and saves it in the background', async () => {
    const a = client()
    await settle()
    a.dispatch({ t: 'attend', game: GAME, player: 'owen', value: 'out' })
    expect(attendanceOf(game(a.getSnapshot().board), 'owen')).toBe('out')
    await settle()
    expect(server.version).toBe(2)
    expect(attendanceOf(game(server.board), 'owen')).toBe('out')
    expect(a.getSnapshot().status).toBe('live')
  })

  it('merges edits made on two phones at the same time', async () => {
    const a = client()
    const b = client()
    await settle()
    a.dispatch({ t: 'place', game: GAME, player: 'owen', slot: 'F2-LW' })
    b.dispatch({ t: 'attend', game: GAME, player: 'dan', value: 'in' })
    b.dispatch({ t: 'place', game: GAME, player: 'dan', slot: 'F3-LW' })
    await settle()
    await settle()
    expect(server.conflicts).toBe(1)
    const g = game(server.board)
    expect(g.slots['F2-LW']).toBe('owen')
    expect(g.slots['F3-LW']).toBe('dan')
    await a.refresh()
    expect(a.getSnapshot().board).toEqual(server.board)
    expect(b.getSnapshot().board).toEqual(server.board)
    expect(a.getSnapshot().remoteChanges).toBe(1)
  })

  it('keeps edits made offline and sends them when back online', async () => {
    const a = client()
    await settle()
    server.offline = true
    a.dispatch({ t: 'attend', game: GAME, player: 'tom', value: 'out' })
    await settle()
    expect(a.getSnapshot().status).toBe('offline')
    expect(attendanceOf(game(a.getSnapshot().board), 'tom')).toBe('out')
    server.offline = false
    await vi.advanceTimersByTimeAsync(5000)
    expect(attendanceOf(game(server.board), 'tom')).toBe('out')
    expect(a.getSnapshot().status).toBe('live')
  })

  it('undoes the last change', async () => {
    const a = client()
    await settle()
    a.dispatch({ t: 'clearSlots', game: GAME })
    await settle()
    expect(Object.keys(game(server.board).slots)).toHaveLength(0)
    expect(a.undo()).toBe(true)
    await settle()
    expect(server.board).toEqual(sheetSeed())
    expect(a.getSnapshot().canUndo).toBe(false)
  })

  it("won't undo over another phone's newer change", async () => {
    const a = client()
    const b = client()
    await settle()
    a.dispatch({ t: 'attend', game: GAME, player: 'owen', value: 'out' })
    await settle()
    b.dispatch({ t: 'attend', game: GAME, player: 'tom', value: 'out' })
    await settle()
    await a.refresh()
    expect(a.getSnapshot().canUndo).toBe(false)
    expect(attendanceOf(game(a.getSnapshot().board), 'tom')).toBe('out')
  })

  it('opens instantly from the cache, with unsent edits', async () => {
    const storage = new MemoryStorage()
    const a = client(storage)
    await settle()
    server.offline = true
    a.dispatch({ t: 'attend', game: GAME, player: 'x', value: 'out' })
    a.stop()
    const again = client(storage)
    expect(attendanceOf(game(again.getSnapshot().board), 'x')).toBe('out')
    server.offline = false
    await settle()
    expect(attendanceOf(game(server.board), 'x')).toBe('out')
  })

  it('a stale cached version rebases onto the server board', async () => {
    const storage = new MemoryStorage()
    const a = client(storage)
    await settle()
    a.stop()
    // Meanwhile someone else changes the board.
    server.board = applyAll(server.board, [{ t: 'attend', game: GAME, player: 'max', value: 'out' }])
    server.version = 7
    const again = client(storage)
    again.dispatch({ t: 'attend', game: GAME, player: 'hugo', value: 'out' })
    await settle()
    await settle()
    const g = game(server.board)
    expect(attendanceOf(g, 'max')).toBe('out')
    expect(attendanceOf(g, 'hugo')).toBe('out')
  })
})
