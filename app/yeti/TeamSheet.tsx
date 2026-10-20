'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { GameInsights, LineInfo } from '@/lib/yeti/insights'
import { D_ROLES, F_ROLES, formatGameDate, gameWhere, opponentLabel, type Game } from '@/lib/yeti/model'
import { YetiMark } from './ui'

/**
 * The lines for the whole team, made to be screenshotted into the group chat:
 * names and numbers only. No skill levels, colors, line strength, warnings or
 * who hasn't confirmed — those stay in the coaches' view.
 */
export function TeamSheet({ game, info, onClose }: { game: Game; info: GameInsights; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const restore = document.activeElement as HTMLElement | null
    closeRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      restore?.focus?.({ preventScroll: true })
    }
  }, [onClose])

  const where = gameWhere(game)
  const versus = opponentLabel(game)

  const line = (l: LineInfo) => (
    <li key={l.label} className="yt-ts-line">
      <span className="yt-ts-label">{l.kind === 'G' ? '' : l.label}</span>
      <span className="yt-ts-names" data-count={l.slots.length}>
        {l.slots.map((s) => (
          <span key={s.def.id} className="yt-ts-player" data-empty={!s.player || undefined}>
            {s.player ? (
              <>
                {s.player.number && <small>{s.player.number}</small>}
                <span>{s.player.name}</span>
              </>
            ) : (
              '—'
            )}
          </span>
        ))}
      </span>
    </li>
  )

  const roles = (labels: readonly string[]) => (
    <div className="yt-ts-roles" data-count={labels.length} aria-hidden="true">
      <span />
      <span>
        {labels.map((r) => (
          <i key={r}>{r}</i>
        ))}
      </span>
    </div>
  )

  return (
    <div className="yt-ts" role="dialog" aria-modal="true" aria-label={`Team sheet for ${formatGameDate(game.date)}`}>
      <article className="yt-ts-card">
        <header className="yt-ts-head">
          <div className="yt-ts-brand">
            <YetiMark />
            <span>YETI</span>
          </div>
          <div className="yt-ts-date">{formatGameDate(game.date)}</div>
          {(where || versus) && (
            <div className="yt-ts-where">
              {[where, versus].filter(Boolean).join(' · ')}
              {game.home !== null && <span>{game.home ? 'Home' : 'Away'}</span>}
            </div>
          )}
        </header>

        <section className="yt-ts-section">
          <h2>Forwards</h2>
          {roles(F_ROLES)}
          <ol>{info.forwards.map(line)}</ol>
        </section>
        <section className="yt-ts-section">
          <h2>Defence</h2>
          {roles(D_ROLES)}
          <ol>{info.defence.map(line)}</ol>
        </section>
        <section className="yt-ts-section">
          <h2>Goalie</h2>
          <ol>{line(info.goalie)}</ol>
        </section>
        {info.out.length > 0 && (
          <p className="yt-ts-out">
            <b>Out</b> {info.out.map((p) => p.name).join(', ')}
          </p>
        )}
      </article>
      <button ref={closeRef} type="button" className="yt-ts-close" onClick={onClose} aria-label="Close team sheet">
        <X size={20} />
      </button>
    </div>
  )
}
