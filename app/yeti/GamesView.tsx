'use client'

import { useState } from 'react'
import { CalendarPlus, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { newGame, type Action } from '@/lib/yeti/actions'
import { analyzeGame } from '@/lib/yeti/insights'
import { LIMITS, OPPONENTS, addDays, formatGameDate, isValidDate, type Board, type Game } from '@/lib/yeti/model'
import { Segmented, Sheet } from './ui'

interface GamesProps {
  board: Board
  currentId: string | null
  today: string
  dispatch: (a: Action) => boolean
  toast: (text: string, opts?: { undo?: boolean; tone?: 'info' | 'alert' }) => void
  select: (gameId: string) => void
  newId: () => string
}

export function GamesView({ board, currentId, today, dispatch, toast, select, newId }: GamesProps) {
  const [sheet, setSheet] = useState<null | 'new' | string>(null)
  const upcoming = board.games.filter((g) => g.date >= today)
  const past = board.games.filter((g) => g.date < today).reverse()

  const row = (g: Game) => {
    const info = analyzeGame(board, g)
    const isToday = g.date === today
    return (
      <li key={g.id} className="yt-game" data-current={g.id === currentId || undefined}>
        <button type="button" className="yt-game-main" onClick={() => select(g.id)}>
          <span className="yt-game-date">
            {formatGameDate(g.date)}
            {isToday && <span className="yt-badge">Today</span>}
          </span>
          <span className="yt-game-opp">{g.opponent ? `vs ${g.opponent}` : 'Opponent TBD'}</span>
          <span className="yt-game-stats">
            {info.counts.in} in · {info.counts.maybe} unconfirmed · {info.counts.out} out · {info.counts.filled}/{info.counts.slots} spots
          </span>
          <ChevronRight className="yt-game-go" size={18} aria-hidden="true" />
        </button>
        <button type="button" className="yt-icon-btn" onClick={() => setSheet(g.id)} aria-label={`Edit game on ${formatGameDate(g.date)}`}>
          <Pencil size={17} />
        </button>
      </li>
    )
  }

  return (
    <div className="yt-games">
      <button type="button" className="yt-btn yt-add" data-primary onClick={() => setSheet('new')} disabled={board.games.length >= LIMITS.games}>
        <CalendarPlus size={18} aria-hidden="true" /> New game
      </button>

      <section className="yt-group" aria-label="Upcoming games">
        <header>
          <h2>Upcoming</h2>
        </header>
        {upcoming.length ? <ul className="yt-game-list">{upcoming.map(row)}</ul> : <p className="yt-empty">No upcoming games yet.</p>}
      </section>

      {past.length > 0 && (
        <section className="yt-group" aria-label="Past games">
          <header>
            <h2>Past</h2>
          </header>
          <ul className="yt-game-list">{past.map(row)}</ul>
        </section>
      )}

      {sheet === 'new' && (
        <NewGameSheet board={board} today={today} onClose={() => setSheet(null)} dispatch={dispatch} toast={toast} select={select} newId={newId} />
      )}
      {sheet && sheet !== 'new' && (
        <EditGameSheet key={sheet} board={board} gameId={sheet} onClose={() => setSheet(null)} dispatch={dispatch} toast={toast} />
      )}
    </div>
  )
}

function OpponentPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="yt-field">
      <span className="yt-field-label">Opponent</span>
      <div className="yt-chips-row">
        {OPPONENTS.map((o) => (
          <button key={o} type="button" className="yt-pill-btn" aria-pressed={value === o} onClick={() => onChange(value === o ? '' : o)}>
            {o}
          </button>
        ))}
      </div>
      <input
        className="yt-input"
        placeholder="Or type a name"
        value={(OPPONENTS as readonly string[]).includes(value) ? '' : value}
        maxLength={LIMITS.opponentLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function NewGameSheet({
  board,
  today,
  onClose,
  dispatch,
  toast,
  select,
  newId,
}: {
  board: Board
  today: string
  onClose: () => void
  dispatch: GamesProps['dispatch']
  toast: GamesProps['toast']
  select: (id: string) => void
  newId: () => string
}) {
  const last = board.games[board.games.length - 1]
  // Default: a week after the latest game (league nights repeat), never before today.
  const suggested = last ? addDays(last.date, 7) : today
  const [date, setDate] = useState(suggested < today ? today : suggested)
  const [opponent, setOpponent] = useState('')
  const [copyLines, setCopyLines] = useState<'yes' | 'no'>(last ? 'yes' : 'no')
  const [copyAttendance, setCopyAttendance] = useState<'yes' | 'no'>('no')

  const create = () => {
    if (!isValidDate(date)) return
    const id = `g-${newId()}`
    const g = newGame(id, date, opponent, last, { copyLines: copyLines === 'yes', copyAttendance: copyAttendance === 'yes' })
    if (dispatch({ t: 'addGame', game: g })) {
      select(id)
      toast(`Game on ${formatGameDate(date)} added`)
    }
    onClose()
  }

  return (
    <Sheet
      open
      title="New game"
      onClose={onClose}
      footer={
        <button type="button" className="yt-btn" data-primary disabled={!isValidDate(date)} onClick={create}>
          <CalendarPlus size={17} aria-hidden="true" /> Create game
        </button>
      }
    >
      <label className="yt-field">
        <span className="yt-field-label">Date</span>
        <input className="yt-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} data-autofocus />
      </label>
      <OpponentPicker value={opponent} onChange={setOpponent} />
      {last && (
        <>
          <div className="yt-field">
            <span className="yt-field-label">Lines</span>
            <Segmented
              label="Starting lines"
              value={copyLines}
              onChange={setCopyLines}
              options={[
                { value: 'yes', label: `Copy ${formatGameDate(last.date)}` },
                { value: 'no', label: 'Start empty' },
              ]}
            />
          </div>
          <div className="yt-field">
            <span className="yt-field-label">Attendance</span>
            <Segmented
              label="Starting attendance"
              value={copyAttendance}
              onChange={setCopyAttendance}
              options={[
                { value: 'no', label: 'Everyone unconfirmed' },
                { value: 'yes', label: `Copy ${formatGameDate(last.date)}` },
              ]}
            />
          </div>
        </>
      )}
    </Sheet>
  )
}

function EditGameSheet({
  board,
  gameId,
  onClose,
  dispatch,
  toast,
}: {
  board: Board
  gameId: string
  onClose: () => void
  dispatch: GamesProps['dispatch']
  toast: GamesProps['toast']
}) {
  const game = board.games.find((g) => g.id === gameId)
  const [date, setDate] = useState(game?.date ?? '')
  const [opponent, setOpponent] = useState(game?.opponent ?? '')
  const [confirm, setConfirm] = useState(false)
  if (!game) return null

  const save = () => {
    dispatch({ t: 'editGame', game: game.id, patch: { date: isValidDate(date) ? date : game.date, opponent } })
    onClose()
  }

  return (
    <Sheet
      open
      title="Edit game"
      onClose={save}
      footer={
        <button type="button" className="yt-btn" data-primary onClick={save}>
          Done
        </button>
      }
    >
      <label className="yt-field">
        <span className="yt-field-label">Date</span>
        <input className="yt-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <OpponentPicker value={opponent} onChange={setOpponent} />
      <div className="yt-danger-zone">
        {board.games.length < 2 ? (
          <span className="yt-muted">This is the only game, so it can’t be deleted.</span>
        ) : confirm ? (
          <>
            <span>Delete this game and its lines?</span>
            <button
              type="button"
              className="yt-mini-btn"
              data-tone="out"
              onClick={() => {
                dispatch({ t: 'removeGame', game: game.id })
                toast(`Game on ${formatGameDate(game.date)} deleted`, { undo: true })
                onClose()
              }}
            >
              Delete
            </button>
            <button type="button" className="yt-mini-btn" onClick={() => setConfirm(false)}>
              Keep
            </button>
          </>
        ) : (
          <button type="button" className="yt-link-danger" onClick={() => setConfirm(true)}>
            <Trash2 size={15} aria-hidden="true" /> Delete game
          </button>
        )}
      </div>
    </Sheet>
  )
}
