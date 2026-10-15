'use client'

import { useEffect, useState } from 'react'

/** Wall clock for the TV (renders only after mount, so no server/client mismatch). */
export function TvClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    const tick = () => setNow(new Date())
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, 1000)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [])
  return (
    <span className="pd-num" suppressHydrationWarning>
      {now?.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }) ?? ''}
    </span>
  )
}

/**
 * Full-screen toggle (also on the F key) and a screen wake lock, so the
 * laptop driving the basement TV doesn't dim or sleep mid-event.
 */
export function TvControls() {
  const [full, setFull] = useState(false)

  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    const acquire = async () => {
      try {
        if (nav.wakeLock && document.visibilityState === 'visible') lock = await nav.wakeLock.request('screen')
      } catch {
        // Not supported or denied: the TV just follows the laptop's own sleep settings.
      }
    }
    acquire()
    const onVisible = () => document.visibilityState === 'visible' && acquire()
    const onFull = () => setFull(document.fullscreenElement != null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey) toggle()
    }
    document.addEventListener('visibilitychange', onVisible)
    document.addEventListener('fullscreenchange', onFull)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      document.removeEventListener('fullscreenchange', onFull)
      window.removeEventListener('keydown', onKey)
      lock?.release().catch(() => {})
    }
  }, [])

  function toggle() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen().catch(() => {})
  }

  if (full) return null
  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-lg border border-pd-line-strong px-[0.9em] py-[0.35em] text-[0.8em] font-semibold text-pd-muted hover:text-pd-ink"
    >
      ⛶ Full screen (F)
    </button>
  )
}
