/**
 * WHS-style Handicap Index calculation.
 *
 * Goal: produce a *suggested* handicap from a player's logged rounds that lines up
 * with what apps like The Grint show, so players can sanity-check their league
 * handicap. This is the official World Handicap System math, with two documented
 * simplifications (see NOTES):
 *
 *   Score Differential = (113 / Slope) × (AdjustedGross − CourseRating − PCC)
 *   Handicap Index     = average of the lowest N of the most recent 20 differentials,
 *                        plus an adjustment, truncated to one decimal.
 *
 * NOTES / simplifications vs. full WHS:
 *  - PCC (Playing Conditions Calculation) is treated as 0 — we have no field history.
 *  - Adjusted Gross Score uses the raw gross. True WHS caps each hole at net double
 *    bogey (ESC), which needs per-hole data we don't have for manually-entered rounds.
 *    The Phase 2 live tracker captures hole-by-hole scores and can apply the cap.
 *  - 9-hole rounds are scaled to an 18-hole-equivalent differential (×2). This is an
 *    approximation; WHS combines two 9s or uses an expected score.
 */

/** Standard 18-hole bogey-rating constant. */
export const STANDARD_SLOPE = 113

/** Max number of most-recent rounds considered. */
export const SCORING_RECORD_SIZE = 20

/** Minimum rounds required before an index can be suggested. */
export const MIN_ROUNDS_FOR_INDEX = 3

/** Hard cap on a handicap index (WHS max). */
export const MAX_HANDICAP_INDEX = 54.0

/**
 * Official WHS table: given how many differentials are available (capped at 20),
 * how many of the *lowest* to average, and what adjustment to add.
 * Indexed by count of differentials.
 */
const WHS_TABLE: Record<number, { use: number; adjustment: number }> = {
  3:  { use: 1, adjustment: -2.0 },
  4:  { use: 1, adjustment: -1.0 },
  5:  { use: 1, adjustment:  0.0 },
  6:  { use: 2, adjustment: -1.0 },
  7:  { use: 2, adjustment:  0.0 },
  8:  { use: 2, adjustment:  0.0 },
  9:  { use: 3, adjustment:  0.0 },
  10: { use: 3, adjustment:  0.0 },
  11: { use: 3, adjustment:  0.0 },
  12: { use: 4, adjustment:  0.0 },
  13: { use: 4, adjustment:  0.0 },
  14: { use: 4, adjustment:  0.0 },
  15: { use: 5, adjustment:  0.0 },
  16: { use: 5, adjustment:  0.0 },
  17: { use: 6, adjustment:  0.0 },
  18: { use: 6, adjustment:  0.0 },
  19: { use: 7, adjustment:  0.0 },
  20: { use: 8, adjustment:  0.0 },
}

/**
 * Score Differential for a single round, normalized to 18 holes.
 * Returns null if the inputs can't produce a meaningful differential.
 */
export function scoreDifferential({
  gross,
  courseRating,
  slopeRating,
  holes,
}: {
  gross: number
  courseRating: number
  slopeRating: number
  holes: 9 | 18
}): number | null {
  if (
    !Number.isFinite(gross) ||
    !Number.isFinite(courseRating) ||
    !Number.isFinite(slopeRating) ||
    slopeRating <= 0
  ) {
    return null
  }

  const raw = (STANDARD_SLOPE / slopeRating) * (gross - courseRating)
  // Scale a 9-hole differential to an 18-hole equivalent.
  const diff = holes === 9 ? raw * 2 : raw
  return Math.round(diff * 10) / 10
}

/** Truncate (not round) to one decimal, as WHS specifies. */
function truncate1(n: number): number {
  return Math.trunc(n * 10) / 10
}

/**
 * Compute a WHS handicap index from a list of score differentials.
 * Differentials may be passed most-recent-first or any order — only the most
 * recent `SCORING_RECORD_SIZE` matter, so pass them most-recent-first.
 *
 * Returns null if there aren't enough rounds yet.
 */
export function computeHandicapIndex(
  differentials: number[],
  mostRecentFirst = true,
): {
  index: number
  roundsUsed: number
  differentialsConsidered: number
} | null {
  const clean = differentials.filter((d) => Number.isFinite(d))
  if (clean.length < MIN_ROUNDS_FOR_INDEX) return null

  // Take the most recent 20.
  const recent = (mostRecentFirst ? clean : [...clean].reverse()).slice(0, SCORING_RECORD_SIZE)
  const count = recent.length

  const rule = WHS_TABLE[count] ?? WHS_TABLE[SCORING_RECORD_SIZE]
  const lowest = [...recent].sort((a, b) => a - b).slice(0, rule.use)
  const avg = lowest.reduce((s, v) => s + v, 0) / lowest.length

  let index = truncate1(avg + rule.adjustment)
  index = Math.min(index, MAX_HANDICAP_INDEX)

  return {
    index,
    roundsUsed: rule.use,
    differentialsConsidered: count,
  }
}
