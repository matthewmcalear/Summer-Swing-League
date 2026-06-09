'use client'

import { useEffect, useState } from 'react'

type Mode = 'auto' | 'light' | 'dark'

const NEXT: Record<Mode, Mode> = { auto: 'light', light: 'dark', dark: 'auto' }
const ICON: Record<Mode, string> = { auto: '🌓', light: '☀️', dark: '🌙' }
const LABEL: Record<Mode, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' }

function applyMode(mode: Mode) {
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = mode === 'dark' || (mode === 'auto' && sysDark)
  document.documentElement.classList.toggle('dark', dark)
}

export default function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  // Render a stable placeholder until mounted to avoid hydration mismatch
  const [mode, setMode] = useState<Mode | null>(null)

  useEffect(() => {
    const stored = (localStorage.getItem('theme') as Mode | null) ?? 'auto'
    setMode(stored)

    // In auto mode, follow live system changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if ((localStorage.getItem('theme') ?? 'auto') === 'auto') applyMode('auto')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const cycle = () => {
    const next = NEXT[mode ?? 'auto']
    setMode(next)
    localStorage.setItem('theme', next)
    applyMode(next)
  }

  const m = mode ?? 'auto'
  return (
    <button
      onClick={cycle}
      title={`Theme: ${LABEL[m]} — tap to change`}
      aria-label={`Theme: ${LABEL[m]}`}
      className={showLabel
        ? 'flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors w-full'
        : 'px-2.5 py-1.5 rounded-lg text-lg leading-none hover:bg-green-800 transition-colors'}
    >
      <span className={showLabel ? 'text-2xl leading-none' : ''}>{ICON[m]}</span>
      {showLabel && <>Theme: {LABEL[m]}</>}
    </button>
  )
}
