import { cacheLife, cacheTag, revalidateTag } from 'next/cache'

/**
 * Everything derived from league data — members, rounds, bonuses, courses, bags —
 * shares one cache tag. Writes are rare (a few rounds a day), so expiring every
 * league page on any write is cheap and impossible to get subtly wrong.
 */
export const LEAGUE_TAG = 'league'

/** Call first thing inside a `'use cache'` scope that reads league data. */
export function leagueCache() {
  cacheLife('league')
  cacheTag(LEAGUE_TAG)
}

/**
 * Expire league data immediately after a successful write, so the next request
 * (e.g. the player checking standings after submitting) renders fresh data.
 * Route handlers can't use updateTag, so this uses `{ expire: 0 }`.
 */
export function invalidateLeague() {
  revalidateTag(LEAGUE_TAG, { expire: 0 })
}
