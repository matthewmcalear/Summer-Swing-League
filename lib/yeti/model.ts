/**
 * Yeti lines — the data model behind the lineup board at /yeti.
 *
 * One shared Board holds the roster and every game. Each game keeps its own
 * attendance (in / maybe / out) and its own lines, so next week's lines can be
 * drafted while this week's stay intact. The board travels as one JSON
 * document (see store.ts and sync.ts); everything in this file is plain data
 * and pure helpers, safe to use on the server and in the browser.
 */

export const SKILLS = ['Elite', 'Good', 'Mid', 'Low'] as const
export type Skill = (typeof SKILLS)[number]

/** Points per skill tier — drives line strength and auto-balance. */
export const SKILL_POINTS: Record<Skill, number> = { Elite: 4, Good: 3, Mid: 2, Low: 1 }

export const POSITIONS = ['F', 'D', 'F/D', 'G'] as const
export type Position = (typeof POSITIONS)[number]

export const POSITION_LABEL: Record<Position, string> = {
  F: 'Forward',
  D: 'Defence',
  'F/D': 'Forward or defence',
  G: 'Goalie',
}

/** 'maybe' = hasn't confirmed yet (a blank In/Out cell in the old sheet). */
export const ATTENDANCE = ['in', 'maybe', 'out'] as const
export type Attendance = (typeof ATTENDANCE)[number]

export interface Player {
  id: string
  name: string
  /** Jersey number as text; '' when the player has none. */
  number: string
  skill: Skill
  pos: Position
}

export interface Game {
  id: string
  /** Calendar date, YYYY-MM-DD. */
  date: string
  opponent: string
  /** Forward lines (3 skaters each) and defence pairs this game. */
  fLines: number
  dPairs: number
  /** Player id → attendance. Players missing here haven't answered ('maybe'). */
  attendance: Record<string, Attendance>
  /** Slot id (see slotsFor) → player id. Empty slots are simply absent. */
  slots: Record<string, string>
}

export interface Board {
  v: 1
  players: Player[]
  /** Sorted by date, oldest first. */
  games: Game[]
}

export const LIMITS = {
  players: 40,
  games: 150,
  nameLength: 20,
  numberLength: 3,
  opponentLength: 30,
  fLines: { min: 2, max: 4, default: 3 },
  dPairs: { min: 2, max: 3, default: 2 },
} as const

/** The other five Westmount teams, offered as quick picks for the opponent. */
export const OPPONENTS = ['Kings', 'Hawks', 'Devils', 'Lightning', 'Coyotes'] as const

// ── Slots ────────────────────────────────────────────────────────────────────

export type SlotKind = 'F' | 'D' | 'G'

export interface SlotDef {
  /** e.g. 'F1-LW', 'D2-RD', 'G' */
  id: string
  kind: SlotKind
  /** Line or pair number, 1-based (the goalie is line 1). */
  line: number
  role: 'LW' | 'C' | 'RW' | 'LD' | 'RD' | 'G'
}

export const F_ROLES = ['LW', 'C', 'RW'] as const
export const D_ROLES = ['LD', 'RD'] as const

export const ROLE_LABEL: Record<SlotDef['role'], string> = {
  LW: 'Left wing',
  C: 'Centre',
  RW: 'Right wing',
  LD: 'Left D',
  RD: 'Right D',
  G: 'Goalie',
}

export function slotsFor(layout: Pick<Game, 'fLines' | 'dPairs'>): SlotDef[] {
  const out: SlotDef[] = []
  for (let line = 1; line <= layout.fLines; line++) {
    for (const role of F_ROLES) out.push({ id: `F${line}-${role}`, kind: 'F', line, role })
  }
  for (let line = 1; line <= layout.dPairs; line++) {
    for (const role of D_ROLES) out.push({ id: `D${line}-${role}`, kind: 'D', line, role })
  }
  out.push({ id: 'G', kind: 'G', line: 1, role: 'G' })
  return out
}

const SLOT_RE = /^(?:F([1-9])-(LW|C|RW)|D([1-9])-(LD|RD)|G)$/

export function parseSlot(id: string): SlotDef | null {
  const m = SLOT_RE.exec(id)
  if (!m) return null
  if (id === 'G') return { id, kind: 'G', line: 1, role: 'G' }
  if (m[1]) return { id, kind: 'F', line: Number(m[1]), role: m[2] as SlotDef['role'] }
  return { id, kind: 'D', line: Number(m[3]), role: m[4] as SlotDef['role'] }
}

/** True if the slot exists in this game's layout. */
export function slotInLayout(id: string, layout: Pick<Game, 'fLines' | 'dPairs'>): boolean {
  const s = parseSlot(id)
  if (!s) return false
  if (s.kind === 'F') return s.line <= layout.fLines
  if (s.kind === 'D') return s.line <= layout.dPairs
  return true
}

