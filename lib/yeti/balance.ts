import {
  SKILL_POINTS,
  attendanceOf,
  fitFor,
  parseSlot,
  slotsFor,
  type Board,
  type Game,
  type Player,
  type SlotDef,
} from './model'

/**
 * Line suggestions for the "Auto" button.
 *
 *  fill    — keep everyone where they are and drop bench players into the
 *            open spots, choosing who goes where to even out the lines.
 *  rebuild — redo every skater spot from the available players so each line's
 *            average skill is as even as possible, keeping players in their
 *            position (D on D, F up front; F/D anywhere) and, between equally
 *            good options, moving as few people as possible.
 *
 * The goalie stays in net if he's available; otherwise the best available
 * goalie goes in. Players marked out are never used; unconfirmed players are
 * used only when they're needed or clearly help.
 *
 * The search is a small local search (pairwise swaps from several starting
 * points) — rosters are ~15 players, so it runs in a few milliseconds and is
 * deterministic for a given board.
 */

export type BalanceMode = 'fill' | 'rebuild'

export interface Suggestion {
  slots: Record<string, string>
  /** Players whose spot changes (including newly placed ones). */
  moved: number
  /** Players added to the lineup from the bench. */
  added: number
}

const W = {
  emptyF: 40, // an open forward spot (always worth filling when someone can)
  emptyD: 55, // an open D spot is worse — leave holes up front first
  emptyEarlyLine: 0.5, // per line: holes go to the later lines
  stretch: 7, // D playing forward / F playing D
  wrong: 500, // a goalie skating
  maybe: 2.5, // prefer confirmed players
  spreadF: 6,
  varF: 3,
  spreadD: 5,
  varD: 2.5,
  moveLine: 0.9, // rebuild: player changes line
  moveRole: 0.25, // rebuild: same line, different spot
}

interface Ctx {
  defs: SlotDef[]
  fLines: number
  dPairs: number
  byId: Map<string, Player>
  maybe: Set<string>
  current: Map<string, SlotDef>
  stability: boolean
}

function cost(ctx: Ctx, arr: (string | null)[]): number {
  const { defs } = ctx
  let c = 0
  const fSum = new Array(ctx.fLines).fill(0)
  const fCnt = new Array(ctx.fLines).fill(0)
  const dSum = new Array(ctx.dPairs).fill(0)
  const dCnt = new Array(ctx.dPairs).fill(0)

  for (let i = 0; i < defs.length; i++) {
    const def = defs[i]
    const pid = arr[i]
    const isF = def.kind === 'F'
    const lineCount = isF ? ctx.fLines : ctx.dPairs
    if (!pid) {
      c += (isF ? W.emptyF : W.emptyD) + (lineCount - def.line) * W.emptyEarlyLine
      continue
    }
    const p = ctx.byId.get(pid)!
    const fit = fitFor(p.pos, def.kind)
    if (fit === 'stretch') c += W.stretch
    else if (fit === 'wrong') c += W.wrong
    if (ctx.maybe.has(pid)) c += W.maybe
    const pts = SKILL_POINTS[p.skill]
    if (isF) {
      fSum[def.line - 1] += pts
      fCnt[def.line - 1]++
    } else {
      dSum[def.line - 1] += pts
      dCnt[def.line - 1]++
    }
    if (ctx.stability) {
      const was = ctx.current.get(pid)
      if (was && (was.kind !== def.kind || was.line !== def.line)) c += W.moveLine
      else if (was && was.role !== def.role) c += W.moveRole
    }
  }

  c += balanceCost(fSum, fCnt, W.spreadF, W.varF)
  c += balanceCost(dSum, dCnt, W.spreadD, W.varD)
  return c
}

function balanceCost(sum: number[], cnt: number[], wSpread: number, wVar: number): number {
  const avgs: number[] = []
  for (let i = 0; i < sum.length; i++) if (cnt[i]) avgs.push(sum[i] / cnt[i])
  if (avgs.length < 2) return 0
  const mean = avgs.reduce((a, b) => a + b, 0) / avgs.length
  let v = 0
  for (const a of avgs) v += (a - mean) ** 2
  return wSpread * (Math.max(...avgs) - Math.min(...avgs)) + wVar * v
}

