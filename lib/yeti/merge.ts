import { slotOf, type Board, type Game } from './model'
import { sanitizeBoard } from './validate'

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
 * The roster — who's on the team, and each player's name, number, skill and
 * position — needs the admin password (see lib/yeti/admin.ts). The server
 * calls this on saves made without it. The roster stays exactly as stored,
 * whatever the page sent, while the rest of the save (attendance, lines, beer,
 * games) goes through:
 *   - a player the save changed keeps his stored details
 *   - a player the save added is dropped, with his attendance, spot and beer
 *   - a player the save removed comes back with his attendance and beer, and
 *     his spot in each game if the save hasn't filled it (otherwise the bench)
 *
 * `kept` counts the players whose change was refused.
 */
export function keepRoster(incoming: Board, stored: Board): { board: Board; kept: number } {
  const sent = new Map(incoming.players.map((p) => [p.id, p]))
  const storedIds = new Set(stored.players.map((p) => p.id))
  let kept = incoming.players.filter((p) => !storedIds.has(p.id)).length
  const removed: string[] = []
  for (const p of stored.players) {
    const s = sent.get(p.id)
    if (!s) {
      removed.push(p.id)
      kept++
    } else if (s.name !== p.name || s.number !== p.number || s.skill !== p.skill || s.pos !== p.pos) {
      kept++
    }
  }
  if (!kept) return { board: incoming, kept }

  const before = new Map(stored.games.map((g) => [g.id, g]))
  const games = removed.length ? incoming.games.map((g) => putBack(g, before.get(g.id), removed)) : incoming.games
  // Cleaning against the stored roster also clears out players the save added.
  const board = sanitizeBoard({ ...incoming, players: stored.players, games }) ?? incoming
  return { board, kept }
}

/** Puts removed players back into a game as the stored board had them, leaving any spot the save has filled since. */
function putBack(game: Game, before: Game | undefined, ids: readonly string[]): Game {
  if (!before) return game // a game the save added
  const attendance = { ...game.attendance }
  const slots = { ...game.slots }
  const beer = game.beer.slice()
  for (const id of ids) {
    if (before.attendance[id]) attendance[id] = before.attendance[id]
    const slot = slotOf(before, id)
    if (slot && !slots[slot]) slots[slot] = id
    if (before.beer.includes(id) && !beer.includes(id)) beer.push(id)
  }
  return { ...game, attendance, slots, beer }
}
