'use client'

import { Check, ChevronRight } from 'lucide-react'
import type { Action } from '@/lib/yeti/actions'
import { BEER, beerNames, beerRotation, nextUp, type BeerStat } from '@/lib/yeti/beer'
import { LIMITS, formatGameDate, type Board, type Game, type Player } from '@/lib/yeti/model'
import { Sheet } from './ui'

/** 'Oct 13' */
const shortDate = (date: string) => formatGameDate(date).replace(/^\w+, /, '')

function turnsText(s: BeerStat): string {
  const parts: string[] = []
  if (s.turns === 0) parts.push('No turns yet')
  else parts.push(`${s.turns} ${s.turns === 1 ? 'turn' : 'turns'}${s.last ? ` · last ${shortDate(s.last)}` : ''}`)
  if (s.booked) parts.push(`booked ${shortDate(s.booked)}`)
  return parts.join(' · ')
}

/** The beer line under the game details: who's on beer, or whose turn it is. */
export function BeerButton({ board, game, beer, onOpen }: { board: Board; game: Game; beer: Player[]; onOpen: () => void }) {
  const next = beer.length ? null : nextUp(board, game)
  return (
    <button type="button" className="yt-beer" data-set={beer.length > 0 || undefined} onClick={onOpen}>
      <span className="yt-beer-icon" aria-hidden="true">
        {BEER}
      </span>
      {beer.length ? (
        <span className="yt-beer-text">
          <b>{beerNames(beer)}</b> {beer.length === 1 ? 'is' : 'are'} bringing beer
        </span>
      ) : (
        <span className="yt-beer-text">
          Who’s bringing beer?
          {next && <small>Next up: {next.player.name}</small>}
        </span>
      )}
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  )
}

export function BeerSheet({
  open,
  board,
  game,
  onClose,
  dispatch,
  toast,
}: {
  open: boolean
  board: Board
  game: Game
  onClose: () => void
  dispatch: (a: Action) => boolean
  toast: (text: string, opts?: { undo?: boolean; tone?: 'info' | 'alert' }) => void
}) {
  if (!open) return null
  const rotation = beerRotation(board, game)
  const bringing = rotation.filter((s) => s.bringing).map((s) => s.player)
  // Only offer "his turn" while nobody's on beer: once someone is, it would replace him.
  const next = bringing.length ? null : nextUp(board, game)
  const full = game.beer.length >= LIMITS.beer

  // The checkmarks show each change, so no toast per tap (they'd pile up over the lines).
  const toggle = (s: BeerStat) => {
    if (!s.bringing && full) return
    dispatch({ t: 'beer', game: game.id, player: s.player.id, on: !s.bringing })
  }

  return (
    <Sheet
      open
      title={`Beer · ${formatGameDate(game.date)}`}
      onClose={onClose}
      footer={
        <>
          {bringing.length > 0 && (
            <button
              type="button"
              className="yt-btn"
              onClick={() => {
                dispatch({ t: 'setBeer', game: game.id, players: [] })
                toast('Nobody on beer', { undo: true })
              }}
            >
              Clear
            </button>
          )}
          <button type="button" className="yt-btn" data-primary onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <p className="yt-sheet-sub">
        {bringing.length
          ? `${BEER} ${beerNames(bringing)} ${bringing.length === 1 ? 'is' : 'are'} bringing beer. Tap a name to add or remove someone.`
          : 'Tap who’s bringing beer. The list is in rotation order: fewest turns this season first, confirmed players ahead.'}
      </p>

      {next && (
        <div className="yt-beer-next">
          <span>
            Next up <b>{next.player.name}</b>
            <small>{turnsText(next)}</small>
          </span>
          <button
            type="button"
            className="yt-btn"
            data-primary
            onClick={() => {
              dispatch({ t: 'setBeer', game: game.id, players: [next.player.id] })
              toast(`${BEER} ${next.player.name} is on beer`, { undo: true })
              onClose()
            }}
          >
            {BEER} {next.player.name}’s turn
          </button>
        </div>
      )}

      <ul className="yt-beer-list">
        {rotation.map((s) => (
          <li key={s.player.id}>
            <button
              type="button"
              className="yt-beer-row"
              role="checkbox"
              aria-checked={s.bringing}
              data-att={s.attendance}
              disabled={!s.bringing && full}
              onClick={() => toggle(s)}
            >
              <span className="yt-beer-check" aria-hidden="true">
                {s.bringing ? <Check size={16} strokeWidth={3} /> : null}
              </span>
              <span className="yt-beer-who">
                <span className="yt-beer-name">
                  {s.player.name}
                  {s.bringing && <i aria-hidden="true">{BEER}</i>}
                </span>
                <small>{turnsText(s)}</small>
              </span>
              <span className="yt-beer-att" data-att={s.attendance}>
                {s.attendance === 'in' ? 'In' : s.attendance === 'out' ? 'Out' : '?'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
