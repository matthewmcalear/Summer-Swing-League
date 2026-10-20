'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { AlertTriangle, ArrowDown, ArrowUp, Clock, Copy, Eraser, Info, LayoutGrid, Pencil, Share2, Sparkles, Users, X } from 'lucide-react'
import type { Action } from '@/lib/yeti/actions'
import { suggestLineup, type BalanceMode } from '@/lib/yeti/balance'
import type { GameInsights, LineInfo, SlotInfo } from '@/lib/yeti/insights'
import {
  LIMITS,
  ROLE_LABEL,
  attendanceOf,
  formatGameDate,
  gameWhere,
  opponentLabel,
  slotLabel,
  type Board,
  type Game,
  type Player,
} from '@/lib/yeti/model'
import { lineupText } from '@/lib/yeti/share'
import { BeerButton, BeerSheet } from './BeerSheet'
import { ChipFace, Meter, Segmented, Sheet, chipLabel } from './ui'

export interface LinesHandlers {
  dispatch: (a: Action) => boolean
  toast: (text: string, opts?: { undo?: boolean; tone?: 'info' | 'alert' }) => void
  /** Tap on a player chip (pick it up, drop the picked one here, or put it down). */
  tapChip: (playerId: string, slotId: string | null) => void
  /** Tap on an empty slot. */
  tapSlot: (slotId: string) => void
  toBench: (playerId: string) => void
  markOut: (playerId: string) => void
  setPicked: (playerId: string | null) => void
  /** Open the player editor (skill, number, position…). */
  editPlayer: (playerId: string) => void
  /** Open the screenshot-friendly team sheet (names only). */
  openTeamSheet: () => void
}

// ── Draggable chip ───────────────────────────────────────────────────────────

export function DraggableChip({
  player,
  game,
  slot,
  picked,
  compact,
  onTap,
}: {
  player: Player
  game: Game
  slot: SlotInfo | null
  picked: boolean
  compact?: boolean
  onTap: () => void
}) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: `p:${player.id}`, data: { player: player.id } })
  const attendance = attendanceOf(game, player.id)
  const beer = game.beer.includes(player.id)
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      className="yt-chip"
      data-skill={player.skill}
      data-att={attendance}
      data-fit={slot?.fit ?? undefined}
      data-picked={picked || undefined}
      data-dragging={isDragging || undefined}
      data-compact={compact || undefined}
      aria-pressed={picked}
      aria-label={chipLabel(player, attendance, slot ? slotLabel(slot.def) : null, beer)}
      onClick={onTap}
    >
      <ChipFace player={player} attendance={attendance} fit={slot?.fit} compact={compact} beer={beer} />
    </button>
  )
}

// ── Slots and lines ──────────────────────────────────────────────────────────

