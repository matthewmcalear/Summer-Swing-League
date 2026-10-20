import {
  D_ROLES,
  F_ROLES,
  LIMITS,
  attendanceOf,
  compareGames,
  slotInLayout,
  slotOf,
  type Attendance,
  type Board,
  type Game,
  type Player,
} from './model'
import {
  cleanBeer,
  cleanNumber,
  cleanText,
  cleanTime,
  isAttendance,
  isId,
  isPosition,
  isSkill,
  sanitizeBoard,
  sanitizeGame,
  sanitizePlayer,
} from './validate'

/**
 * Every change to the board is an Action, applied by a pure reducer. Actions
 * describe intent ("put Max at D1 LD"), not results, so when two phones edit
 * at once a phone can replay its pending actions on top of the other phone's
 * newer board (see sync.ts) and both changes survive.
 *
 * An action that no longer makes sense (its player or game was deleted
 * meanwhile) is a no-op.
 */
export type Action =
  /** Move a player into a slot. A player already there swaps into the mover's old slot, or goes to the bench. */
  | { t: 'place'; game: string; player: string; slot: string }
  /** Take a player out of the lineup (they stay available). */
  | { t: 'bench'; game: string; player: string }
  /** Set attendance. Marking someone out also takes them out of the lineup. */
  | { t: 'attend'; game: string; player: string; value: Attendance }
  /** Bulk attendance, e.g. everyone still unconfirmed → in. */
  | { t: 'attendAll'; game: string; from: Attendance; to: Attendance }
  /** Swap two whole forward lines or defence pairs. */
  | { t: 'swapLines'; game: string; kind: 'F' | 'D'; a: number; b: number }
  /** Clear one line or pair. */
  | { t: 'clearLine'; game: string; kind: 'F' | 'D' | 'G'; line: number }
  /** Number of forward lines and defence pairs. Players in removed slots go to the bench. */
  | { t: 'layout'; game: string; fLines: number; dPairs: number }
  /** Replace the whole lineup (auto-balance). */
  | { t: 'setSlots'; game: string; slots: Record<string, string> }
  /** Start a game from another game's lines (anyone marked out for this game is left off). */
  | { t: 'copyLines'; game: string; from: string }
  | { t: 'clearSlots'; game: string }
  /** Add or remove one player from who's bringing beer to a game. */
  | { t: 'beer'; game: string; player: string; on: boolean }
  /** Set exactly who's bringing beer (e.g. "his turn", or [] to clear). */
  | { t: 'setBeer'; game: string; players: string[] }
  | { t: 'addPlayer'; player: Player; game?: string; attendance?: Attendance }
  | { t: 'editPlayer'; player: string; patch: Partial<Omit<Player, 'id'>> }
  | { t: 'removePlayer'; player: string }
  | { t: 'addGame'; game: Game }
  | { t: 'editGame'; game: string; patch: Partial<Pick<Game, 'date' | 'opponent' | 'time' | 'rink' | 'home'>> }
  | { t: 'removeGame'; game: string }
  /** Put the board back as it was (undo). */
  | { t: 'restore'; board: Board }

function withGame(board: Board, gameId: string, fn: (game: Game) => Game): Board {
  const i = board.games.findIndex((g) => g.id === gameId)
  if (i < 0) return board
  const next = fn(board.games[i])
  if (next === board.games[i]) return board
  const games = board.games.slice()
  games[i] = next
  return { ...board, games }
}

const hasPlayer = (board: Board, id: string) => board.players.some((p) => p.id === id)

function withoutPlayer(slots: Record<string, string>, playerId: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [slot, pid] of Object.entries(slots)) if (pid !== playerId) out[slot] = pid
  return out
}

function lineSlotIds(kind: 'F' | 'D', line: number): string[] {
  return (kind === 'F' ? F_ROLES : D_ROLES).map((role) => `${kind}${line}-${role}`)
}

