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
  if (version >= 5 && !preSchedule) return incoming

  // Pages from before the Trash level (version 5) read it as Mid, so a Mid
  // from them on a player stored as Trash is that misreading, not a change.
  const storedTrash = new Set(stored.players.filter((p) => p.skill === 'Trash').map((p) => p.id))
  const players =
    version < 5 && storedTrash.size
      ? incoming.players.map((p) => (p.skill === 'Mid' && storedTrash.has(p.id) ? { ...p, skill: 'Trash' as const } : p))
      : incoming.players
  if (version >= 3 && !preSchedule) return players === incoming.players ? incoming : { ...incoming, players }

  const known = new Set(incoming.players.map((p) => p.id))
  const storedGames = new Map(stored.games.map((g) => [g.id, g]))
  return {
    ...incoming,
    players,
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

/**
 * Skill levels need the admin password (see lib/yeti/admin.ts). The server
 * calls this on saves made without it: every player the stored board already
 * has keeps the stored skill, whatever the page sent. A player the stored board
 * doesn't have (a new sub, or someone brought back by undo after a removal)
 * keeps the skill the page sent; the page only offers non-admins Mid for a new
 * player, and undo puts back the skill he had.
 *
 * `kept` counts the skill changes that were refused.
 */
export function keepSkills(incoming: Board, stored: Board): { board: Board; kept: number } {
  const storedSkill = new Map(stored.players.map((p) => [p.id, p.skill]))
  let kept = 0
  const players = incoming.players.map((p) => {
    const skill = storedSkill.get(p.id)
    if (!skill || skill === p.skill) return p
    kept++
    return { ...p, skill }
  })
  return kept ? { board: { ...incoming, players }, kept } : { board: incoming, kept }
}
