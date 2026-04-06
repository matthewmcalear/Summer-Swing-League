export const DIFFICULTY_MULTIPLIERS: Record<string, number> = {
  easy:    0.95,
  average: 1.00,
  tough:   1.05,
}

export const SEASON_START = '2026-04-15'
export const SEASON_END   = '2026-10-10'

/**
 * Calculate total points for a round.
 *
 * Formula (same as 2025):
 *   9  holes: base = 75  - (gross - handicap / 2)
 *   18 holes: base = (150 - (gross - handicap)) / 2
 *
 * adjusted = base × difficultyMultiplier
 * groupBonus = number of OTHER league members in the group (not counting self)
 * total = adjusted + groupBonus + additionalPoints
 */
export function calculatePoints({
  holes,
  gross,
  handicap,
  difficulty,
  otherLeagueMembersCount,
  additionalPoints = 0,
}: {
  holes: 9 | 18
  gross: number
  handicap: number
  difficulty: string
  otherLeagueMembersCount: number
  additionalPoints?: number
}): {
  basePoints: number
  difficultyMultiplier: number
  groupBonus: number
  totalPoints: number
} {
  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[difficulty] ?? 1.0

  let basePoints: number
  if (holes === 9) {
    basePoints = 75 - (gross - handicap / 2)
  } else {
    basePoints = (150 - (gross - handicap)) / 2
  }

  const adjusted   = basePoints * difficultyMultiplier
  const groupBonus = Math.max(otherLeagueMembersCount, 0)
  const totalPoints = adjusted + groupBonus + additionalPoints

  return {
    basePoints: Math.round(basePoints * 100) / 100,
    difficultyMultiplier,
    groupBonus,
    totalPoints: Math.round(totalPoints * 100) / 100,
  }
}

/**
 * Season standings algorithm:
 * - Take each player's top 5 scores by total_points
 * - Sum them for totalPoints
 * - Apply a participation multiplier if fewer than 5 rounds:
 *     1 round → ×0.2 | 2 → ×0.4 | 3 → ×0.6 | 4 → ×0.8 | 5+ → ×1.0
 * - Add improvement bonus: (startingHandicap − currentHandicap) × 3
 *   (minimum 0 — no penalty for getting worse)
 * - seasonScore = (totalPoints × multiplier) + improvementBonus
 */
export const IMPROVEMENT_BONUS_PER_STROKE = 3

export function computeSeasonScore(
  scores: number[],
  startingHandicap?: number | null,
  currentHandicap?: number,
): {
  seasonScore:      number
  totalPoints:      number
  topScores:        number[]
  improvementBonus: number
  handicapImprovement: number
} {
  const sorted      = [...scores].sort((a, b) => b - a)
  const best5       = sorted.slice(0, 5)
  const totalPoints = best5.reduce((s, v) => s + v, 0)

  const multipliers: Record<number, number> = { 1: 0.2, 2: 0.4, 3: 0.6, 4: 0.8 }
  const multiplier  = best5.length < 5 ? (multipliers[best5.length] ?? 0) : 1.0

  const baseScore   = totalPoints * multiplier

  // Improvement bonus — only applies once starting_handicap is set (after first round)
  const improvement =
    startingHandicap != null && currentHandicap != null
      ? Math.max(0, startingHandicap - currentHandicap)
      : 0

  const improvementBonus = Math.round(improvement * IMPROVEMENT_BONUS_PER_STROKE * 100) / 100

  return {
    seasonScore:         Math.round((baseScore + improvementBonus) * 100) / 100,
    totalPoints:         Math.round(totalPoints * 100) / 100,
    topScores:           best5,
    improvementBonus,
    handicapImprovement: Math.round(improvement * 10) / 10,
  }
}
