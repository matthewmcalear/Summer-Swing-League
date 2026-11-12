// Shared by the server (market creation) and the admin form (odds preview).

export type MarketKindName = 'WINNER' | 'TOP_N' | 'H2H' | 'CUSTOM' | 'COPPER'

// Liquidity sets how much the house can lose on a market: at most
// b × ln(1 / the lowest opening chance). The family bets $5–$20 at a time,
// so these are small: prices move visibly on a $10 bet and the house's worst
// case per side market is tens of dollars, not hundreds.
export const DEFAULT_LIQUIDITY: Record<MarketKindName, number> = {
  WINNER: 100,
  TOP_N: 15,
  H2H: 15,
  CUSTOM: 15,
  COPPER: 25,
}

/** Liquidity for the self-settling specials (who loses round N, first out…). */
export const AUTO_LIQUIDITY = 12

/** Opening chances for side markets are kept inside this band, which caps the house's worst case. */
export const OPENING_BAND: [number, number] = [0.1, 0.9]

/**
 * Makes a set of "will X finish top N?" chances add up: exactly N people
 * finish in the top N, so the Yes chances across the field should sum to N.
 * Scales everyone's odds by one factor (keeping the order), then clamps to
 * the opening band.
 */
export function coherentTopN(yes: number[], n: number, band: [number, number] = OPENING_BAND): number[] {
  const clamp = (p: number) => Math.min(band[1], Math.max(band[0], p))
  if (!yes.length || n >= yes.length) return yes.map(clamp)
  const odds = yes.map((p) => Math.min(0.999, Math.max(0.001, p)) / (1 - Math.min(0.999, Math.max(0.001, p))))
  const at = (k: number) => odds.map((o) => clamp((k * o) / (1 + k * o)))
  let lo = 1e-4
  let hi = 1e4
  for (let i = 0; i < 80; i++) {
    const mid = Math.sqrt(lo * hi)
    if (at(mid).reduce((s, p) => s + p, 0) > n) hi = mid
    else lo = mid
  }
  return at(Math.sqrt(lo * hi))
}

/** Lowest opening chance allowed (0.5%), so no outcome opens at an absurd payout. */
export const MIN_OPENING = 0.005

/** Scales raw weights (e.g. typed percentages) to probabilities summing to 1. */
export function normaliseOdds(weights: number[]): number[] | null {
  if (!weights.length || weights.some((w) => !Number.isFinite(w) || w <= 0)) return null
  const total = weights.reduce((s, w) => s + w, 0)
  const p = weights.map((w) => w / total)
  return p.every((x) => x >= MIN_OPENING) ? p : null
}
