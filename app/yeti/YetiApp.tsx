'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import Link from 'next/link'
import { CalendarDays, ChevronDown, CircleHelp, LayoutGrid, RefreshCw, Undo2, Users } from 'lucide-react'
import { analyzeGame } from '@/lib/yeti/insights'
import { attendanceOf, defaultGameId, findGame, formatGameDate, localDate, slotLabel } from '@/lib/yeti/model'
import { GamesView } from './GamesView'
import { useBoardSync, useLocalState, useToasts, useToday, vibrate } from './hooks'
import { LinesView, Tray, type LinesHandlers } from './LinesView'
import { PlayerSheet, RosterView } from './RosterView'
import { TeamSheet } from './TeamSheet'
import { ChipFace, SyncBadge, Toasts, YetiMark } from './ui'

type Tab = 'lines' | 'roster' | 'games'

// Prefer what's under the finger; fall back to overlap for near-misses.
const collide: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length ? hits : rectIntersection(args)
}

function newId(): string {
  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('')
}

export default function YetiApp() {
  const { state, dispatch, undo, refresh } = useBoardSync()
  const { toasts, show: toast, dismiss } = useToasts()
  const [tab, setTab] = useLocalState<Tab>('yeti:tab', 'lines')
  const [chosenGame, setChosenGame] = useLocalState<string | null>('yeti:game', null)
  const [pickedRaw, setPicked] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; width: number } | null>(null)
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null)
  const [teamSheet, setTeamSheet] = useState(false)
  const today = useToday(localDate)

  const board = state.board
  // A pick goes stale if another phone removes that player meanwhile.
  const picked = pickedRaw && board?.players.some((p) => p.id === pickedRaw) ? pickedRaw : null
  const game = useMemo(() => {
    if (!board) return null
    return (chosenGame ? findGame(board, chosenGame) : undefined) ?? findGame(board, defaultGameId(board, today ?? localDate()) ?? '') ?? null
  }, [board, chosenGame, today])
  const info = useMemo(() => (board && game ? analyzeGame(board, game) : null), [board, game])
  const nameOf = useCallback((id: string) => board?.players.find((p) => p.id === id)?.name ?? 'Player', [board])

  // Escape puts down whatever is picked up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPicked(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // A quiet heads-up when another phone changes the board.
  const lastRemote = useRef({ count: 0, at: 0 })
  useEffect(() => {
    if (state.remoteChanges <= lastRemote.current.count) return
    lastRemote.current.count = state.remoteChanges
    if (Date.now() - lastRemote.current.at > 15000) {
      lastRemote.current.at = Date.now()
      toast('Updated from another phone')
    }
  }, [state.remoteChanges, toast])

  useEffect(() => {
    if (state.error) toast(state.error, { tone: 'alert' })
  }, [state.error, toast])

  const goTo = useCallback(
    (next: Tab) => {
      setPicked(null)
      setTab(next)
      window.scrollTo({ top: 0, behavior: 'instant' }) // a new screen, not a scroll (the site sets smooth scrolling)
    },
    [setTab],
  )

  const doUndo = useCallback(() => {
    if (undo()) toast('Undone')
  }, [undo, toast])

  // ── Moves (shared by drag and tap) ────────────────────────────────────────

  const place = useCallback(
    (playerId: string, slotId: string) => {
      if (!game) return
      const wasOut = attendanceOf(game, playerId) === 'out'
      if (dispatch({ t: 'place', game: game.id, player: playerId, slot: slotId })) {
        vibrate(8)
        if (wasOut) toast(`${nameOf(playerId)} is back in`, { undo: true })
      }
    },
    [dispatch, game, nameOf, toast],
  )

  const toBench = useCallback(
    (playerId: string) => {
      if (!game || !info) return
      setPicked(null)
      if (attendanceOf(game, playerId) === 'out') {
        if (dispatch({ t: 'attend', game: game.id, player: playerId, value: 'in' })) toast(`${nameOf(playerId)} marked in`, { undo: true })
      } else if (info.placed.has(playerId)) {
        dispatch({ t: 'bench', game: game.id, player: playerId })
      }
    },
    [dispatch, game, info, nameOf, toast],
  )

  const markOut = useCallback(
    (playerId: string) => {
      if (!game || !info) return
      setPicked(null)
      const slot = info.placed.get(playerId)
      if (dispatch({ t: 'attend', game: game.id, player: playerId, value: 'out' })) {
        vibrate(12)
        toast(slot ? `${nameOf(playerId)} is out — ${slotLabel(slot)} is open` : `${nameOf(playerId)} marked out`, { undo: true })
      }
    },
    [dispatch, game, info, nameOf, toast],
  )

  const handlers: LinesHandlers = useMemo(
    () => ({
      dispatch,
      toast,
      setPicked,
      toBench,
      markOut,
      editPlayer: (playerId) => {
        setPicked(null)
        setEditingPlayer(playerId)
      },
      openTeamSheet: () => {
        setPicked(null)
        setTeamSheet(true)
      },
      tapChip: (playerId, slotId) => {
        if (picked && picked !== playerId) {
          if (slotId) {
            place(picked, slotId) // drop the picked player here; this one swaps or heads to the bench
            setPicked(null)
          } else {
            setPicked(playerId)
          }
          return
        }
        setPicked(picked === playerId ? null : playerId)
      },
      tapSlot: (slotId) => {
        if (picked) {
          place(picked, slotId)
          setPicked(null)
        } else {
          toast('Tap a player, then a spot — or press and hold to drag')
        }
      },
    }),
    [dispatch, toast, toBench, markOut, place, picked],
  )

  // ── Drag and drop ─────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Press and hold to pick up, so a normal swipe still scrolls the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  )

  const onDragStart = (e: DragStartEvent) => {
    const id = e.active.data.current?.player as string | undefined
    if (!id) return
    setPicked(null)
    setDragging({ id, width: e.active.rect.current.initial?.width ?? 104 })
    vibrate(10)
  }
  const onDragEnd = (e: DragEndEvent) => {
    const id = e.active.data.current?.player as string | undefined
    setDragging(null)
    if (!id || !e.over) return
    const over = String(e.over.id)
    if (over.startsWith('slot:')) place(id, over.slice(5))
    else if (over === 'bench') toBench(id)
    else if (over === 'out') markOut(id)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const draggedPlayer = dragging && board ? board.players.find((p) => p.id === dragging.id) ?? null : null
  const pickedPlayer = picked && board ? board.players.find((p) => p.id === picked) ?? null : null
  const alerts = info ? info.warnings.filter((w) => w.level === 'alert').length : 0

  let body: React.ReactNode
  if (!board) {
    body =
      state.status === 'offline' || state.status === 'error' ? (
        <div className="yt-error">
          <p>Can’t reach the lineup right now. Check your connection and try again.</p>
          <button type="button" className="yt-btn" onClick={refresh}>
            <RefreshCw size={17} aria-hidden="true" /> Try again
          </button>
        </div>
      ) : (
        <div className="yt-loading" aria-label="Loading">
          <i />
          <i />
          <i />
          <i />
        </div>
      )
  } else if (tab === 'games' || !game || !info) {
    body = (
      <GamesView
        board={board}
        currentId={game?.id ?? null}
        today={today ?? localDate()}
        dispatch={dispatch}
        toast={toast}
        newId={newId}
        select={(id) => {
          setChosenGame(id)
          goTo('lines')
        }}
      />
    )
  } else if (tab === 'roster') {
    body = <RosterView board={board} game={game} info={info} dispatch={dispatch} toast={toast} newId={newId} />
  } else {
    body = <LinesView board={board} game={game} info={info} picked={picked} dragging={dragging?.id ?? null} h={handlers} />
  }

  const activeTab: Tab = board && (!game || !info) ? 'games' : tab
  const tabs: { id: Tab; label: string; Icon: typeof Users; badge?: number }[] = [
    { id: 'lines', label: 'Lines', Icon: LayoutGrid, badge: alerts || undefined },
    { id: 'roster', label: 'Roster', Icon: Users, badge: info?.counts.maybe || undefined },
    { id: 'games', label: 'Games', Icon: CalendarDays },
  ]

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collide}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <header className="yt-header">
        <div className="yt-header-inner">
          <div className="yt-brand">
            <YetiMark />
            <span>YETI</span>
          </div>
          {game ? (
            <button type="button" className="yt-game-pill" onClick={() => goTo('games')} aria-label={`Game: ${formatGameDate(game.date)}. Change game`}>
              <span>
                {formatGameDate(game.date)}
                {game.opponent ? ` · ${game.opponent}` : ''}
              </span>
              <ChevronDown size={16} />
            </button>
          ) : (
            <span className="yt-game-pill" aria-hidden="true" />
          )}
          <SyncBadge status={state.status} onClick={refresh} />
          <button type="button" className="yt-icon-btn" onClick={doUndo} disabled={!state.canUndo} aria-label="Undo last change">
            <Undo2 size={20} />
          </button>
          <Link href="/yeti/help" className="yt-icon-btn" aria-label="How it works">
            <CircleHelp size={20} />
          </Link>
        </div>
      </header>

      <div className="yt-main" data-tab={activeTab}>
        {body}
      </div>

      <div className="yt-dock">
        <Toasts toasts={toasts} onUndo={doUndo} onDismiss={dismiss} />
        {activeTab === 'lines' && game && info && (
          <div className="yt-tray-wrap">
            <Tray game={game} info={info} picked={picked} dragging={dragging?.id ?? null} h={handlers} pickedPlayer={pickedPlayer} />
          </div>
        )}
        <nav className="yt-tabs-wrap" aria-label="Sections">
          <div className="yt-tabs">
            {tabs.map(({ id, label, Icon, badge }) => (
              <button
                key={id}
                type="button"
                aria-current={activeTab === id ? 'page' : undefined}
                onClick={() => goTo(id)}
              >
                <Icon size={21} aria-hidden="true" />
                {label}
                {badge ? (
                  <span className="yt-tab-badge" aria-label={id === 'lines' ? `${badge} to fix` : `${badge} unconfirmed`}>
                    {badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {teamSheet && game && info && <TeamSheet game={game} info={info} onClose={() => setTeamSheet(false)} />}

      {editingPlayer && board && game && info && (
        <PlayerSheet
          key={editingPlayer}
          board={board}
          game={game}
          info={info}
          playerId={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          dispatch={dispatch}
          toast={toast}
          newId={newId}
        />
      )}

      <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        {draggedPlayer && game ? (
          <div className="yt-overlay" style={{ ['--overlay-w' as string]: `${Math.max(88, Math.min(150, dragging!.width))}px` }}>
            <div className="yt-chip" data-skill={draggedPlayer.skill} data-att={attendanceOf(game, draggedPlayer.id)}>
              <ChipFace player={draggedPlayer} attendance={attendanceOf(game, draggedPlayer.id)} />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
