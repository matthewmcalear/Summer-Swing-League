import { OPEN_BONUSES, type OpenMode } from './open-types'

export class OpenError extends Error {
  constructor(message: string, public status = 400) { super(message); this.name = 'OpenError' }
}

export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const owns = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key)
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new OpenError('Expected a JSON object.')
  return value as Record<string, unknown>
}
function knownKeys(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some(key => !keys.includes(key))) throw new OpenError('Unexpected fields in request.')
}
const isMode = (value: unknown): value is OpenMode => typeof value === 'string' && owns(OPEN_BONUSES, value)

export type OpenPlayerUpdate = { version: number } & (
  | { kind: 'hole'; hole: number; strokes: number | null }
  | { kind: 'mode'; mode: OpenMode }
  | { kind: 'doubleDown'; doubleDown: boolean }
  | { kind: 'group'; groupId: string }
)

/** One change per request: a hole score, the first-tee mode, the Double Down call, or a move to another group. */
export function parseOpenUpdate(value: unknown): OpenPlayerUpdate {
  const body = record(value)
  knownKeys(body, ['version', 'hole', 'strokes', 'mode', 'doubleDown', 'groupId'])
  if (!Number.isSafeInteger(body.version) || (body.version as number) < 0) throw new OpenError('A valid scorecard version is required.')
  const base = { version: body.version as number }
  const holeUpdate = owns(body, 'hole') || owns(body, 'strokes')
  const actions = Number(holeUpdate) + Number(owns(body, 'mode')) + Number(owns(body, 'doubleDown')) + Number(owns(body, 'groupId'))
  if (actions !== 1) throw new OpenError('Update one hole, mode, Double Down declaration, or group at a time.')
  if (holeUpdate) {
    if (!Number.isInteger(body.hole) || (body.hole as number) < 1 || (body.hole as number) > 18) throw new OpenError('Hole must be a whole number from 1 to 18.')
    if (body.strokes !== null && (!Number.isInteger(body.strokes) || (body.strokes as number) < 1 || (body.strokes as number) > 20)) throw new OpenError('Strokes must be 1–20, or null to clear the hole.')
    return { ...base, kind: 'hole', hole: body.hole as number, strokes: body.strokes as number | null }
  }
  if (owns(body, 'mode')) {
    if (!isMode(body.mode)) throw new OpenError('Choose Normal, Hard, or God mode.')
    return { ...base, kind: 'mode', mode: body.mode }
  }
  if (owns(body, 'groupId')) {
    if (!isUuid(body.groupId)) throw new OpenError('Choose a valid group.')
    return { ...base, kind: 'group', groupId: body.groupId.toLowerCase() }
  }
  if (typeof body.doubleDown !== 'boolean') throw new OpenError('Double Down must be true or false.')
  return { ...base, kind: 'doubleDown', doubleDown: body.doubleDown }
}

export type OpenJoinInput = { memberId: string; groupId: string }

/** A league member adding themselves to the Open on the day. */
export function parseOpenJoin(value: unknown): OpenJoinInput {
  const body = record(value)
  knownKeys(body, ['memberId', 'groupId'])
  if (!isUuid(body.memberId)) throw new OpenError('Choose a league member.')
  if (!isUuid(body.groupId)) throw new OpenError('Choose a group.')
  return { memberId: body.memberId.toLowerCase(), groupId: body.groupId.toLowerCase() }
}

export type MutableOpenPlayer = {
  scores: number[]; mode: string | null; double_down: boolean; version: number
  started_at: Date | null; back_started_at: Date | null
}

/**
 * Apply a hole, mode, or Double Down change to the saved card. Persistent
 * locks survive hole corrections. Group moves are resolved by the API route
 * because they depend on the other groups.
 */
export function applyOpenUpdate(player: MutableOpenPlayer, update: Exclude<OpenPlayerUpdate, { kind: 'group' }>, now = new Date()) {
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
