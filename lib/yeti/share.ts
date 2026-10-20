import { attendanceOf, formatGameDate, type Board, type Game } from './model'
import { analyzeGame, type LineInfo } from './insights'

/**
 * The lines as plain text for the team chat:
 *
 *   Yeti lines · Tue Oct 20 vs Kings
 *   L1  Owen – Steven – DT
 *   L2  Liam – Matt – Steph
 *   L3  ___ – Peter – Tom
 *   D1  Jeff – Hugo
 *   D2  Max – X
 *   G   Euan
 *   Out: Dan
 *
 * Unconfirmed players get a "?" after their name.
 */
export function lineupText(board: Board, game: Game): string {
  const info = analyzeGame(board, game)
  const name = (s: LineInfo['slots'][number]) =>
    s.player ? `${s.player.name}${attendanceOf(game, s.player.id) === 'maybe' ? '?' : ''}` : '___'
  const row = (l: LineInfo) => `${l.label.padEnd(3)} ${l.slots.map(name).join(' – ')}`

  const title = `Yeti lines · ${formatGameDate(game.date)}${game.opponent ? ` vs ${game.opponent}` : ''}`
  const lines = [title, ...info.forwards.map(row), ...info.defence.map(row), `G   ${name(info.goalie.slots[0])}`]
  if (info.out.length) lines.push(`Out: ${info.out.map((p) => p.name).join(', ')}`)
  return lines.join('\n')
}
