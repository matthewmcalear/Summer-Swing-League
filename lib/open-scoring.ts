import { calculatePoints, computeSeasonScore } from './scoring'
import { OPEN_BONUSES } from './open-types'
import type {
  OpenEvent, OpenGroup, OpenPlayer, OpenProjection, OpenSeasonMember, OpenSeasonProjection,
} from './open-types'

const TOTAL_HOLES = 18
const EPSILON = 1e-9

type PlayedHole = { index: number; strokes: number; par: number }

function playedHoles(player: OpenPlayer, event: OpenEvent): PlayedHole[] {
  // Score slots retain their hole index; zero is an unentered hole, never par.
  return player.scores.slice(0, TOTAL_HOLES).flatMap((strokes, index) =>
    Number.isInteger(strokes) && strokes >= 1 && strokes <= 20
      ? [{ index, strokes, par: event.holePars[index] }]
      : [],
  )
}

function doubleDownStatus(
  player: OpenPlayer,
  played: PlayedHole[],
  event: OpenEvent,
): OpenProjection['doubleDownStatus'] {
  if (!player.doubleDown) return 'off'
  const front = played.filter((hole) => hole.index < 9)
  const back = played.filter((hole) => hole.index >= 9)
  if (front.length < 9 || back.length === 0) return 'pending'

  const frontNet = front.reduce((sum, hole) => sum + hole.strokes, 0) - player.handicap / 2
  const backGross = back.reduce((sum, hole) => sum + hole.strokes, 0)
  const backOverPar = back.reduce((sum, hole) => sum + hole.strokes - hole.par, 0)
  const backPar = event.holePars.slice(9, TOTAL_HOLES).reduce((sum, par) => sum + par, 0)
  const projectedBackGross = back.length === 9 ? backGross : backPar + backOverPar * 9 / back.length
  const improves = projectedBackGross - player.handicap / 2 < frontNet - EPSILON

  if (back.length === 9) return improves ? 'won' : 'lost'
  return improves ? 'projected-win' : 'projected-loss'
}

/**
 * The other league members a player gets SSL group points for. While play is
 * live every assigned partner counts; once results are posted a no-show who
 * never recorded a hole was not in the group.
 */
export function groupPartners(group: OpenGroup, player: OpenPlayer, event: OpenEvent): OpenPlayer[] {
  return group.players.filter((other) => other.memberId !== player.memberId &&
    (!event.finalizedAt || playedHoles(other, event).length > 0))
}

function setBonus(projection: OpenProjection, occupiedPlaces: number): void {
  if (projection.rank === null) return

  // A tie can occupy several prize slots. Until a commissioner resolves it,
  // show the possible awards for this player's mode without choosing a winner.
  const schedules = projection.player.mode
    ? [OPEN_BONUSES[projection.player.mode]]
    : Object.values(OPEN_BONUSES)
  const candidates = schedules.flatMap((schedule) =>
    Array.from({ length: occupiedPlaces }, (_, offset) => schedule[projection.rank! - 1 + offset] ?? 0),
  )
  let minimum = Math.min(...candidates)
  let maximum = Math.max(...candidates)

  switch (projection.doubleDownStatus) {
    case 'pending':
      minimum = 0
      maximum *= 2
      break
    case 'won':
    case 'projected-win':
      minimum *= 2
      maximum *= 2
      break
    case 'lost':
    case 'projected-loss':
      minimum = 0
      maximum = 0
      break
  }

  projection.bonusMin = minimum
  projection.bonusMax = maximum
  projection.finishBonus = minimum === maximum ? minimum : null
}

/**
 * Compare the whole Open field on projected 18-hole net score. The pace model
 * extends over/under-par performance, so different hole pars and tee times do
 * not favor the group that has played fewer holes. It is an estimate, not a
 * change to the official SSL formula. Completed cards use their actual gross.
 * Event setup supplies the validated 18-hole par card and fixed handicaps.
 * Once results are posted, only complete cards are ranked: an abandoned round
 * has no official net score, so it cannot hold a podium place.
 */
