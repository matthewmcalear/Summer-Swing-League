'use client'

import { useEffect, useRef, useState } from 'react'
import { easeOutCubic, prefersReducedMotion, formatCountUp } from '@/lib/countup'

/**
 * Animates a number when it changes. First paint shows the real value (no animation).
 * Respects prefers-reduced-motion (renders instantly).
 */
export default function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value)
  const [prevValue, setPrevValue] = useState(value)
  const raf = useRef<number>()
  const isMounted = useRef(false)

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }

    if (prevValue === value) return

    if (prefersReducedMotion()) {
      setDisplay(value)
      setPrevValue(value)
      return
    }

    const start = performance.now()
    const startValue = prevValue

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = easeOutCubic(t)
      setDisplay(startValue + (value - startValue) * eased)
      if (t < 1) {
        raf.current = requestAnimationFrame(tick)
      } else {
        setPrevValue(value)
      }
    }

    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value, duration, prevValue])

  return <>{formatCountUp(display)}</>
}
