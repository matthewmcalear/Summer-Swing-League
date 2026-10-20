import { attendanceOf, formatGameDate, gameWhere, opponentLabel, type Board, type Game } from './model'
import { analyzeGame, type LineInfo } from './insights'

/**
 * The lines as plain text for the team chat:
 *
 *   Yeti lines · Tue, Oct 20 · 22:20 Molson · vs Kings
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

  const where = gameWhere(game).replace(' · ', ' ')
  const title = ['Yeti lines', formatGameDate(game.date), where, opponentLabel(game)].filter(Boolean).join(' · ')
  const lines = [title, ...info.forwards.map(row), ...info.defence.map(row), `G   ${name(info.goalie.slots[0])}`]
  if (info.out.length) lines.push(`Out: ${info.out.map((p) => p.name).join(', ')}`)
  return lines.join('\n')
}
