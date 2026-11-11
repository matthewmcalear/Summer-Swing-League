'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A news-ticker strip for the TV: when the items are wider than the strip,
 * they glide left in a seamless loop (the content is drawn twice). When they
 * fit, they just sit there. Live refreshes swap the items without restarting.
 */
export function Ticker({ children, emPerSecond = 3 }: { children: React.ReactNode; emPerSecond?: number }) {
  const strip = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const first = useRef<HTMLDivElement>(null)
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    const el = strip.current
    const tr = track.current
    const one = first.current
    if (!el || !tr || !one) return
    let speed = 16 * emPerSecond
    let width = 0
    const measure = () => {
      speed = (parseFloat(getComputedStyle(el).fontSize) || 16) * emPerSecond
      width = one.offsetWidth
      setMoving(width > el.clientWidth + 2)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    ro.observe(one)
    measure()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => ro.disconnect()

    let raf = 0
    let last = 0
    let x = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
      last = now
      if (width <= el.clientWidth + 2) {
        x = 0
      } else {
        x -= speed * dt
        if (-x >= width) x += width // one copy has gone by: wrap seamlessly
      }
      tr.style.transform = `translateX(${x}px)`
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [emPerSecond])

  return (
    <div ref={strip} className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
      <div ref={track} className="flex w-max will-change-transform">
        <div ref={first} className="flex shrink-0">
          {children}
        </div>
        {moving && (
          <div aria-hidden className="flex shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
