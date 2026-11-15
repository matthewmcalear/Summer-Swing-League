// Shared by the server (executeTrade) and the bet box, so the quote matches.

/** What a bet buys shares with once the house's cut is taken off, in dollars. */
export function stakeAfterCut(spendCents: number, houseCutPct: number): number {
  const cut = Math.min(50, Math.max(0, houseCutPct || 0))
  return (spendCents - Math.round((spendCents * cut) / 100)) / 100
}
