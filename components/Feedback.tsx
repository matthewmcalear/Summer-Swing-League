'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

/**
 * App-wide confirm dialogs and toasts — styled, accessible replacements for
 * window.confirm / window.alert. Call from anywhere on the client:
 *
 *   if (!(await confirmDialog('Delete this score?', { danger: true }))) return
 *   toast('Saved', 'success')
 *
 * <FeedbackHost /> is mounted once in the root layout.
 */

type ToastKind = 'success' | 'error' | 'info'
interface ToastItem { id: number; message: string; kind: ToastKind }
interface ConfirmOptions { title?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
interface ConfirmRequest extends ConfirmOptions { message: string; resolve: (ok: boolean) => void }

let toasts: ToastItem[] = []
let pending: ConfirmRequest | null = null
let nextId = 1
let version = 0
const listeners = new Set<() => void>()
const emit = () => { version++; listeners.forEach((l) => l()) }
const getVersion = () => version
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export function toast(message: string, kind: ToastKind = 'info', ms = 4000) {
  const id = nextId++
  toasts = [...toasts, { id, message, kind }]
  emit()
  setTimeout(() => dismiss(id), ms)
}
function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function confirmDialog(message: string, opts: ConfirmOptions = {}): Promise<boolean> {
  // If the host hasn't subscribed yet (e.g. called from a mount effect), the
  // request waits in `pending`; useSyncExternalStore re-reads on subscribe.
  pending?.resolve(false)
  return new Promise((resolve) => {
    pending = { ...opts, message, resolve }
    emit()
  })
}
function settle(ok: boolean) {
  pending?.resolve(ok)
  pending = null
  emit()
}

const TOAST_STYLE: Record<ToastKind, { Icon: typeof Info; cls: string }> = {
  success: { Icon: CheckCircle2, cls: 'text-green-700' },
  error:   { Icon: XCircle,      cls: 'text-flag-500' },
  info:    { Icon: Info,         cls: 'text-gray-500' },
}

export default function FeedbackHost() {
  useSyncExternalStore(subscribe, getVersion, getVersion)
  const current = pending
  const list = toasts

  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (current && !d.open) d.showModal()
    if (!current && d.open) d.close()
  }, [current])

  return (
    <>
      <dialog
        ref={dialog}
        onCancel={(e) => { e.preventDefault(); settle(false) }}
        onClick={(e) => { if (e.target === dialog.current) settle(false) }}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-2xl bg-surface text-gray-900 backdrop:bg-black/40 backdrop:backdrop-blur-sm open:animate-[page-enter_0.15s_ease-out]"
      >
        {current && (
          <form method="dialog" className="p-5 sm:p-6" onSubmit={(e) => { e.preventDefault(); settle(true) }}>
            <div className="flex gap-3">
              {current.danger && (
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-flag-500 shrink-0">
                  <AlertTriangle size={20} aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-bold">{current.title ?? (current.danger ? 'Are you sure?' : 'Please confirm')}</h2>
                <p className="mt-1 text-sm text-gray-600 whitespace-pre-line">{current.message}</p>
              </div>
            </div>
            {/* Cancel comes first in the DOM so showModal() focuses it — Enter never deletes by accident. */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={() => settle(false)} className="btn-secondary">
                {current.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="submit"
                className={current.danger
                  ? 'inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-flag-500 hover:bg-flag-600 text-white font-semibold text-sm transition-colors'
                  : 'btn-primary'}
              >
                {current.confirmLabel ?? (current.danger ? 'Delete' : 'Confirm')}
              </button>
            </div>
          </form>
        )}
      </dialog>

      <div
        aria-live="polite"
        className="fixed z-[100] left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 flex flex-col items-center gap-2 w-[min(24rem,calc(100vw-2rem))] pointer-events-none"
      >
        {list.map((t) => {
          const { Icon, cls } = TOAST_STYLE[t.kind]
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto w-full flex items-start gap-2.5 rounded-xl bg-surface border border-gray-200 shadow-xl px-4 py-3 text-sm text-gray-800 animate-[page-enter_0.2s_ease-out]"
            >
              <Icon size={18} className={`${cls} shrink-0 mt-px`} aria-hidden="true" />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}
