// What the house stands to win or lose on one market, from the bets actually
// placed (not the theoretical ceiling). Pure: the admin Exposure tab feeds it
// the money taken in and the shares people hold on each outcome.
//
// Every share pays $1 if its outcome wins, so if outcome i wins the house
// keeps what it took in minus the shares held on i.

export interface ExposureOutcome {
  label: string
  /** Shares players hold on this outcome right now. */
  shares: number
  /** Current chance (or the payout per share once the result is in). */
  price: number
  /** Can no longer win. */
  dead: boolean
}

export interface Exposure {
  /** Net cents bet into the market: buys minus sells. */
  takenCents: number
  /** House result in cents for each outcome that can still win, worst first. */
  ifWins: { label: string; cents: number; price: number }[]
  worstCents: number
  worstLabel: string | null
  bestCents: number
  /** House result if things go the way the current odds say. */
  expectedCents: number
}

export function marketExposure(takenCents: number, outcomes: ExposureOutcome[], resolved: boolean): Exposure {
  const expectedCents = Math.round(takenCents - outcomes.reduce((s, o) => s + o.shares * o.price * 100, 0))
  // Result is in: the payout is fixed, so every case is the same number.
  if (resolved) return { takenCents, ifWins: [], worstCents: expectedCents, worstLabel: null, bestCents: expectedCents, expectedCents }
  const ifWins = outcomes
    .filter((o) => !o.dead)
    .map((o) => ({ label: o.label, cents: Math.round(takenCents - o.shares * 100), price: o.price }))
    .sort((a, b) => a.cents - b.cents)
  if (!ifWins.length) return { takenCents, ifWins, worstCents: takenCents, worstLabel: null, bestCents: takenCents, expectedCents }
  return {
    takenCents,
    ifWins,
    worstCents: ifWins[0].cents,
    worstLabel: ifWins[0].label,
    bestCents: ifWins[ifWins.length - 1].cents,
    expectedCents,
  }
}
