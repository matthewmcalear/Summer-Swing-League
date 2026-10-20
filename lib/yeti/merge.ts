import type { Board } from './model'

/**
 * A phone can keep running an older page for hours after a deploy. That page
 * drops any board field it doesn't know about, so when it saves, those fields
 * would be wiped. The server calls this on such saves to carry the fields over
 * from the stored board the save was based on, so the old page only ever
 * changes what it actually knows about.
 *
 * `appVersion` is what the page sent (undefined before version 3).
 */
export function carryOverForOldPage(incoming: Board, stored: Board, appVersion: number | undefined): Board {
  const version = appVersion ?? 2
  // Pages from before the schedule (version 1) don't send the schedule marker.
  const preSchedule = !incoming.schedule
  if (version >= 3 && !preSchedule) return incoming

  const known = new Set(incoming.players.map((p) => p.id))
  const storedGames = new Map(stored.games.map((g) => [g.id, g]))
  return {
    ...incoming,
    ...(preSchedule && stored.schedule ? { schedule: stored.schedule } : {}),
    games: incoming.games.map((g) => {
      const s = storedGames.get(g.id)
      if (!s) return g // a game the old page added
      return {
        ...g,
        ...(version < 3 ? { beer: s.beer.filter((id) => known.has(id)) } : {}),
        ...(preSchedule ? { time: s.time, rink: s.rink, home: s.home } : {}),
      }
    }),
  }
}
