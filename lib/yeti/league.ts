import type { Game } from './model'

/**
 * Links to the league's own site, westmounthockey.com. It already keeps the
 * record, stats, scores and each player's games played (with how many he still
 * needs for the playoffs), so the app links there rather than repeat it.
 */

const SITE = 'https://westmounthockey.com'

/** Team ids in the league site's addresses. */
const TEAM_IDS: Record<string, string> = {
  yeti: '687468',
  hawks: '687467',
  kings: '687464',
  coyotes: '687466',
  lightning: '687471',
  devils: '687465',
}

/**
 * Games whose page on the league site doesn't follow the pattern. Dec 8 (game
 * 56, Yeti @ Coyotes 22:20) is filed there under Lightning's id; the page itself
 * says Yeti. Keyed by date and opponent.
 */
const ADDRESS_EXCEPTIONS: Record<string, string> = {
  '2026-12-08 coyotes': '2026-12-08-687471-687466',
}

/** The Yeti's team page: record, roster stats, games played and still needed. */
export const LEAGUE_SITE = { url: `${SITE}/teams/${TEAM_IDS.yeti}`, label: 'westmounthockey.com' } as const

/**
 * The league site's page for this game (preview before, score and scorers
 * after): /games/<date>-<away id>-<home id>. Null when the opponent isn't one
 * of the league's teams or home/away isn't known.
 */
export function leagueGameUrl(game: Pick<Game, 'date' | 'opponent' | 'home'>): string | null {
  if (game.home === null) return null
  const opponent = TEAM_IDS[game.opponent.trim().toLowerCase()]
  if (!opponent || opponent === TEAM_IDS.yeti) return null
  const exception = ADDRESS_EXCEPTIONS[`${game.date} ${game.opponent.trim().toLowerCase()}`]
  if (exception) return `${SITE}/games/${exception}`
  const [away, home] = game.home ? [opponent, TEAM_IDS.yeti] : [TEAM_IDS.yeti, opponent]
  return `${SITE}/games/${game.date}-${away}-${home}`
}
