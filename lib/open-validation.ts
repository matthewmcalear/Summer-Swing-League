import { OPEN_BONUSES, type OpenMode } from './open-types'
import { DIFFICULTY_MULTIPLIERS } from './scoring'

export class OpenError extends Error {
  constructor(message: string, public status = 400) { super(message); this.name = 'OpenError' }
}

export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export const isScoringCode = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
const owns = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key)
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new OpenError('Expected a JSON object.')
  return value as Record<string, unknown>
}
function knownKeys(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some(key => !keys.includes(key))) throw new OpenError('Unexpected fields in request.')
}
const isMode = (value: unknown): value is OpenMode => typeof value === 'string' && owns(OPEN_BONUSES, value)

export type OpenSetupInput = {
  courseId: string; holePars: number[]; difficulty: string
  groups: { name: string; teeTime: string; memberIds: string[] }[]
}

export function parseOpenSetup(value: unknown): OpenSetupInput {
  const body = record(value)
  knownKeys(body, ['courseId', 'holePars', 'difficulty', 'groups'])
  if (!isUuid(body.courseId)) throw new OpenError('Choose a valid course.')
  if (!Array.isArray(body.holePars) || body.holePars.length !== 18 || body.holePars.some(par => !Number.isInteger(par) || par < 3 || par > 6)) {
    throw new OpenError('Enter 18 hole pars, each a whole number from 3 to 6.')
  }
  if (typeof body.difficulty !== 'string' || !owns(DIFFICULTY_MULTIPLIERS, body.difficulty)) throw new OpenError('Choose easy, average, or tough course difficulty.')
  if (!Array.isArray(body.groups) || body.groups.length !== 3) throw new OpenError('Set up exactly three groups.')
  const seenMembers = new Set<string>()
  const seenNames = new Set<string>()
  const groups = body.groups.map(value => {
    const group = record(value)
    knownKeys(group, ['name', 'teeTime', 'memberIds'])
    if (typeof group.name !== 'string' || !group.name.trim() || group.name.trim().length > 60) throw new OpenError('Each group needs a name of 1–60 characters.')
    const name = group.name.trim()
    if (seenNames.has(name.toLowerCase())) throw new OpenError('Give each group a different name.')
    seenNames.add(name.toLowerCase())
    if (typeof group.teeTime !== 'string' || (group.teeTime !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(group.teeTime))) throw new OpenError('Tee times must use HH:MM, or be left blank.')
    if (!Array.isArray(group.memberIds) || group.memberIds.length < 1 || group.memberIds.length > 4 || group.memberIds.some(id => !isUuid(id))) throw new OpenError('Each group needs 1–4 valid league members.')
    const memberIds = group.memberIds.map(id => (id as string).toLowerCase())
    for (const id of memberIds) {
      if (seenMembers.has(id)) throw new OpenError('Each player can appear in only one group.')
      seenMembers.add(id)
    }
    return { name, teeTime: group.teeTime, memberIds }
  })
  return { courseId: body.courseId.toLowerCase(), holePars: body.holePars as number[], difficulty: body.difficulty, groups }
}

export type OpenPlayerUpdate = { version: number; scoringCode?: string } & (
  | { kind: 'hole'; hole: number; strokes: number | null }
  | { kind: 'mode'; mode: OpenMode }
  | { kind: 'doubleDown'; doubleDown: boolean }
)

export function parseOpenUpdate(value: unknown): OpenPlayerUpdate {
  const body = record(value)
  knownKeys(body, ['version', 'scoringCode', 'hole', 'strokes', 'mode', 'doubleDown'])
  if (!Number.isSafeInteger(body.version) || (body.version as number) < 0) throw new OpenError('A valid scorecard version is required.')
  if (owns(body, 'scoringCode') && !isScoringCode(body.scoringCode)) throw new OpenError('Invalid scoring code.', 403)
  const base = { version: body.version as number, ...(typeof body.scoringCode === 'string' ? { scoringCode: body.scoringCode } : {}) }
  const holeUpdate = owns(body, 'hole') || owns(body, 'strokes')
  if (Number(holeUpdate) + Number(owns(body, 'mode')) + Number(owns(body, 'doubleDown')) !== 1) throw new OpenError('Update one hole, mode, or Double Down declaration at a time.')
  if (holeUpdate) {
    if (!Number.isInteger(body.hole) || (body.hole as number) < 1 || (body.hole as number) > 18) throw new OpenError('Hole must be a whole number from 1 to 18.')
    if (body.strokes !== null && (!Number.isInteger(body.strokes) || (body.strokes as number) < 1 || (body.strokes as number) > 20)) throw new OpenError('Strokes must be 1–20, or null to clear the hole.')
    return { ...base, kind: 'hole', hole: body.hole as number, strokes: body.strokes as number | null }
  }
  if (owns(body, 'mode')) {
    if (!isMode(body.mode)) throw new OpenError('Choose Normal, Hard, or God mode.')
    return { ...base, kind: 'mode', mode: body.mode }
  }
  if (typeof body.doubleDown !== 'boolean') throw new OpenError('Double Down must be true or false.')
  return { ...base, kind: 'doubleDown', doubleDown: body.doubleDown }
}

export type MutableOpenPlayer = {
  scores: number[]; mode: string | null; double_down: boolean; version: number
  started_at: Date | null; back_started_at: Date | null
}

/** Apply one action to the saved card. Persistent locks survive hole corrections. */
export function applyOpenUpdate(player: MutableOpenPlayer, update: OpenPlayerUpdate, now = new Date()) {
  if (player.version !== update.version) throw new OpenError('This scorecard changed on another device. Refresh and try again.', 409)
  if (update.kind === 'mode') {
    if ((player.started_at || player.scores.some(Boolean)) && player.mode !== update.mode) throw new OpenError('Mode is locked after play begins.', 409)
    return { mode: update.mode }
  }
  const backStarted = player.back_started_at || player.scores.slice(9).some(Boolean)
  if (update.kind === 'doubleDown') {
    if (backStarted && player.double_down !== update.doubleDown) throw new OpenError('Double Down is locked after the back nine begins.', 409)
    if (update.doubleDown && !player.double_down && (!player.mode || !player.scores.slice(0, 9).every(score => score > 0))) throw new OpenError('Declare Double Down at the turn, after all nine front holes and before playing the back nine.', 409)
    return { double_down: update.doubleDown }
  }
  if (!player.mode) throw new OpenError('Declare a mode before entering scores.', 409)
  if (update.strokes === null && update.hole <= 9 && player.double_down) throw new OpenError('Correct front-nine scores with a number once Double Down is declared.', 409)
  const scores = [...player.scores]
  scores[update.hole - 1] = update.strokes ?? 0
  return {
    scores,
    ...(update.strokes !== null && !player.started_at ? { started_at: now } : {}),
    ...(update.strokes !== null && update.hole > 9 && !player.back_started_at ? { back_started_at: now } : {}),
  }
}