// Small deterministic PRNG so the same board always gets the same suggestion.
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function climb(ctx: Ctx, arr: (string | null)[], mutable: number[], slotCount: number): number {
  let best = cost(ctx, arr)
  for (let round = 0; round < 60; round++) {
    let improved = false
    for (let a = 0; a < mutable.length; a++) {
      for (let b = a + 1; b < mutable.length; b++) {
        const i = mutable[a]
        const j = mutable[b]
        if (i >= slotCount && j >= slotCount) continue // bench ↔ bench changes nothing
        if (arr[i] === arr[j]) continue
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
        const c = cost(ctx, arr)
        if (c < best - 1e-9) {
          best = c
          improved = true
        } else {
          ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
      }
    }
    if (!improved) break
  }
  return best
}

export function suggestLineup(board: Board, game: Game, mode: BalanceMode): Suggestion {
  const byId = new Map(board.players.map((p) => [p.id, p]))
  const defs = slotsFor(game).filter((d) => d.kind !== 'G')
  const available = (p: Player) => attendanceOf(game, p.id) !== 'out'
  const rankAttendance = (p: Player) => (attendanceOf(game, p.id) === 'in' ? 0 : 1)

  // Current lineup, ignoring anything stale.
  const current = new Map<string, SlotDef>()
  for (const [slot, pid] of Object.entries(game.slots)) {
    const def = parseSlot(slot)
    const p = byId.get(pid)
    if (def && p && available(p)) current.set(pid, def)
  }

  // In fill mode nobody already placed moves — not even a backup goalie skating.
  const fixedSkaters = new Set<string>()
  if (mode === 'fill') {
    for (const [pid, def] of current) if (def.kind !== 'G') fixedSkaters.add(pid)
  }

  // Goalie: keep whoever's in net; otherwise the best available goalie.
  const inNet = game.slots.G && byId.get(game.slots.G)
  let goalie: string | null = inNet && available(inNet) ? inNet.id : null
  if (!goalie) {
    const goalies = board.players
      .filter((p) => p.pos === 'G' && available(p) && !fixedSkaters.has(p.id))
      .sort((a, b) => rankAttendance(a) - rankAttendance(b) || SKILL_POINTS[b.skill] - SKILL_POINTS[a.skill])
    goalie = goalies[0]?.id ?? null
  }

  // Skaters who could play. Backup goalies stay on the bench.
  const pool = board.players.filter((p) => available(p) && p.id !== goalie && p.pos !== 'G')
  const inPool = new Set(pool.map((p) => p.id))
  const maybe = new Set(pool.filter((p) => attendanceOf(game, p.id) === 'maybe').map((p) => p.id))

  const ctx: Ctx = { defs, fLines: game.fLines, dPairs: game.dPairs, byId, maybe, current, stability: mode === 'rebuild' }

  // Positions: one per skater slot, then one per bench seat.
  const slotCount = defs.length
  const start: (string | null)[] = defs.map((d) => {
    const pid = game.slots[d.id]
    if (!pid || !current.has(pid) || pid === goalie) return null
    return fixedSkaters.has(pid) || inPool.has(pid) ? pid : null
  })
  const onIce = new Set(start.filter(Boolean) as string[])
  const benched = pool.filter((p) => !onIce.has(p.id)).map((p) => p.id)
  const base = [...start, ...benched]

  // fill: only open spots and bench seats may change. rebuild: everything.
  const mutable: number[] = []
  for (let i = 0; i < base.length; i++) if (mode === 'rebuild' || i >= slotCount || base[i] === null) mutable.push(i)

  const rand = mulberry32(hash(`${game.id}|${mode}|${pool.map((p) => p.id).join(',')}`))
  let bestArr = base.slice()
  let bestCost = climb(ctx, bestArr, mutable, slotCount)

  const restarts = mode === 'rebuild' ? 40 : 12
  for (let r = 0; r < restarts; r++) {
    const arr = base.slice()
    const vals = mutable.map((i) => arr[i])
    for (let k = vals.length - 1; k > 0; k--) {
      const j = Math.floor(rand() * (k + 1))
      ;[vals[k], vals[j]] = [vals[j], vals[k]]
    }
    mutable.forEach((i, k) => (arr[i] = vals[k]))
    const c = climb(ctx, arr, mutable, slotCount)
    if (c < bestCost - 1e-9) {
      bestCost = c
      bestArr = arr
    }
  }

  const slots: Record<string, string> = {}
  if (goalie) slots.G = goalie
  defs.forEach((d, i) => {
    const pid = bestArr[i]
    if (pid) slots[d.id] = pid
  })

  let moved = 0
  let added = 0
  for (const [slot, pid] of Object.entries(slots)) {
    const before = Object.entries(game.slots).find(([, p]) => p === pid)?.[0]
    if (before !== slot) moved++
    if (!before) added++
  }
  return { slots, moved, added }
}