/** Short label shown with a line: 'L1', 'D2', 'G'. */
export function lineLabel(kind: SlotKind, line: number): string {
  return kind === 'F' ? `L${line}` : kind === 'D' ? `D${line}` : 'G'
}

/** 'L2 C', 'D1 LD', 'G' — where a player is in the lineup. */
export function slotLabel(slot: SlotDef): string {
  return slot.kind === 'G' ? 'Goalie' : `${lineLabel(slot.kind, slot.line)} ${slot.role}`
}

// ── Position fit ─────────────────────────────────────────────────────────────

/** ok = natural spot; stretch = skater out of position (D up front, F on D); wrong = goalie/skater swapped. */
export type Fit = 'ok' | 'stretch' | 'wrong'

export function fitFor(pos: Position, kind: SlotKind): Fit {
  if (kind === 'G') return pos === 'G' ? 'ok' : 'wrong'
  if (pos === 'G') return 'wrong'
  if (pos === 'F/D') return 'ok'
  if (kind === 'F') return pos === 'F' ? 'ok' : 'stretch'
  return pos === 'D' ? 'ok' : 'stretch'
}

// ── Lookups ──────────────────────────────────────────────────────────────────

export function attendanceOf(game: Game, playerId: string): Attendance {
  return game.attendance[playerId] ?? 'maybe'
}

/** Slot id the player occupies in this game, or null when on the bench. */
export function slotOf(game: Game, playerId: string): string | null {
  for (const [slot, pid] of Object.entries(game.slots)) if (pid === playerId) return slot
  return null
}

export function findGame(board: Board, gameId: string): Game | undefined {
  return board.games.find((g) => g.id === gameId)
}

export function compareGames(a: Game, b: Game): number {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** The game to open by default: the next one on or after today, else the latest. */
export function defaultGameId(board: Board, today: string): string | null {
  if (board.games.length === 0) return null
  const upcoming = board.games.find((g) => g.date >= today)
  return (upcoming ?? board.games[board.games.length - 1]).id
}

// ── Dates ────────────────────────────────────────────────────────────────────

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isValidDate(date: string): boolean {
  const m = DATE_RE.exec(date)
  if (!m) return false
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3])
}

/** 'Tue Oct 20' — read as a calendar date, so no time zone can shift it. */
export function formatGameDate(date: string, opts: { year?: boolean } = {}): string {
  if (!isValidDate(date)) return date
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(opts.year ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  })
}

/** Local calendar date as YYYY-MM-DD. */
export function localDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  const p = (n: number) => String(n).padStart(2, '0')
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`
}

// ── Seed: the 2026-27 roster and the Oct 20 lines from the lineup spreadsheet ─

export const SEED_PLAYERS: Player[] = [
  { id: 'euan', name: 'Euan', number: '1', skill: 'Elite', pos: 'G' },
  { id: 'matt', name: 'Matt', number: '3', skill: 'Good', pos: 'F/D' },
  { id: 'steph', name: 'Steph', number: '4', skill: 'Good', pos: 'F/D' },
  { id: 'hugo', name: 'Hugo', number: '5', skill: 'Low', pos: 'D' },
  { id: 'dt', name: 'DT', number: '6', skill: 'Good', pos: 'F' },
  { id: 'max', name: 'Max', number: '7', skill: 'Good', pos: 'D' },
  { id: 'dan', name: 'Dan', number: '9', skill: 'Mid', pos: 'F' },
  { id: 'x', name: 'X', number: '10', skill: 'Mid', pos: 'D' },
  { id: 'tom', name: 'Tom', number: '11', skill: 'Good', pos: 'F' },
  { id: 'steven', name: 'Steven', number: '13', skill: 'Good', pos: 'F/D' },
  { id: 'jeff', name: 'Jeff', number: '15', skill: 'Mid', pos: 'D' },
  { id: 'peter', name: 'Peter', number: '16', skill: 'Good', pos: 'F' },
  { id: 'liam', name: 'Liam', number: '18', skill: 'Low', pos: 'F' },
  { id: 'owen', name: 'Owen', number: '', skill: 'Elite', pos: 'F' },
]

export function seedBoard(): Board {
  const attendance: Record<string, Attendance> = {}
  for (const p of SEED_PLAYERS) attendance[p.id] = p.id === 'dan' ? 'out' : 'in'
  return {
    v: 1,
    players: SEED_PLAYERS.map((p) => ({ ...p })),
    games: [
      {
        id: 'g-2026-10-20',
        date: '2026-10-20',
        opponent: '',
        fLines: 3,
        dPairs: 2,
        attendance,
        slots: {
          'F1-LW': 'owen', 'F1-C': 'steven', 'F1-RW': 'dt',
          'F2-LW': 'liam', 'F2-C': 'matt', 'F2-RW': 'steph',
          'F3-C': 'peter', 'F3-RW': 'tom',
          'D1-LD': 'jeff', 'D1-RD': 'hugo',
          'D2-LD': 'max', 'D2-RD': 'x',
          G: 'euan',
        },
      },
    ],
  }
}
