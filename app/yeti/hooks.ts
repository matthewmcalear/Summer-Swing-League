'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Action } from '@/lib/yeti/actions'
import { BoardSync, type SyncState } from '@/lib/yeti/sync'

const EMPTY: SyncState = {
  board: null,
  status: 'loading',
  version: 0,
  updatedAt: null,
  canUndo: false,
  remoteChanges: 0,
  error: null,
  pending: 0,
  updateAvailable: false,
}

function safeStorage(): Storage | null {
  try {
    const s = window.localStorage
    s.getItem('yeti:probe')
    return s
  } catch {
    return null
  }
}

/** The shared board, live-synced with every other phone that has /yeti open. */
export function useBoardSync() {
  const [sync] = useState(() =>
    typeof window === 'undefined' ? null : new BoardSync({ endpoint: '/api/yeti', storage: safeStorage(), storageKey: 'yeti:board:v1' }),
  )

  useEffect(() => {
    if (!sync) return
    sync.start()
    const onVisibility = () => {
      const visible = document.visibilityState === 'visible'
      // Coming back to a page that's older than the site: quietly load the new
      // one, as long as nothing is waiting to be saved.
      const snap = sync.getSnapshot()
      if (visible && snap.updateAvailable && snap.pending === 0) {
        window.location.reload()
        return
      }
      sync.setVisible(visible)
    }
    const onOnline = () => void sync.refresh()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    window.addEventListener('focus', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('focus', onOnline)
      sync.stop()
    }
  }, [sync])

  const state = useSyncExternalStore(
    sync ? sync.subscribe : noopSubscribe,
    sync ? sync.getSnapshot : () => EMPTY,
    () => EMPTY,
  )

  const dispatch = useCallback((action: Action) => sync?.dispatch(action) ?? false, [sync])
  const undo = useCallback(() => sync?.undo() ?? false, [sync])
  const refresh = useCallback(() => void sync?.refresh(), [sync])

  return { state, dispatch, undo, refresh }
}

const noopSubscribe = () => () => {}

// Per-device preferences (current tab, chosen game). Kept in memory and mirrored
// to localStorage when it's available, so they survive a reload on this phone.
const localValues = new Map<string, string | null>()
const localListeners = new Set<() => void>()

function readLocal(key: string): string | null {
  if (!localValues.has(key)) {
    let v: string | null = null
    try {
      v = window.localStorage.getItem(key)
    } catch {
      // storage blocked
    }
    localValues.set(key, v)
  }
  return localValues.get(key) ?? null
}

function subscribeLocal(listener: () => void) {
  localListeners.add(listener)
  return () => {
    localListeners.delete(listener)
  }
}

/** useState that remembers its value on this phone (a per-device convenience, not shared). */
export function useLocalState<T extends string | null>(key: string, initial: T) {
  const raw = useSyncExternalStore(
    subscribeLocal,
    () => readLocal(key),
    () => null,
  )
  let value = initial
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T
    } catch {
      // keep the default
    }
  }
  const set = useCallback(
    (v: T) => {
      const json = JSON.stringify(v)
      localValues.set(key, json)
      try {
        window.localStorage.setItem(key, json)
      } catch {
        // storage blocked: the in-memory value still works this visit
      }
      localListeners.forEach((l) => l())
    },
    [key],
  )
  return [value, set] as const
}

const noopSubscribeDay = () => () => {}

/** Today's local date (YYYY-MM-DD) once on the client; null while server-rendering. */
export function useToday(localDate: () => string): string | null {
  return useSyncExternalStore(noopSubscribeDay, localDate, () => null)
}

export interface Toast {
  id: number
  text: string
  undo?: boolean
  tone?: 'info' | 'alert'
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const next = useRef(1)
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const show = useCallback(
    (text: string, opts: { undo?: boolean; tone?: Toast['tone']; ms?: number } = {}) => {
      const id = next.current++
      setToasts((t) => [...t.slice(-2), { id, text, undo: opts.undo, tone: opts.tone }])
      window.setTimeout(() => dismiss(id), opts.ms ?? (opts.undo ? 5000 : 3000))
    },
    [dismiss],
  )
  return { toasts, show, dismiss }
}

export function vibrate(ms = 8) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    // not supported
  }
}
