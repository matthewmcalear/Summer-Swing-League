'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A TV panel body that scrolls itself when its content doesn't fit: wait at
 * the top, glide down at reading speed, wait at the bottom, rewind, repeat.
 * Content that fits stays still. A wheel, touch or click hands control to the
 * viewer for a while, so it's still scrollable by hand on a laptop. Live
 * refreshes swap the content without resetting the position.
 */
export function AutoScroll({
  children,
  className = '',
  emPerSecond = 0.9,
  holdMs = 3500,
}: {
  children: React.ReactNode
  className?: string
  /** Glide speed in lines-ish (em of the panel's font size) per second. */
  emPerSecond?: number
  /** Pause at the top and at the bottom. */
  holdMs?: number
}) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    const el = outer.current
    const content = inner.current
    if (!el || !content) return

    let speed = 16 * emPerSecond
    const measure = () => {
      speed = (parseFloat(getComputedStyle(el).fontSize) || 16) * emPerSecond
      // Natural content height (without the fade spacer), so the spacer can't
      // keep the panel "overflowing" once the content fits again.
      setOverflowing(content.offsetHeight - el.clientHeight > 2)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    ro.observe(content)
    measure()

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => ro.disconnect()

    let raf = 0
    let last = 0
    let phase: 'hold-top' | 'down' | 'hold-bottom' | 'rewind' = 'hold-top'
    let until = performance.now() + holdMs
    let pos = 0 // fractional position; scrollTop rounds to whole pixels
    let userUntil = 0

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
      last = now
      const max = el.scrollHeight - el.clientHeight
      if (now < userUntil) {
        pos = el.scrollTop
        return
      }
      if (max <= 2) {
        pos = 0
        phase = 'hold-top'
        until = now + holdMs
        return
      }
      pos = Math.min(pos, max)
      switch (phase) {
        case 'hold-top':
          if (now >= until) phase = 'down'
          break
        case 'down':
          pos = Math.min(max, pos + speed * dt)
          el.scrollTop = pos
          if (pos >= max) {
            phase = 'hold-bottom'
            until = now + holdMs
          }
          break
        case 'hold-bottom':
          if (now >= until) phase = 'rewind'
          break
        case 'rewind':
          pos = Math.max(0, pos - speed * 8 * dt)
          el.scrollTop = pos
          if (pos <= 0) {
            phase = 'hold-top'
            until = now + holdMs
          }
          break
      }
    }
    raf = requestAnimationFrame(tick)

    const takeOver = () => {
      userUntil = performance.now() + 10_000
      phase = 'down'
    }
    el.addEventListener('wheel', takeOver, { passive: true })
    el.addEventListener('touchstart', takeOver, { passive: true })
    el.addEventListener('pointerdown', takeOver)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      el.removeEventListener('wheel', takeOver)
      el.removeEventListener('touchstart', takeOver)
      el.removeEventListener('pointerdown', takeOver)
    }
  }, [emPerSecond, holdMs])

  return (
    <div
      ref={outer}
      className={`h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        overflowing
          ? '[mask-image:linear-gradient(to_bottom,transparent,#000_0.8em,#000_calc(100%-1.6em),transparent)]'
          : ''
      } ${className}`}
    >
      {/* Spacers let the first and last rows sit clear of the fades. */}
      {overflowing && <div aria-hidden className="h-[0.8em]" />}
      <div ref={inner}>{children}</div>
      {overflowing && <div aria-hidden className="h-[1.6em]" />}
    </div>
  )
}
