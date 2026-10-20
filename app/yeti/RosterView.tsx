'use client'

import { useMemo, useState } from 'react'
import { CheckCheck, Plus, Trash2, UserMinus } from 'lucide-react'
import type { Action } from '@/lib/yeti/actions'
import { BEER } from '@/lib/yeti/beer'
import type { GameInsights } from '@/lib/yeti/insights'
import {
  LIMITS,
  POSITIONS,
  POSITION_LABEL,
  SKILLS,
  SKILL_POINTS,
  attendanceOf,
  formatGameDate,
  slotLabel,
  type Attendance,
  type Board,
  type Game,
  type Player,
  type Position,
  type Skill,
} from '@/lib/yeti/model'
import { AttendanceToggle, Pips, Segmented, Sheet } from './ui'

type SortKey = 'lineup' | 'skill' | 'number' | 'name'

interface RosterProps {
  board: Board
  game: Game
  info: GameInsights
  dispatch: (a: Action) => boolean
  toast: (text: string, opts?: { undo?: boolean; tone?: 'info' | 'alert' }) => void
  newId: () => string
}

const ATT_ORDER: Record<Attendance, number> = { in: 0, maybe: 1, out: 2 }

export function RosterView({ board, game, info, dispatch, toast, newId }: RosterProps) {
  const [sort, setSort] = useState<SortKey>('lineup')
  const [editing, setEditing] = useState<string | 'new' | null>(null)

  const players = useMemo(() => {
    const list = board.players.slice()
    const order = (p: Player) => {
      const s = info.placed.get(p.id)
      if (!s) return 1000 + ATT_ORDER[attendanceOf(game, p.id)]
      return (s.kind === 'F' ? 0 : s.kind === 'D' ? 100 : 200) + s.line * 10 + ['LW', 'C', 'RW', 'LD', 'RD', 'G'].indexOf(s.role)
    }
    const num = (p: Player) => (p.number ? Number.parseInt(p.number, 10) || 999 : 1000)
    list.sort((a, b) => {
      if (sort === 'skill') return SKILL_POINTS[b.skill] - SKILL_POINTS[a.skill] || a.name.localeCompare(b.name)
      if (sort === 'number') return num(a) - num(b) || a.name.localeCompare(b.name)
      if (sort === 'name') return a.name.localeCompare(b.name)
      return order(a) - order(b) || a.name.localeCompare(b.name)
    })
    return list
  }, [board.players, game, info.placed, sort])

  const setAttendance = (p: Player, value: Attendance) => {
    const wasPlaced = info.placed.get(p.id)
    if (!dispatch({ t: 'attend', game: game.id, player: p.id, value })) return
    if (value === 'out' && wasPlaced) toast(`${p.name} is out — ${slotLabel(wasPlaced)} is open`, { undo: true })
  }

  return (
    <div className="yt-roster">
      <section className="yt-roster-head">
        <p className="yt-eyebrow">Attendance · {formatGameDate(game.date)}</p>
        <div className="yt-summary">
          <span className="yt-count" data-att="in">
            <b>{info.counts.in}</b> in
          </span>
          <span className="yt-count" data-att="maybe">
            <b>{info.counts.maybe}</b> unconfirmed
          </span>
          <span className="yt-count" data-att="out">
            <b>{info.counts.out}</b> out
          </span>
        </div>
        {info.counts.maybe > 0 && (
          <button
            type="button"
            className="yt-btn"
            onClick={() => {
              dispatch({ t: 'attendAll', game: game.id, from: 'maybe', to: 'in' })
              toast(`${info.counts.maybe} marked in`, { undo: true })
            }}
          >
            <CheckCheck size={17} aria-hidden="true" /> Mark everyone unconfirmed as in
          </button>
        )}
        <div className="yt-sort">
          <span>Sort</span>
          <Segmented
            label="Sort roster"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'lineup', label: 'Lines' },
              { value: 'skill', label: 'Skill' },
              { value: 'number', label: '#' },
              { value: 'name', label: 'Name' },
            ]}
          />
        </div>
      </section>

      <ul className="yt-rows">
        {players.map((p) => {
          const att = attendanceOf(game, p.id)
          const slot = info.placed.get(p.id)
          const status = att === 'out' ? 'Out' : slot ? slotLabel(slot) : att === 'in' ? 'Not in the lineup' : 'Bench'
          return (
            <li key={p.id} className="yt-row" data-att={att}>
              <button type="button" className="yt-row-main" onClick={() => setEditing(p.id)} aria-label={`Edit ${p.name}`}>
                <span className="yt-row-skill" data-skill={p.skill} aria-hidden="true" />
                <span className="yt-row-num">{p.number || '–'}</span>
                <span className="yt-row-text">
                  <span className="yt-row-name">
                    <span className="yt-row-name-text">{p.name}</span>
                    {game.beer.includes(p.id) && (
                      <span className="yt-beer-mark" role="img" aria-label="bringing beer">
                        {BEER}
                      </span>
                    )}
                  </span>
                  <span className="yt-row-sub">
                    <span className="yt-tag" data-skill={p.skill}>
                      {p.skill}
                    </span>
                    <span className="yt-tag">{p.pos}</span>
                    <span className="yt-row-status" data-warn={(att === 'in' && !slot && !(p.pos === 'G' && info.goalie.slots[0].player)) || undefined}>
                      {status}
                    </span>
                  </span>
                </span>
              </button>
              <AttendanceToggle name={p.name} value={att} onChange={(v) => setAttendance(p, v)} />
            </li>
          )
        })}
      </ul>

      <button type="button" className="yt-btn yt-add" onClick={() => setEditing('new')} disabled={board.players.length >= LIMITS.players}>
        <Plus size={18} aria-hidden="true" /> Add a player or sub
      </button>

      <PlayerSheet
        key={editing ?? 'none'}
        board={board}
        game={game}
        info={info}
        playerId={editing}
        onClose={() => setEditing(null)}
        dispatch={dispatch}
        toast={toast}
        newId={newId}
      />
    </div>
  )
}

