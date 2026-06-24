import { prisma } from './prisma'
import { computeHandicapIndex } from './handicap'

export type HandicapSuggestion = {
  index: number
  differentialsConsidered: number
}

/**
 * Compute a WHS-style suggested handicap index for every member who has enough
 * rounds logged against a rated course. Returns a map keyed by member id.
 *
 * Only scores with a stored `score_differential` (i.e. submitted against a
 * library course with rating + slope) count toward the suggestion.
 */
export async function getHandicapSuggestions(): Promise<Record<string, HandicapSuggestion>> {
  const scores = await prisma.score.findMany({
    where:   { score_differential: { not: null }, member_id: { not: null } },
    orderBy: { play_date: 'desc' }, // most recent first — computeHandicapIndex expects this
    select:  { member_id: true, score_differential: true },
  })

  const byMember: Record<string, number[]> = {}
  for (const s of scores) {
    if (!s.member_id || s.score_differential == null) continue
    ;(byMember[s.member_id] ??= []).push(s.score_differential)
  }

  const out: Record<string, HandicapSuggestion> = {}
  for (const [memberId, diffs] of Object.entries(byMember)) {
    const result = computeHandicapIndex(diffs, true)
    if (result) {
      out[memberId] = {
        index: result.index,
        differentialsConsidered: result.differentialsConsidered,
      }
    }
  }
  return out
}
