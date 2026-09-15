import { randomBytes, timingSafeEqual } from 'crypto'
import { prisma } from './prisma'
import { isAdmin } from './auth'
import { OPEN_EVENT_ID } from './open-types'
import type { OpenEvent, OpenSeasonMember, OpenState } from './open-types'
import { isScoringCode } from './open-validation'

/** Rows exactly as Prisma returns them for the single Open event. */
export type StoredOpenEvent = NonNullable<Awaited<ReturnType<typeof loadStoredEvent>>>

export function loadStoredEvent() {
  return prisma.sslOpenEvent.findUnique({
    where: { id: OPEN_EVENT_ID },
    include: {
      groups: {
        orderBy: { sort_order: 'asc' },
        include: { players: { orderBy: { sort_order: 'asc' } } },
      },
    },
  })
}

/** 32 random bytes as base64url → 43 characters, the shape isScoringCode() accepts. */
export function newScoringCode(): string {
  return randomBytes(32).toString('base64url')
}

/** Constant-time comparison of a submitted scoring code against a group's code. */
export function scoringCodeMatches(candidate: unknown, actual: string): boolean {
  if (!isScoringCode(candidate) || candidate.length !== actual.length) return false
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(actual))
}

/** Convert the stored event to the shape the board and projections use. Codes only leave the server for admins. */
export function serializeEvent(event: StoredOpenEvent, includeCodes: boolean): OpenEvent {
  return {
    id: event.id,
    courseId: event.course_id,
    courseName: event.course_name,
    teeName: event.tee_name,
    playDate: event.play_date.toISOString().slice(0, 10),
    courseRating: event.course_rating,
    slopeRating: event.slope_rating,
    coursePar: event.course_par,
    holePars: event.hole_pars,
    difficulty: event.difficulty,
    finalizedAt: event.finalized_at ? event.finalized_at.toISOString() : null,
    updatedAt: event.updated_at.toISOString(),
    groups: event.groups.map((group) => ({
      id: group.id,
      name: group.name,
      teeTime: group.tee_time,
      ...(includeCodes ? { scoringCode: group.scoring_code } : {}),
      players: group.players.map((player) => ({
        id: player.id,
        memberId: player.member_id,
        name: player.player_name,
        handicap: player.handicap,
        mode: player.mode as OpenEvent['groups'][number]['players'][number]['mode'],
        doubleDown: player.double_down,
        scores: player.scores,
        version: player.version,
        scoreId: player.score_id,
        bonusId: player.bonus_id,
      })),
    })),
  }
}

/** Every active member's official season inputs, so the board can project the whole league table. */
export async function loadSeasonMembers(): Promise<OpenSeasonMember[]> {
  const [members, scores, bonuses] = await Promise.all([
    prisma.member.findMany({ where: { is_active: true }, orderBy: { full_name: 'asc' } }),
    prisma.score.findMany({ select: { id: true, member_id: true, total_points: true } }),
    prisma.seasonBonus.findMany({ select: { id: true, member_id: true, points: true } }),
  ])
  const scoresByMember = new Map<string, { id: string; points: number }[]>()
  for (const score of scores) {
    if (!score.member_id) continue
    const list = scoresByMember.get(score.member_id) ?? []
    list.push({ id: score.id, points: Number(score.total_points ?? 0) })
    scoresByMember.set(score.member_id, list)
  }
  const bonusesByMember = new Map<string, { id: string; points: number }[]>()
  for (const bonus of bonuses) {
    const list = bonusesByMember.get(bonus.member_id) ?? []
    list.push({ id: bonus.id, points: bonus.points })
    bonusesByMember.set(bonus.member_id, list)
  }
  return members.map((member) => ({
    id: member.id,
    name: member.full_name,
    startingHandicap: member.starting_handicap ?? null,
    currentHandicap: Number(member.current_handicap),
    scores: scoresByMember.get(member.id) ?? [],
    bonuses: bonusesByMember.get(member.id) ?? [],
  }))
}

/**
 * Everything the live page needs in one payload. A valid group scoring code
 * unlocks score entry for that group only; the admin cookie unlocks everything.
 */
export async function loadOpenState(code: string | null): Promise<OpenState> {
  const admin = isAdmin()
  const [stored, season] = await Promise.all([loadStoredEvent(), loadSeasonMembers()])
  const authorizedGroup = stored && code
    ? stored.groups.find((group) => scoringCodeMatches(code, group.scoring_code))
    : undefined
  return {
    event: stored ? serializeEvent(stored, admin) : null,
    season,
    isAdmin: admin,
    authorizedGroupId: authorizedGroup?.id ?? null,
    fetchedAt: new Date().toISOString(),
  }
}