const SKILL_OPTIONS = SKILLS.map((s) => ({
  value: s,
  label: (
    <span className="yt-skill-opt">
      {s}
      <Pips skill={s} />
    </span>
  ),
}))
const POS_OPTIONS = POSITIONS.map((p) => ({ value: p, label: p }))

export function PlayerSheet({
  board,
  game,
  info,
  playerId,
  onClose,
  dispatch,
  toast,
  newId,
}: {
  board: Board
  game: Game
  info: GameInsights
  playerId: string | 'new' | null
  onClose: () => void
  dispatch: (a: Action) => boolean
  toast: RosterProps['toast']
  newId: () => string
}) {
  const isNew = playerId === 'new'
  const player = !isNew && playerId ? board.players.find((p) => p.id === playerId) ?? null : null
  const [name, setName] = useState(player?.name ?? '')
  const [number, setNumber] = useState(player?.number ?? '')
  // A new player's picks live here until "Add"; an existing player reads straight
  // from the board, so a change made on another phone shows while this is open.
  const [draftSkill, setDraftSkill] = useState<Skill>('Mid')
  const [draftPos, setDraftPos] = useState<Position>('F')
  const [draftAtt, setDraftAtt] = useState<Attendance>('in')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const skill = player ? player.skill : draftSkill
  const pos = player ? player.pos : draftPos
  const att = player ? attendanceOf(game, player.id) : draftAtt

  if (!playerId || (!isNew && !player)) return null

  const commitText = () => {
    if (!player) return
    const patch: { name?: string; number?: string } = {}
    if (name.trim() && name.trim() !== player.name) patch.name = name
    if (number.trim() !== player.number) patch.number = number
    if (Object.keys(patch).length) dispatch({ t: 'editPlayer', player: player.id, patch })
  }

  const close = () => {
    commitText()
    onClose()
  }

  const add = () => {
    if (!name.trim()) return
    const ok = dispatch({
      t: 'addPlayer',
      player: { id: newId(), name, number, skill, pos },
      game: game.id,
      attendance: att,
    })
    if (ok) toast(`${name.trim()} added`)
    onClose()
  }

  const slot = player ? info.placed.get(player.id) : undefined

  return (
    <Sheet
      open
      title={isNew ? 'Add a player' : 'Edit player'}
      onClose={close}
      footer={
        isNew ? (
          <button type="button" className="yt-btn" data-primary disabled={!name.trim()} onClick={add}>
            <Plus size={17} aria-hidden="true" /> Add to roster
          </button>
        ) : (
          <button type="button" className="yt-btn" data-primary onClick={close}>
            Done
          </button>
        )
      }
    >
      <div className="yt-form-row">
        <label className="yt-field" data-grow>
          <span className="yt-field-label">Name</span>
          <input
            className="yt-input"
            value={name}
            maxLength={LIMITS.nameLength}
            autoComplete="off"
            autoCapitalize="words"
            onChange={(e) => setName(e.target.value)}
            onBlur={commitText}
            data-autofocus={isNew || undefined}
          />
        </label>
        <label className="yt-field" data-num>
          <span className="yt-field-label">Number</span>
          <input
            className="yt-input"
            value={number}
            inputMode="numeric"
            maxLength={LIMITS.numberLength}
            autoComplete="off"
            onChange={(e) => setNumber(e.target.value)}
            onBlur={commitText}
          />
        </label>
      </div>

      <div className="yt-field">
        <span className="yt-field-label">Skill</span>
        <Segmented
          label="Skill"
          attr="skill"
          value={skill}
          options={SKILL_OPTIONS}
          onChange={(s) => (player ? dispatch({ t: 'editPlayer', player: player.id, patch: { skill: s } }) : setDraftSkill(s))}
        />
      </div>

      <div className="yt-field">
        <span className="yt-field-label">Position · {POSITION_LABEL[pos]}</span>
        <Segmented
          label="Position"
          value={pos}
          options={POS_OPTIONS}
          onChange={(p) => (player ? dispatch({ t: 'editPlayer', player: player.id, patch: { pos: p } }) : setDraftPos(p))}
        />
      </div>

      <div className="yt-field">
        <span className="yt-field-label">{formatGameDate(game.date)}</span>
        <AttendanceToggle
          size="lg"
          name={player?.name ?? 'New player'}
          value={att}
          onChange={(v) => (player ? dispatch({ t: 'attend', game: game.id, player: player.id, value: v }) : setDraftAtt(v))}
        />
      </div>

      {player && (
        <div className="yt-field yt-inline">
          <span>
            {BEER} Beer for {formatGameDate(game.date)}
            <small className="yt-inline-sub">{beerTurnsLabel(board, player.id, game.id)}</small>
          </span>
          <button
            type="button"
            className="yt-mini-btn yt-beer-toggle"
            aria-pressed={game.beer.includes(player.id)}
            onClick={() => {
              const on = !game.beer.includes(player.id)
              if (dispatch({ t: 'beer', game: game.id, player: player.id, on })) toast(on ? `${BEER} ${player.name} is on beer` : `${player.name} is off beer`)
            }}
          >
            {game.beer.includes(player.id) ? `${BEER} Bringing` : 'Put on beer'}
          </button>
        </div>
      )}

      {player && slot && (
        <div className="yt-field yt-inline">
          <span>
            In the lineup at <b>{slotLabel(slot)}</b>
          </span>
          <button type="button" className="yt-mini-btn" onClick={() => dispatch({ t: 'bench', game: game.id, player: player.id })}>
            <UserMinus size={15} aria-hidden="true" /> Bench
          </button>
        </div>
      )}

      {player && (
        <div className="yt-danger-zone">
          {confirmRemove ? (
            <>
              <span>Remove {player.name} from the roster and every game?</span>
              <button
                type="button"
                className="yt-mini-btn"
                data-tone="out"
                onClick={() => {
                  dispatch({ t: 'removePlayer', player: player.id })
                  toast(`${player.name} removed`, { undo: true })
                  onClose()
                }}
              >
                Remove
              </button>
              <button type="button" className="yt-mini-btn" onClick={() => setConfirmRemove(false)}>
                Keep
              </button>
            </>
          ) : (
            <button type="button" className="yt-link-danger" onClick={() => setConfirmRemove(true)}>
              <Trash2 size={15} aria-hidden="true" /> Remove from roster
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}

/** "2 beer turns this season" — counting every game but this one. */
function beerTurnsLabel(board: Board, playerId: string, gameId: string): string {
  const n = board.games.filter((g) => g.id !== gameId && g.beer.includes(playerId)).length
  return n === 0 ? 'No other beer turns this season' : `${n} other beer ${n === 1 ? 'turn' : 'turns'} this season`
}
