import { attendanceOf, type Attendance, type Board, type Game, type Player } from './model'

/**
 * The beer rotation: who's bringing beer to each game, how often each player
 * has had a turn this season, and whose turn it is next.
 */

export const BEER = '🍺'

export interface BeerStat {
  player: Player
  /** Bringing beer to this game. */
  bringing: boolean
  attendance: Attendance
  /** Turns this season, past and already booked, not counting this game. */
  turns: number
  /** Most recent turn before this game (YYYY-MM-DD), if any. */
  last: string | null
  /** Next turn already booked after this game, if any. */
  booked: string | null
}

export function beerPlayers(board: Board, game: Game): Player[] {
  return game.beer.flatMap((id) => board.players.find((p) => p.id === id) ?? [])
}

/** "Max", "Max & Hugo", "Max, Hugo & Jeff" */
export function beerNames(players: Player[]): string {
  const names = players.map((p) => p.name)
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

const ATT_RANK: Record<Attendance, number> = { in: 0, maybe: 1, out: 2 }

/**
 * Everyone in rotation order for this game: whoever's next up first. Fewest
 * turns first (fairness), then confirmed players ahead of unconfirmed, then
 * whoever has gone longest since his last turn, then roster order. Players
 * marked out for this game go last.
 */
export function beerRotation(board: Board, game: Game): BeerStat[] {
  const stats: BeerStat[] = board.players.map((player) => {
    let turns = 0
    let last: string | null = null
    let booked: string | null = null
    for (const g of board.games) {
      if (g.id === game.id || !g.beer.includes(player.id)) continue
      turns++
      if (g.date < game.date && (!last || g.date > last)) last = g.date
      if (g.date > game.date && (!booked || g.date < booked)) booked = g.date
    }
    return { player, bringing: game.beer.includes(player.id), attendance: attendanceOf(game, player.id), turns, last, booked }
  })
  const order = new Map(board.players.map((p, i) => [p.id, i]))
  return stats.sort((a, b) => {
    const outA = a.attendance === 'out' ? 1 : 0
    const outB = b.attendance === 'out' ? 1 : 0
    if (outA !== outB) return outA - outB
    if (a.turns !== b.turns) return a.turns - b.turns
    if (ATT_RANK[a.attendance] !== ATT_RANK[b.attendance]) return ATT_RANK[a.attendance] - ATT_RANK[b.attendance]
    const la = a.last ?? ''
    const lb = b.last ?? ''
    if (la !== lb) return la < lb ? -1 : 1
    return (order.get(a.player.id) ?? 0) - (order.get(b.player.id) ?? 0)
  })
}

/** Whose turn it is: the first player in the rotation who isn't out and isn't already bringing beer. */
export function nextUp(board: Board, game: Game): BeerStat | null {
  return beerRotation(board, game).find((s) => s.attendance !== 'out' && !s.bringing) ?? null
}
