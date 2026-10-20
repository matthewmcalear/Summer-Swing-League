'use client'

import { useState } from 'react'
import { CalendarPlus, ChevronRight, Clock, Pencil, Trash2 } from 'lucide-react'
import { newGame, type Action } from '@/lib/yeti/actions'
import { BEER, beerNames } from '@/lib/yeti/beer'
import { analyzeGame } from '@/lib/yeti/insights'
import {
  LIMITS,
  OPPONENTS,
  addDays,
  formatGameDate,
  gameWhere,
  isValidDate,
  opponentLabel,
  type Board,
  type Game,
} from '@/lib/yeti/model'
import { RINKS } from '@/lib/yeti/schedule'
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

const monthOf = (date: string) =>
  new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

function byMonth(games: Game[]): [string, Game[]][] {
  const out: [string, Game[]][] = []
  for (const g of games) {
    const m = monthOf(g.date)
    const last = out[out.length - 1]
    if (last && last[0] === m) last[1].push(g)
    else out.push([m, [g]])
  }
  return out
}

export function GamesView({ board, currentId, today, dispatch, toast, select, newId }: GamesProps) {
  const [sheet, setSheet] = useState<null | 'new' | string>(null)
  const upcoming = board.games.filter((g) => g.date >= today)
  const past = board.games.filter((g) => g.date < today).reverse()

  const row = (g: Game) => {
    const info = analyzeGame(board, g)
    const where = gameWhere(g)
    const untouched = info.counts.filled === 0 && info.counts.in === 0 && info.counts.out === 0
    return (
      <li key={g.id} className="yt-game" data-current={g.id === currentId || undefined}>
        <button type="button" className="yt-game-main" onClick={() => select(g.id)}>
          <span className="yt-game-date">
            {formatGameDate(g.date)}
            {g.date === today && <span className="yt-badge">Today</span>}
          </span>
          <span className="yt-game-opp">
            {g.opponent ? opponentLabel(g) : 'Opponent TBD'}
            {g.home !== null && <span className="yt-homeaway">{g.home ? 'Home' : 'Away'}</span>}
          </span>
          {(where || info.beer.length > 0) && (
            <span className="yt-game-where">
              {where && (
                <>
                  <Clock size={13} aria-hidden="true" /> {where}
                </>
              )}
              {info.beer.length > 0 && (
                <span className="yt-game-beer">
                  {BEER} {beerNames(info.beer)}
                </span>
              )}
            </span>
          )}
          <span className="yt-game-stats">
            {untouched
              ? 'No lines or attendance yet'
              : `${info.counts.in} in · ${info.counts.maybe} unconfirmed · ${info.counts.out} out · ${info.counts.filled}/${info.counts.slots} spots`}
          </span>
          <ChevronRight className="yt-game-go" size={18} aria-hidden="true" />
        </button>
        <button type="button" className="yt-icon-btn" onClick={() => setSheet(g.id)} aria-label={`Edit game on ${formatGameDate(g.date)}`}>
          <Pencil size={17} />
        </button>
      </li>
    )
  }

  const list = (games: Game[]) =>
    byMonth(games).map(([month, gs]) => (
      <div key={month} className="yt-month">
        <h3>{month}</h3>
        <ul className="yt-game-list">{gs.map(row)}</ul>
      </div>
    ))

  return (
    <div className="yt-games">
      <button type="button" className="yt-btn yt-add" data-primary onClick={() => setSheet('new')} disabled={board.games.length >= LIMITS.games}>
        <CalendarPlus size={18} aria-hidden="true" /> New game
      </button>

      <section className="yt-group" aria-label="Upcoming games">
        <header>
          <h2>Upcoming</h2>
          <span className="yt-muted">{upcoming.length}</span>
        </header>
        {upcoming.length ? list(upcoming) : <p className="yt-empty">No upcoming games.</p>}
      </section>

      {past.length > 0 && (
        <section className="yt-group" aria-label="Past games">
          <header>
            <h2>Past</h2>
            <span className="yt-muted">{past.length}</span>
          </header>
          {list(past)}
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

// ── Shared game fields ───────────────────────────────────────────────────────

interface Details {
  date: string
  time: string
  rink: string
  opponent: string
  home: boolean | null
}

function PickOrType({
  label,
  value,
  options,
  max,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  max: number
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <div className="yt-field">
      <span className="yt-field-label">{label}</span>
      <div className="yt-chips-row">
        {options.map((o) => (
          <button key={o} type="button" className="yt-pill-btn" aria-pressed={value === o} onClick={() => onChange(value === o ? '' : o)}>
            {o}
          </button>
        ))}
      </div>
      <input
        className="yt-input"
        placeholder={placeholder}
        value={options.includes(value) ? '' : value}
        maxLength={max}
        aria-label={`${label} (other)`}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function DetailsFields({ value, onChange, autoFocusDate }: { value: Details; onChange: (d: Details) => void; autoFocusDate?: boolean }) {
  const set = (patch: Partial<Details>) => onChange({ ...value, ...patch })
  return (
    <>
      <div className="yt-form-row" data-even>
        <label className="yt-field">
          <span className="yt-field-label">Date</span>
          <input className="yt-input" type="date" value={value.date} onChange={(e) => set({ date: e.target.value })} data-autofocus={autoFocusDate || undefined} />
        </label>
        <label className="yt-field">
          <span className="yt-field-label">Time</span>
          <input className="yt-input" type="time" value={value.time} onChange={(e) => set({ time: e.target.value })} />
        </label>
      </div>
      <PickOrType label="Opponent" value={value.opponent} options={OPPONENTS} max={LIMITS.opponentLength} placeholder="Or type a name" onChange={(opponent) => set({ opponent })} />
      <div className="yt-field">
        <span className="yt-field-label">Yeti are</span>
        <Segmented
          label="Home or away"
          value={value.home === null ? 'tbd' : value.home ? 'home' : 'away'}
          onChange={(v) => set({ home: v === 'tbd' ? null : v === 'home' })}
          options={[
            { value: 'home', label: 'Home' },
            { value: 'away', label: 'Away' },
            { value: 'tbd', label: 'Not set' },
          ]}
        />
      </div>
      <PickOrType label="Rink" value={value.rink} options={RINKS} max={LIMITS.rinkLength} placeholder="Or type a rink" onChange={(rink) => set({ rink })} />
    </>
  )
}

// ── New game ─────────────────────────────────────────────────────────────────

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
  // Default: a week after the latest game, never before today.
  const suggested = last ? addDays(last.date, 7) : today
  const [details, setDetails] = useState<Details>({ date: suggested < today ? today : suggested, time: '', rink: '', opponent: '', home: null })
  const [copyLines, setCopyLines] = useState<'yes' | 'no'>(last ? 'yes' : 'no')
  const [copyAttendance, setCopyAttendance] = useState<'yes' | 'no'>('no')

  const create = () => {
    if (!isValidDate(details.date)) return
    const id = `g-${newId()}`
    const g = newGame({ id, ...details }, last, { copyLines: copyLines === 'yes', copyAttendance: copyAttendance === 'yes' })
    if (dispatch({ t: 'addGame', game: g })) {
      select(id)
      toast(`Game on ${formatGameDate(details.date)} added`)
    }
    onClose()
  }

  return (
    <Sheet
      open
      title="New game"
      onClose={onClose}
      footer={
        <button type="button" className="yt-btn" data-primary disabled={!isValidDate(details.date)} onClick={create}>
          <CalendarPlus size={17} aria-hidden="true" /> Create game
        </button>
      }
    >
      <p className="yt-sheet-sub">The regular season is already loaded — use this for playoffs or extra games.</p>
      <DetailsFields value={details} onChange={setDetails} autoFocusDate />
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

// ── Edit game ────────────────────────────────────────────────────────────────

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
  const [details, setDetails] = useState<Details>({
    date: game?.date ?? '',
    time: game?.time ?? '',
    rink: game?.rink ?? '',
    opponent: game?.opponent ?? '',
    home: game?.home ?? null,
  })
  const [confirm, setConfirm] = useState(false)
  if (!game) return null

  const save = () => {
    dispatch({ t: 'editGame', game: game.id, patch: { ...details, date: isValidDate(details.date) ? details.date : game.date } })
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
      <DetailsFields value={details} onChange={setDetails} />
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
