'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { SKILL_POINTS, type Attendance, type Fit, type Player } from '@/lib/yeti/model'
import type { SyncStatus } from '@/lib/yeti/sync'
import type { Toast } from './hooks'

// ── Player chip ──────────────────────────────────────────────────────────────

export function Pips({ skill }: { skill: Player['skill'] }) {
  const n = SKILL_POINTS[skill]
  return (
    <span className="yt-pips" aria-hidden="true">
      {[1, 2, 3, 4].map((i) => (
        <i key={i} data-on={i <= n || undefined} />
      ))}
    </span>
  )
}

/** The visual of a player chip — used in slots, on the bench and as the drag preview. */
export function ChipFace({
  player,
  attendance,
  fit,
  compact,
}: {
  player: Player
  attendance: Attendance
  fit?: Fit | null
  compact?: boolean
}) {
  return (
    <>
      <span className="yt-chip-top">
        <span className="yt-chip-num">{player.number || '–'}</span>
        <Pips skill={player.skill} />
      </span>
      <span className="yt-chip-name">{player.name}</span>
      {!compact && (
        <span className="yt-chip-pos" data-fit={fit ?? undefined}>
          {player.pos}
          {fit === 'stretch' ? ' ↺' : fit === 'wrong' ? ' !' : ''}
        </span>
      )}
      {attendance === 'maybe' && (
        <span className="yt-chip-maybe" title="Not confirmed">
          ?
        </span>
      )}
    </>
  )
}

export function chipLabel(player: Player, attendance: Attendance, where: string | null): string {
  const att = attendance === 'maybe' ? ', unconfirmed' : attendance === 'out' ? ', out' : ''
  const num = player.number ? ` number ${player.number}` : ''
  return `${player.name}${num}, ${player.skill}, ${player.pos}${att}${where ? `, ${where}` : ', on the bench'}`
}

// ── Strength meter ───────────────────────────────────────────────────────────

export function Meter({ avg, label }: { avg: number | null; label: string }) {
  const pct = avg === null ? 0 : Math.max(0, Math.min(100, (avg / 4) * 100))
  return (
    <span className="yt-meter" role="img" aria-label={avg === null ? `${label}: empty` : `${label} strength ${avg.toFixed(1)} out of 4`}>
      <span className="yt-meter-track">
        <span className="yt-meter-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="yt-meter-num">{avg === null ? '–' : avg.toFixed(1)}</span>
    </span>
  )
}

// ── Attendance toggle ────────────────────────────────────────────────────────

const ATT_OPTIONS: { value: Attendance; label: string; long: string }[] = [
  { value: 'in', label: 'In', long: 'In' },
  { value: 'maybe', label: '?', long: 'Not confirmed' },
  { value: 'out', label: 'Out', long: 'Out' },
]

export function AttendanceToggle({
  value,
  onChange,
  name,
  size = 'sm',
}: {
  value: Attendance
  onChange: (v: Attendance) => void
  name: string
  size?: 'sm' | 'lg'
}) {
  return (
    <span className="yt-seg" data-size={size} role="radiogroup" aria-label={`${name} attendance`}>
      {ATT_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-label={o.long}
          data-att={o.value}
          onClick={() => onChange(o.value)}
        >
          {size === 'lg' ? o.long : o.label}
        </button>
      ))}
    </span>
  )
}

/** Generic segmented picker (skill, position, layout…). */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  attr,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  label: string
  attr?: string
}) {
  return (
    <span className="yt-seg" data-size="lg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          {...(attr ? { [`data-${attr}`]: String(o.value) } : {})}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </span>
  )
}

// ── Bottom sheet ─────────────────────────────────────────────────────────────

export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const restore = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restore.current = document.activeElement as HTMLElement | null
    const el = ref.current
    const first = el?.querySelector<HTMLElement>('[data-autofocus], input, button:not([data-close])')
    first?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      restore.current?.focus?.({ preventScroll: true })
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="yt-sheet-wrap">
      <div className="yt-sheet-backdrop" onClick={onClose} />
      <div ref={ref} className="yt-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="yt-sheet-grab" aria-hidden="true" />
        <div className="yt-sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="yt-icon-btn" data-close onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="yt-sheet-body">{children}</div>
        {footer && <div className="yt-sheet-foot">{footer}</div>}
      </div>
    </div>
  )
}

// ── Sync status ──────────────────────────────────────────────────────────────

const SYNC_TEXT: Record<SyncStatus, string> = {
  loading: 'Loading',
  live: 'Live',
  saving: 'Saving',
  offline: 'Offline',
  error: 'Not saved',
}

export function SyncBadge({ status, onClick }: { status: SyncStatus; onClick: () => void }) {
  const title =
    status === 'offline'
      ? 'Can’t reach the server — changes are kept on this phone and sent when you’re back online'
      : status === 'live'
        ? 'Shared with everyone who has this page open'
        : SYNC_TEXT[status]
  return (
    <button type="button" className="yt-sync" data-status={status} onClick={onClick} title={title} aria-label={`Sync: ${SYNC_TEXT[status]}`}>
      <i aria-hidden="true" />
      <span>{SYNC_TEXT[status]}</span>
    </button>
  )
}

// ── Toasts ───────────────────────────────────────────────────────────────────

export function Toasts({ toasts, onUndo, onDismiss }: { toasts: Toast[]; onUndo: () => void; onDismiss: (id: number) => void }) {
  return (
    <div className="yt-toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="yt-toast" data-tone={t.tone}>
          <span>{t.text}</span>
          {t.undo && (
            <button
              type="button"
              onClick={() => {
                onUndo()
                onDismiss(t.id)
              }}
            >
              Undo
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