export function apply(board: Board, action: Action): Board {
  switch (action.t) {
    case 'place': {
      if (!hasPlayer(board, action.player)) return board
      return withGame(board, action.game, (g) => {
        if (!slotInLayout(action.slot, g)) return g
        const from = slotOf(g, action.player)
        if (from === action.slot) return g
        const occupant = g.slots[action.slot]
        const slots = { ...g.slots }
        if (from) delete slots[from]
        slots[action.slot] = action.player
        if (occupant && from) slots[from] = occupant // swap; otherwise the occupant heads to the bench
        // Dropping someone who was out into the lineup means they're playing.
        const attendance = attendanceOf(g, action.player) === 'out' ? { ...g.attendance, [action.player]: 'in' as const } : g.attendance
        return { ...g, slots, attendance }
      })
    }

    case 'bench':
      return withGame(board, action.game, (g) => (slotOf(g, action.player) ? { ...g, slots: withoutPlayer(g.slots, action.player) } : g))

    case 'attend': {
      if (!hasPlayer(board, action.player) || !isAttendance(action.value)) return board
      return withGame(board, action.game, (g) => {
        if (attendanceOf(g, action.player) === action.value && g.attendance[action.player]) return g
        const attendance = { ...g.attendance, [action.player]: action.value }
        const slots = action.value === 'out' ? withoutPlayer(g.slots, action.player) : g.slots
        return { ...g, attendance, slots }
      })
    }

    case 'attendAll': {
      if (!isAttendance(action.from) || !isAttendance(action.to)) return board
      return withGame(board, action.game, (g) => {
        const attendance = { ...g.attendance }
        let slots = g.slots
        let changed = false
        for (const p of board.players) {
          if (attendanceOf(g, p.id) !== action.from) continue
          attendance[p.id] = action.to
          if (action.to === 'out') slots = withoutPlayer(slots, p.id)
          changed = true
        }
        return changed ? { ...g, attendance, slots } : g
      })
    }

    case 'swapLines': {
      const { kind, a, b } = action
      if (a === b || (kind !== 'F' && kind !== 'D')) return board
      return withGame(board, action.game, (g) => {
        const max = kind === 'F' ? g.fLines : g.dPairs
        if (a < 1 || b < 1 || a > max || b > max) return g
        const slots = { ...g.slots }
        const sa = lineSlotIds(kind, a)
        const sb = lineSlotIds(kind, b)
        sa.forEach((idA, i) => {
          const idB = sb[i]
          const pa = g.slots[idA]
          const pb = g.slots[idB]
          delete slots[idA]
          delete slots[idB]
          if (pb) slots[idA] = pb
          if (pa) slots[idB] = pa
        })
        return { ...g, slots }
      })
    }

    case 'clearLine':
      return withGame(board, action.game, (g) => {
        const ids = action.kind === 'G' ? ['G'] : lineSlotIds(action.kind, action.line)
        if (!ids.some((id) => g.slots[id])) return g
        const slots = { ...g.slots }
        for (const id of ids) delete slots[id]
        return { ...g, slots }
      })

    case 'layout':
      return withGame(board, action.game, (g) => {
        const fLines = Math.min(LIMITS.fLines.max, Math.max(LIMITS.fLines.min, Math.round(action.fLines)))
        const dPairs = Math.min(LIMITS.dPairs.max, Math.max(LIMITS.dPairs.min, Math.round(action.dPairs)))
        if (!Number.isFinite(fLines) || !Number.isFinite(dPairs)) return g
        if (fLines === g.fLines && dPairs === g.dPairs) return g
        const slots: Record<string, string> = {}
        for (const [slot, pid] of Object.entries(g.slots)) if (slotInLayout(slot, { fLines, dPairs })) slots[slot] = pid
        return { ...g, fLines, dPairs, slots }
      })

    case 'setSlots':
      return withGame(board, action.game, (g) => {
        const ids = new Set(board.players.map((p) => p.id))
        const clean = sanitizeGame({ ...g, slots: action.slots }, ids)
        return clean ? { ...g, slots: clean.slots } : g
      })

    case 'copyLines': {
      const from = board.games.find((g) => g.id === action.from)
      if (!from || action.from === action.game) return board
      const known = new Set(board.players.map((p) => p.id))
      return withGame(board, action.game, (g) => {
        const slots: Record<string, string> = {}
        for (const [slot, pid] of Object.entries(from.slots)) {
          if (known.has(pid) && attendanceOf(g, pid) !== 'out') slots[slot] = pid
        }
        return { ...g, fLines: from.fLines, dPairs: from.dPairs, slots }
      })
    }

    case 'clearSlots':
      return withGame(board, action.game, (g) => (Object.keys(g.slots).length ? { ...g, slots: {} } : g))

    case 'beer': {
      if (!hasPlayer(board, action.player)) return board
      return withGame(board, action.game, (g) => {
        const has = g.beer.includes(action.player)
        if (has === action.on) return g
        if (action.on && g.beer.length >= LIMITS.beer) return g
        return { ...g, beer: action.on ? [...g.beer, action.player] : g.beer.filter((id) => id !== action.player) }
      })
    }

    case 'setBeer':
      return withGame(board, action.game, (g) => {
        const beer = cleanBeer(action.players, new Set(board.players.map((p) => p.id)))
        return beer.length === g.beer.length && beer.every((id, i) => id === g.beer[i]) ? g : { ...g, beer }
      })

    case 'addPlayer': {
      const player = sanitizePlayer(action.player)
      if (!player || hasPlayer(board, player.id) || board.players.length >= LIMITS.players) return board
      const next = { ...board, players: [...board.players, player] }
      if (action.game && action.attendance && isAttendance(action.attendance)) {
        return withGame(next, action.game, (g) => ({ ...g, attendance: { ...g.attendance, [player.id]: action.attendance! } }))
      }
      return next
    }

    case 'editPlayer': {
      const i = board.players.findIndex((p) => p.id === action.player)
      if (i < 0) return board
      const cur = board.players[i]
      const patch = action.patch
      const name = patch.name !== undefined ? cleanText(patch.name, LIMITS.nameLength) : cur.name
      const updated: Player = {
        ...cur,
        name: name || cur.name,
        number: patch.number !== undefined ? cleanNumber(patch.number) : cur.number,
        skill: patch.skill !== undefined && isSkill(patch.skill) ? patch.skill : cur.skill,
        pos: patch.pos !== undefined && isPosition(patch.pos) ? patch.pos : cur.pos,
      }
      if (updated.name === cur.name && updated.number === cur.number && updated.skill === cur.skill && updated.pos === cur.pos) return board
      const players = board.players.slice()
      players[i] = updated
      return { ...board, players }
    }

    case 'removePlayer': {
      if (!hasPlayer(board, action.player)) return board
      return {
        ...board,
        players: board.players.filter((p) => p.id !== action.player),
        games: board.games.map((g) => {
          const attendance = { ...g.attendance }
          delete attendance[action.player]
          return { ...g, attendance, slots: withoutPlayer(g.slots, action.player), beer: g.beer.filter((id) => id !== action.player) }
        }),
      }
    }

    case 'addGame': {
      if (board.games.length >= LIMITS.games || board.games.some((g) => g.id === action.game.id)) return board
      const game = sanitizeGame(action.game, new Set(board.players.map((p) => p.id)))
      if (!game) return board
      return { ...board, games: [...board.games, game].sort(compareGames) }
    }

    case 'editGame': {
      const next = withGame(board, action.game, (g) => {
        const p = action.patch
        const merged = {
          ...g,
          date: p.date !== undefined ? p.date : g.date,
          opponent: p.opponent !== undefined ? p.opponent : g.opponent,
          time: p.time !== undefined ? p.time : g.time,
          rink: p.rink !== undefined ? p.rink : g.rink,
          home: p.home !== undefined ? p.home : g.home,
        }
        const clean = sanitizeGame(merged, new Set(Object.keys(g.attendance).concat(Object.values(g.slots))))
        if (!clean) return g // e.g. an impossible date
        const same = clean.date === g.date && clean.opponent === g.opponent && clean.time === g.time && clean.rink === g.rink && clean.home === g.home
        return same ? g : { ...g, date: clean.date, opponent: clean.opponent, time: clean.time, rink: clean.rink, home: clean.home }
      })
      return next === board ? board : { ...next, games: next.games.slice().sort(compareGames) }
    }

    case 'removeGame':
      if (!isId(action.game) || !board.games.some((g) => g.id === action.game)) return board
      return { ...board, games: board.games.filter((g) => g.id !== action.game) }

    case 'restore':
      return sanitizeBoard(action.board) ?? board

    default:
      return board
  }
}

export function applyAll(board: Board, actions: readonly Action[]): Board {
  return actions.reduce(apply, board)
}

/** A new game, optionally starting from another game's lines and/or attendance. */
export function newGame(
  details: { id: string; date: string; opponent?: string; time?: string; rink?: string; home?: boolean | null },
  from: Game | undefined,
  opts: { copyLines: boolean; copyAttendance: boolean },
): Game {
  const attendance: Record<string, Attendance> = opts.copyAttendance && from ? { ...from.attendance } : {}
  const slots: Record<string, string> = {}
  if (opts.copyLines && from) {
    for (const [slot, pid] of Object.entries(from.slots)) if (attendance[pid] !== 'out') slots[slot] = pid
  }
  return {
    id: details.id,
    date: details.date,
    time: cleanTime(details.time),
    rink: cleanText(details.rink, LIMITS.rinkLength),
    opponent: cleanText(details.opponent, LIMITS.opponentLength),
    home: typeof details.home === 'boolean' ? details.home : null,
    fLines: from?.fLines ?? LIMITS.fLines.default,
    dPairs: from?.dPairs ?? LIMITS.dPairs.default,
    attendance,
    slots,
    beer: [], // the beer rotation moves on every game; never copied
  }
}
