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

/** Keeps live pages fresh while the tab is visible. */
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, seconds * 1000)
    return () => clearInterval(id)
  }, [router, seconds])
  return null
}
