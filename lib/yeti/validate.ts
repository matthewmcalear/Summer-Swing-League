import {
  ATTENDANCE,
  LIMITS,
  POSITIONS,
  SKILLS,
  compareGames,
  isValidDate,
  slotInLayout,
  type Attendance,
  type Board,
  type Game,
  type Player,
  type Position,
  type Skill,
} from './model'

/**
 * Cleans anything that claims to be a Board — from the network, the database
 * or localStorage — into a well-formed one. Bad entries are dropped rather than
 * rejecting the whole board, so one odd field never loses a team's lines.
 * Returns null only when the input isn't recognisably a board at all.
 */

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function isId(v: unknown): v is string {
  return typeof v === 'string' && ID_RE.test(v)
}

/** Collapses whitespace and trims to `max` characters. */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.replace(/\s+/g, ' ').trim().slice(0, max).trim()
}

export function cleanNumber(v: unknown): string {
  const s = typeof v === 'number' && Number.isFinite(v) ? String(v) : cleanText(v, 8)
  if (s === '-' || s === '—') return ''
  return s.replace(/[^0-9A-Za-z]/g, '').slice(0, LIMITS.numberLength)
}

export function isSkill(v: unknown): v is Skill {
  return typeof v === 'string' && (SKILLS as readonly string[]).includes(v)
}

export function isPosition(v: unknown): v is Position {
  return typeof v === 'string' && (POSITIONS as readonly string[]).includes(v)
}

/** 24-hour HH:MM, or '' when missing or malformed. */
export function cleanTime(v: unknown): string {
  return typeof v === 'string' && TIME_RE.test(v.trim()) ? v.trim() : ''
}

export function isAttendance(v: unknown): v is Attendance {
  return typeof v === 'string' && (ATTENDANCE as readonly string[]).includes(v)
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number.NaN
  if (!Number.isInteger(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function sanitizePlayer(raw: unknown): Player | null {
  if (!isObj(raw) || !isId(raw.id)) return null
  const name = cleanText(raw.name, LIMITS.nameLength)
  if (!name) return null
  return {
    id: raw.id,
    name,
    number: cleanNumber(raw.number),
    skill: isSkill(raw.skill) ? raw.skill : 'Mid',
    pos: isPosition(raw.pos) ? raw.pos : 'F',
  }
}

export function sanitizeGame(raw: unknown, playerIds: ReadonlySet<string>): Game | null {
  if (!isObj(raw) || !isId(raw.id)) return null
  const date = typeof raw.date === 'string' && isValidDate(raw.date) ? raw.date : null
  if (!date) return null

  const fLines = clampInt(raw.fLines, LIMITS.fLines.min, LIMITS.fLines.max, LIMITS.fLines.default)
  const dPairs = clampInt(raw.dPairs, LIMITS.dPairs.min, LIMITS.dPairs.max, LIMITS.dPairs.default)

  const attendance: Record<string, Attendance> = {}
  if (isObj(raw.attendance)) {
    for (const [pid, value] of Object.entries(raw.attendance)) {
      if (playerIds.has(pid) && isAttendance(value)) attendance[pid] = value
    }
  }

  // A player fills at most one slot, never while marked out; first one wins.
  const slots: Record<string, string> = {}
  const placed = new Set<string>()
  if (isObj(raw.slots)) {
    for (const [slot, pid] of Object.entries(raw.slots)) {
      if (typeof pid !== 'string' || !playerIds.has(pid) || placed.has(pid)) continue
      if (!slotInLayout(slot, { fLines, dPairs }) || attendance[pid] === 'out') continue
      slots[slot] = pid
      placed.add(pid)
    }
  }

  return {
    id: raw.id,
    date,
    time: cleanTime(raw.time),
    rink: cleanText(raw.rink, LIMITS.rinkLength),
    opponent: cleanText(raw.opponent, LIMITS.opponentLength),
    home: typeof raw.home === 'boolean' ? raw.home : null,
    fLines,
    dPairs,
    attendance,
    slots,
  }
}

export function sanitizeBoard(raw: unknown): Board | null {
  if (!isObj(raw) || !Array.isArray(raw.players) || !Array.isArray(raw.games)) return null

  const players: Player[] = []
  const ids = new Set<string>()
  for (const p of raw.players) {
    if (players.length >= LIMITS.players) break
    const clean = sanitizePlayer(p)
    if (!clean || ids.has(clean.id)) continue
    ids.add(clean.id)
    players.push(clean)
  }

  const games: Game[] = []
  const gameIds = new Set<string>()
  for (const g of raw.games) {
    if (games.length >= LIMITS.games) break
    const clean = sanitizeGame(g, ids)
    if (!clean || gameIds.has(clean.id)) continue
    gameIds.add(clean.id)
    games.push(clean)
  }
  games.sort(compareGames)

  const schedule = cleanText(raw.schedule, 40)
  return schedule ? { v: 1, players, games, schedule } : { v: 1, players, games }
}
