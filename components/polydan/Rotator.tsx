'use client'

import { Children, useEffect, useState } from 'react'

/**
 * Shows one child at a time and moves to the next every few seconds, with
 * dots for where it is. For the TV: a handful of popular markets take turns
 * in one panel instead of all being squeezed in at once. The position
 * survives live refreshes (the children change, the index doesn't).
 */
export function Rotator({ children, seconds = 9 }: { children: React.ReactNode; seconds?: number }) {
  const items = Children.toArray(children)
  const [at, setAt] = useState(0)
  useEffect(() => {
    if (items.length < 2) return
    const id = setInterval(() => setAt((i) => i + 1), seconds * 1000)
    return () => clearInterval(id)
  }, [items.length, seconds])
  if (!items.length) return null
  const i = at % items.length
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div key={i} className="pd-fade-in min-h-0 flex-1 overflow-hidden">
        {items[i]}
      </div>
      {items.length > 1 && (
        <div className="mt-[0.6em] flex shrink-0 justify-center gap-[0.45em]" aria-hidden>
          {items.map((_, k) => (
            <span key={k} className={`size-[0.5em] rounded-full ${k === i ? 'bg-pd-gold' : 'bg-pd-line-strong'}`} />
          ))}
        </div>
      )}
    </div>
  )
}