export function projectOpen(event: OpenEvent): OpenProjection[] {
  const projections = event.groups.flatMap((group) => group.players.map((player): OpenProjection => {
    const played = playedHoles(player, event)
    const gross = played.reduce((sum, hole) => sum + hole.strokes, 0)
    const toPar = played.reduce((sum, hole) => sum + hole.strokes - hole.par, 0)
    const complete = played.length === TOTAL_HOLES
    const projectedGross = played.length === 0 || (event.finalizedAt && !complete)
      ? null
      : complete ? gross : event.coursePar + toPar * TOTAL_HOLES / played.length
    const otherMembers = new Set(groupPartners(group, player, event).map((other) => other.memberId))

    return {
      player,
      groupId: group.id,
      groupName: group.name,
      holesPlayed: played.length,
      gross,
      toPar,
      projectedGross,
      projectedNet: projectedGross === null ? null : projectedGross - player.handicap,
      roundPoints: projectedGross === null ? null : calculatePoints({
        holes: 18,
        gross: projectedGross,
        handicap: player.handicap,
        difficulty: event.difficulty,
        otherLeagueMembersCount: otherMembers.size,
      }).totalPoints,
      rank: null,
      tied: false,
      finishBonus: 0,
      bonusMin: 0,
      bonusMax: 0,
      doubleDownStatus: doubleDownStatus(player, played, event),
    }
  }))

  projections.sort((a, b) => {
    if (a.projectedNet === null) return b.projectedNet === null ? 0 : 1
    if (b.projectedNet === null) return -1
    return a.projectedNet - b.projectedNet
  })

  for (let start = 0; start < projections.length;) {
    const first = projections[start]
    if (first.projectedNet === null) break
    let end = start + 1
    while (end < projections.length && projections[end].projectedNet !== null &&
      Math.abs(projections[end].projectedNet! - first.projectedNet) < EPSILON) end += 1
    for (let index = start; index < end; index += 1) {
      projections[index].rank = start + 1
      projections[index].tied = end - start > 1
      setBonus(projections[index], end - start)
    }
    start = end
  }

  return projections
}

type SeasonResult = ReturnType<typeof computeSeasonScore> & { rounds: number }

function seasonResult(member: OpenSeasonMember, points: number[], bonus: number): SeasonResult {
  return {
    ...computeSeasonScore(points, member.startingHandicap, member.currentHandicap, bonus),
    rounds: points.length,
  }
}

// Keep the same tie order as getStandings: season total, all rounds, best round.
function compareSeason(a: SeasonResult, b: SeasonResult): number {
  return b.seasonScore - a.seasonScore || b.rounds - a.rounds ||
    (b.topScores[0] ?? 0) - (a.topScores[0] ?? 0)
}

/**
 * Recompute the complete league table with the Open's projected round and
 * direct season bonus. Linked official rows are replaced, preventing a posted
 * Open round/award from counting twice. Existing member handicap is held fixed.
 * Unresolved payouts use the low end of the range and are flagged for the UI.
 * After results are posted, an unresolved tie adds nothing: the commissioner
 * awards that bonus by hand and the official row then counts on its own.
 */
export function projectOpenSeason(
  event: OpenEvent,
  season: OpenSeasonMember[],
  projections: OpenProjection[] = projectOpen(event),
): OpenSeasonProjection[] {
  const byMember = new Map(projections.map((projection) => [projection.player.memberId, projection]))
  const entries = season.map((member) => {
    const current = seasonResult(member, member.scores.map((score) => score.points),
      member.bonuses.reduce((sum, bonus) => sum + bonus.points, 0))
    const projection = byMember.get(member.id)
    if (!projection || projection.roundPoints === null) {
      return { member, current, projected: current, bonusPending: false }
    }

    const points = member.scores
      .filter((score) => score.id !== projection.player.scoreId)
      .map((score) => score.points)
    points.push(projection.roundPoints)
    const otherBonuses = member.bonuses
      .filter((bonus) => bonus.id !== projection.player.bonusId)
      .reduce((sum, bonus) => sum + bonus.points, 0)
    const pendingBonus = event.finalizedAt ? 0 : projection.bonusMin
    const projected = seasonResult(member, points,
      otherBonuses + (projection.finishBonus ?? pendingBonus))
    return { member, current, projected, bonusPending: projection.finishBonus === null }
  })

  const currentOrder = [...entries].sort((a, b) => compareSeason(a.current, b.current))
  const currentRanks = new Map(currentOrder.map((entry, index) => [entry.member.id, index + 1]))
  return entries.sort((a, b) => compareSeason(a.projected, b.projected)).map((entry, index) => ({
    id: entry.member.id,
    name: entry.member.name,
    currentScore: entry.current.seasonScore,
    projectedScore: entry.projected.seasonScore,
    delta: Math.round((entry.projected.seasonScore - entry.current.seasonScore) * 100) / 100,
    rank: index + 1,
    currentRank: currentRanks.get(entry.member.id)!,
    bonusPending: entry.bonusPending,
  }))
}
