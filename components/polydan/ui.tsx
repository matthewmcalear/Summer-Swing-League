'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { ActionState } from '@/app/polydan/actions'

export function SubmitButton({
  children,
  className = 'pd-btn pd-btn-gold',
  pendingText,
  disabled,
}: {
  children: React.ReactNode
  className?: string
  pendingText?: string
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? (pendingText ?? 'Working…') : children}
    </button>
  )
}

export function Notice({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-sm font-medium text-pd-no" role="alert">{state.error}</p>
  if (state.ok) return <p className="text-sm font-medium text-pd-yes" role="status">{state.ok}</p>
  return null
}

/**
 * A submit button that asks "are you sure?" in place before an irreversible
 * action, instead of a browser pop-up (which is easy to miss on phones).
 */
export function ConfirmSubmit({
  children,
  question,
  confirmLabel,
  className = 'pd-btn pd-btn-ghost',
  confirmClassName = 'pd-btn pd-btn-danger-solid',
  pendingText,
  disabled,
}: {
  children: React.ReactNode
  question: string
  confirmLabel: string
  className?: string
  confirmClassName?: string
  pendingText?: string
  disabled?: boolean
}) {
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <button type="button" className={className} disabled={disabled} onClick={() => setAsking(true)}>
        {children}
      </button>
    )
  return (
    <span className="col-span-2 flex w-full flex-wrap items-center gap-2 rounded-lg border border-pd-no bg-pd-no-soft p-2">
      <span className="w-full text-sm font-medium sm:w-auto sm:flex-1">{question}</span>
      <SubmitButton className={confirmClassName} pendingText={pendingText}>
        {confirmLabel}
      </SubmitButton>
      <button type="button" className="pd-btn pd-btn-ghost" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </span>
  )
}

/** A form bound to a server action that shows the result inline. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  onSuccess,
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>
  children: React.ReactNode
  className?: string
  resetOnSuccess?: boolean
  onSuccess?: () => void
}) {
  const [state, formAction] = useActionState(action, {})
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (!state.ok) return
    if (resetOnSuccess) ref.current?.reset()
    onSuccess?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <Notice state={state} />
    </form>
  )
}

/**
 * Keeps every PolyDan page current: re-fetches the page's data every few
 * seconds while it's on screen, and straight away when someone comes back to
 * the tab or unlocks their phone. Nothing runs while the page is hidden.
 * router.refresh() only swaps in fresh server data — whatever someone is
 * typing (a bet amount, a PIN) is kept.
 */
export function LiveRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    let last = Date.now()
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - last < 2000) return // focus + visibility often fire together
      last = Date.now()
      router.refresh()
    }
    const id = setInterval(refresh, seconds * 1000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [router, seconds])
  return null
}