function SlotBox({ slot, line, game, picked, active, h }: { slot: SlotInfo; line: LineInfo; game: Game; picked: string | null; active: boolean; h: LinesHandlers }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${slot.def.id}`, data: { slot: slot.def.id } })
  return (
    <div ref={setNodeRef} className="yt-slot" data-over={isOver || undefined} data-target={active || undefined} data-kind={slot.def.kind}>
      {slot.player ? (
        <DraggableChip
          player={slot.player}
          game={game}
          slot={slot}
          picked={picked === slot.player.id}
          onTap={() => h.tapChip(slot.player!.id, slot.def.id)}
        />
      ) : (
        <button
          type="button"
          className="yt-slot-empty"
          onClick={() => h.tapSlot(slot.def.id)}
          aria-label={`Open spot: ${ROLE_LABEL[slot.def.role]}${slot.def.kind === 'G' ? '' : `, ${line.label}`}`}
        >
          {slot.def.role}
        </button>
      )}
    </div>
  )
}

function LineRow({
  line,
  game,
  picked,
  active,
  h,
  onMenu,
}: {
  line: LineInfo
  game: Game
  picked: string | null
  active: boolean
  h: LinesHandlers
  onMenu: (line: LineInfo) => void
}) {
  return (
    <div className="yt-line" data-kind={line.kind}>
      <button type="button" className="yt-line-label" onClick={() => onMenu(line)} aria-label={`${line.label} options`}>
        <span className="yt-line-name">{line.label}</span>
        {line.kind !== 'G' && <Meter avg={line.avg} label={line.label} />}
      </button>
      <div className="yt-line-slots" data-count={line.slots.length}>
        {line.slots.map((s) => (
          <SlotBox key={s.def.id} slot={s} line={line} game={game} picked={picked} active={active} h={h} />
        ))}
      </div>
    </div>
  )
}

function SpreadTag({ spread }: { spread: number | null }) {
  if (spread === null) return null
  const level = spread < 0.5 ? 'even' : spread < 1 ? 'close' : 'uneven'
  const text = level === 'even' ? 'Even' : `Gap ${spread.toFixed(1)}`
  return (
    <span className="yt-spread" data-level={level} title="Difference between the strongest and weakest line (average skill: Elite 4, Good 3, Mid 2, Low 1)">
      {text}
    </span>
  )
}

// ── Tray: bench and out, plus big drop targets while dragging ────────────────

export function Tray({
  game,
  info,
  picked,
  dragging,
  h,
  pickedPlayer,
}: {
  game: Game
  info: GameInsights
  picked: string | null
  dragging: string | null
  h: LinesHandlers
  pickedPlayer: Player | null
}) {
  const { setNodeRef: benchRef, isOver: overBench } = useDroppable({ id: 'bench' })
  const { setNodeRef: outRef, isOver: overOut } = useDroppable({ id: 'out' })
  const mode = dragging ? 'dragging' : picked ? 'picked' : 'idle'
  const pickedIsOut = pickedPlayer ? attendanceOf(game, pickedPlayer.id) === 'out' : false
  const pickedPlaced = pickedPlayer ? info.placed.has(pickedPlayer.id) : false

  return (
    <div className="yt-tray" data-mode={mode}>
      {pickedPlayer && (
        <div className="yt-tray-strip">
          <span className="yt-tray-hint">
            <b>{pickedPlayer.name}</b> — tap a spot
          </span>
          {(pickedPlaced || pickedIsOut) && (
            <button type="button" className="yt-mini-btn" onClick={() => h.toBench(pickedPlayer.id)}>
              {pickedIsOut ? 'Mark in' : 'Bench'}
            </button>
          )}
          {!pickedIsOut && (
            <button type="button" className="yt-mini-btn" data-tone="out" onClick={() => h.markOut(pickedPlayer.id)}>
              Out
            </button>
          )}
          <button type="button" className="yt-mini-btn" onClick={() => h.editPlayer(pickedPlayer.id)} aria-label={`Edit ${pickedPlayer.name}`}>
            <Pencil size={14} aria-hidden="true" /> Edit
          </button>
          <button type="button" className="yt-icon-btn" onClick={() => h.setPicked(null)} aria-label="Cancel">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="yt-tray-scroll">
        <section className="yt-tray-group" aria-label="Bench">
          <h3>
            Bench <span>{info.bench.length}</span>
          </h3>
          {info.bench.length === 0 ? (
            <p className="yt-tray-empty">Everyone available is in the lineup</p>
          ) : (
            info.bench.map((p) => (
              <DraggableChip key={p.id} player={p} game={game} slot={null} compact picked={picked === p.id} onTap={() => h.tapChip(p.id, null)} />
            ))
          )}
        </section>
        <section className="yt-tray-group" data-group="out" aria-label="Out">
          <h3>
            Out <span>{info.out.length}</span>
          </h3>
          {info.out.length === 0 ? (
            <p className="yt-tray-empty">Nobody</p>
          ) : (
            info.out.map((p) => (
              <DraggableChip key={p.id} player={p} game={game} slot={null} compact picked={picked === p.id} onTap={() => h.tapChip(p.id, null)} />
            ))
          )}
        </section>
      </div>

      <div className="yt-tray-targets" aria-hidden={mode !== 'dragging'}>
        <div ref={benchRef} className="yt-target" data-over={overBench || undefined}>
          Bench
          <small>available, not playing a spot</small>
        </div>
        <div ref={outRef} className="yt-target" data-tone="out" data-over={overOut || undefined}>
          Out
          <small>not at this game</small>
        </div>
      </div>
    </div>
  )
}

// ── The lines screen ─────────────────────────────────────────────────────────

export function LinesView({
  board,
  game,
  info,
  picked,
  dragging,
  h,
}: {
  board: Board
  game: Game
  info: GameInsights
  picked: string | null
  dragging: string | null
  h: LinesHandlers
}) {
  const [menuLine, setMenuLine] = useState<LineInfo | null>(null)
  const [sheet, setSheet] = useState<null | 'auto' | 'share' | 'layout' | 'beer'>(null)
  const [showAllWarnings, setShowAllWarnings] = useState(false)
  const active = !!(picked || dragging)
  const warnings = showAllWarnings ? info.warnings : info.warnings.slice(0, 3)
  const where = gameWhere(game)
  const versus = opponentLabel(game)
  // An empty game can start from the most recent earlier game that has lines.
  const source =
    info.counts.filled === 0
      ? board.games.filter((g) => g.date < game.date && Object.keys(g.slots).length > 0).pop()
      : undefined

  return (
    <div className="yt-lines">
      {(where || versus) && (
        <p className="yt-gameinfo">
          {where && (
            <span>
              <Clock size={14} aria-hidden="true" /> {where}
            </span>
          )}
          {versus && <b>{versus}</b>}
          {game.home !== null && <span className="yt-homeaway">{game.home ? 'Home' : 'Away'}</span>}
        </p>
      )}

      <BeerButton board={board} game={game} beer={info.beer} onOpen={() => setSheet('beer')} />

      {info.counts.filled === 0 && (
        <section className="yt-start" aria-label="Start the lines">
          <p>
            <b>No lines yet for this game.</b> {source ? 'Start from the last game’s lines, or let Auto lines build them.' : 'Drag players in, or let Auto lines build them.'}
          </p>
          <div>
            {source && (
              <button
                type="button"
                className="yt-btn"
                data-primary
                onClick={() => {
                  if (h.dispatch({ t: 'copyLines', game: game.id, from: source.id })) h.toast(`Lines copied from ${formatGameDate(source.date)}`, { undo: true })
                }}
              >
                <Copy size={17} aria-hidden="true" /> Copy {formatGameDate(source.date)}
              </button>
            )}
            <button type="button" className="yt-btn" onClick={() => setSheet('auto')}>
              <Sparkles size={17} aria-hidden="true" /> Auto lines
            </button>
          </div>
        </section>
      )}

      <section className="yt-summary" aria-label="Attendance">
        <span className="yt-count" data-att="in">
          <b>{info.counts.in}</b> in
        </span>
        <span className="yt-count" data-att="maybe">
          <b>{info.counts.maybe}</b> unconfirmed
        </span>
        <span className="yt-count" data-att="out">
          <b>{info.counts.out}</b> out
        </span>
        <span className="yt-spots">
          {info.counts.filled}/{info.counts.slots} spots
        </span>
      </section>

      {info.warnings.length > 0 && (
        <ul className="yt-warnings">
          {warnings.map((w) => (
            <li key={w.id} data-level={w.level}>
              <button type="button" disabled={!w.player} onClick={() => w.player && h.setPicked(w.player)}>
                {w.level === 'alert' ? <AlertTriangle size={15} aria-hidden="true" /> : <Info size={15} aria-hidden="true" />}
                <span>{w.text}</span>
              </button>
            </li>
          ))}
          {info.warnings.length > 3 && (
            <li className="yt-warnings-more">
              <button type="button" onClick={() => setShowAllWarnings((v) => !v)}>
                {showAllWarnings ? 'Show less' : `${info.warnings.length - 3} more`}
              </button>
            </li>
          )}
        </ul>
      )}

      <section className="yt-group" aria-label="Forward lines">
        <header>
          <h2>Forwards</h2>
          <SpreadTag spread={info.spread.F} />
        </header>
        {info.forwards.map((l) => (
          <LineRow key={l.label} line={l} game={game} picked={picked} active={active} h={h} onMenu={setMenuLine} />
        ))}
      </section>

      <section className="yt-group" aria-label="Defence pairs">
        <header>
          <h2>Defence</h2>
          <SpreadTag spread={info.spread.D} />
        </header>
        {info.defence.map((l) => (
          <LineRow key={l.label} line={l} game={game} picked={picked} active={active} h={h} onMenu={setMenuLine} />
        ))}
      </section>

      <section className="yt-group" aria-label="Goalie">
        <header>
          <h2>Goalie</h2>
        </header>
        <LineRow line={info.goalie} game={game} picked={picked} active={active} h={h} onMenu={setMenuLine} />
      </section>

      <div className="yt-actions">
        <button type="button" className="yt-btn" onClick={() => setSheet('auto')}>
          <Sparkles size={17} aria-hidden="true" /> Auto lines
        </button>
        <button type="button" className="yt-btn" onClick={h.openTeamSheet}>
          <Users size={17} aria-hidden="true" /> Team sheet
        </button>
        <button type="button" className="yt-btn" onClick={() => setSheet('share')}>
          <Share2 size={17} aria-hidden="true" /> Share text
        </button>
        <button type="button" className="yt-btn" onClick={() => setSheet('layout')}>
          <LayoutGrid size={17} aria-hidden="true" /> {game.fLines}F · {game.dPairs}D
        </button>
      </div>
      <p className="yt-help-text">
        Press and hold a player to drag, or tap a player and then tap a spot. Line strength is the average skill (Elite 4 · Good 3 · Mid 2 · Low 1).
        Team sheet shows just the names, ready to screenshot for the group chat.{' '}
        <Link href="/yeti/help">How it all works →</Link>
      </p>

      <LineMenu line={menuLine} game={game} onClose={() => setMenuLine(null)} h={h} />
      <AutoSheet open={sheet === 'auto'} board={board} game={game} info={info} onClose={() => setSheet(null)} h={h} />
      <ShareSheet open={sheet === 'share'} board={board} game={game} onClose={() => setSheet(null)} h={h} />
      <LayoutSheet open={sheet === 'layout'} game={game} info={info} onClose={() => setSheet(null)} h={h} />
      <BeerSheet open={sheet === 'beer'} board={board} game={game} onClose={() => setSheet(null)} dispatch={h.dispatch} toast={h.toast} />
    </div>
  )
}

// ── Sheets ───────────────────────────────────────────────────────────────────

function LineMenu({ line, game, onClose, h }: { line: LineInfo | null; game: Game; onClose: () => void; h: LinesHandlers }) {
  if (!line) return null
  const count = line.kind === 'F' ? game.fLines : line.kind === 'D' ? game.dPairs : 1
  const swap = (to: number) => {
    if (line.kind === 'G') return
    h.dispatch({ t: 'swapLines', game: game.id, kind: line.kind, a: line.line, b: to })
    onClose()
  }
  const names = line.slots.flatMap((s) => (s.player ? [s.player.name] : []))
  return (
    <Sheet open title={line.kind === 'G' ? 'Goalie' : line.kind === 'F' ? `Line ${line.line}` : `D pair ${line.line}`} onClose={onClose}>
      <p className="yt-sheet-sub">{names.length ? names.join(' · ') : 'Empty'}</p>
      <div className="yt-menu">
        {line.kind !== 'G' && (
          <>
            <button type="button" disabled={line.line === 1} onClick={() => swap(line.line - 1)}>
              <ArrowUp size={18} aria-hidden="true" /> Move up <small>swap with {line.kind === 'F' ? `L${line.line - 1}` : `D${line.line - 1}`}</small>
            </button>
            <button type="button" disabled={line.line === count} onClick={() => swap(line.line + 1)}>
              <ArrowDown size={18} aria-hidden="true" /> Move down <small>swap with {line.kind === 'F' ? `L${line.line + 1}` : `D${line.line + 1}`}</small>
            </button>
          </>
        )}
        <button
          type="button"
          disabled={!names.length}
          onClick={() => {
            h.dispatch({ t: 'clearLine', game: game.id, kind: line.kind, line: line.line })
            h.toast(`${line.kind === 'G' ? 'Net' : line.label} cleared`, { undo: true })
            onClose()
          }}
        >
          <Eraser size={18} aria-hidden="true" /> Clear {line.kind === 'G' ? 'the net' : 'this line'} <small>players go to the bench</small>
        </button>
      </div>
    </Sheet>
  )
}

function AutoSheet({ open, board, game, info, onClose, h }: { open: boolean; board: Board; game: Game; info: GameInsights; onClose: () => void; h: LinesHandlers }) {
  if (!open) return null
  const run = (mode: BalanceMode) => {
    const s = suggestLineup(board, game, mode)
    const changed = h.dispatch({ t: 'setSlots', game: game.id, slots: s.slots })
    if (!changed) h.toast(mode === 'fill' ? 'Nothing to fill — no open spots with someone on the bench' : 'These lines are already as even as it gets')
    else if (mode === 'fill') h.toast(`Added ${s.added} from the bench`, { undo: true })
    else h.toast(`Lines rebuilt — ${s.moved} ${s.moved === 1 ? 'player' : 'players'} moved`, { undo: true })
    onClose()
  }
  const canFill = info.counts.open > 0 && info.bench.length > 0
  return (
    <Sheet open title="Auto lines" onClose={onClose}>
      <p className="yt-sheet-sub">
        Keeps players in position (F/D can go anywhere), evens out average skill across lines and prefers confirmed players. You can undo.
      </p>
      <div className="yt-menu">
        <button type="button" disabled={!canFill} onClick={() => run('fill')}>
          <Sparkles size={18} aria-hidden="true" /> Fill open spots
          <small>{canFill ? 'Everyone stays put; bench players fill the holes' : 'No open spots with someone on the bench'}</small>
        </button>
        <button type="button" onClick={() => run('rebuild')}>
          <Sparkles size={18} aria-hidden="true" /> Rebuild all lines
          <small>Re-balance every line, moving as few players as it can</small>
        </button>
        <button
          type="button"
          onClick={() => {
            h.dispatch({ t: 'clearSlots', game: game.id })
            h.toast('Lineup cleared', { undo: true })
            onClose()
          }}
        >
          <Eraser size={18} aria-hidden="true" /> Clear the lineup
          <small>Everyone goes to the bench</small>
        </button>
      </div>
    </Sheet>
  )
}

function ShareSheet({ open, board, game, onClose, h }: { open: boolean; board: Board; game: Game; onClose: () => void; h: LinesHandlers }) {
  if (!open) return null
  const text = lineupText(board, game)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      h.toast('Lines copied')
      onClose()
    } catch {
      h.toast('Couldn’t copy — select the text instead', { tone: 'alert' })
    }
  }
  const share = async () => {
    try {
      await navigator.share({ text })
      onClose()
    } catch {
      // cancelled
    }
  }
  return (
    <Sheet
      open
      title="Share lines"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="yt-btn" onClick={copy}>
            <Copy size={17} aria-hidden="true" /> Copy
          </button>
          {canShare && (
            <button type="button" className="yt-btn" data-primary onClick={share}>
              <Share2 size={17} aria-hidden="true" /> Share…
            </button>
          )}
        </>
      }
    >
      <pre className="yt-share-text">{text}</pre>
    </Sheet>
  )
}

function LayoutSheet({ open, game, info, onClose, h }: { open: boolean; game: Game; info: GameInsights; onClose: () => void; h: LinesHandlers }) {
  if (!open) return null
  const set = (fLines: number, dPairs: number) => h.dispatch({ t: 'layout', game: game.id, fLines, dPairs })
  const fOpts = []
  for (let n = LIMITS.fLines.min; n <= LIMITS.fLines.max; n++) fOpts.push({ value: n, label: `${n} lines` })
  const dOpts = []
  for (let n = LIMITS.dPairs.min; n <= LIMITS.dPairs.max; n++) dOpts.push({ value: n, label: `${n} pairs` })
  const skaters = info.counts.in + info.counts.maybe - (info.goalie.slots[0].player ? 1 : 0)
  return (
    <Sheet open title="Lines for this game" onClose={onClose}>
      <p className="yt-sheet-sub">
        {skaters} skaters available for {game.fLines * 3 + game.dPairs * 2} spots. Removing a line sends its players to the bench.
      </p>
      <div className="yt-field">
        <span className="yt-field-label">Forward lines</span>
        <Segmented label="Forward lines" value={game.fLines} options={fOpts} onChange={(n) => set(n, game.dPairs)} />
      </div>
      <div className="yt-field">
        <span className="yt-field-label">Defence pairs</span>
        <Segmented label="Defence pairs" value={game.dPairs} options={dOpts} onChange={(n) => set(game.fLines, n)} />
      </div>
    </Sheet>
  )
}
