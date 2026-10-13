'use client'

import { useActionState } from 'react'
import { login, setupAdmin } from '../actions'
import { Notice, SubmitButton } from '@/components/polydan/ui'

export function LoginForm({ names }: { names: string[] }) {
  const [state, action] = useActionState(login, {})
  return (
    <form action={action} className="pd-card space-y-4 p-5">
      <label className="block">
        <span className="pd-eyebrow">Who are you?</span>
        <select name="name" required className="pd-field mt-1" defaultValue="">
          <option value="" disabled>
            Pick your name
          </option>
          {names.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="pd-eyebrow">PIN</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          required
          className="pd-field mt-1 tracking-[0.3em]"
        />
      </label>
      <SubmitButton className="pd-btn pd-btn-gold w-full" pendingText="Checking…">
        Log in
      </SubmitButton>
      <Notice state={state} />
      <p className="text-center text-xs text-pd-muted">No account? Ask Matt for a PIN.</p>
    </form>
  )
}

export function SetupForm() {
  const [state, action] = useActionState(setupAdmin, {})
  return (
    <form action={action} className="pd-card space-y-4 p-5">
      <p className="text-sm">
        <span className="font-semibold">First-time setup.</span>{' '}
        <span className="text-pd-muted">
          Create the PolyDan admin account. All 42 past Iron Man competitors are loaded for you.
        </span>
      </p>
      <label className="block">
        <span className="pd-eyebrow">Your name</span>
        <input name="name" required defaultValue="Matt" className="pd-field mt-1" />
      </label>
      <label className="block">
        <span className="pd-eyebrow">Choose a PIN (4–8 digits)</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          required
          pattern="\d{4,8}"
          className="pd-field mt-1 tracking-[0.3em]"
        />
      </label>
      <SubmitButton className="pd-btn pd-btn-gold w-full" pendingText="Setting up…">
        Create admin account
      </SubmitButton>
      <Notice state={state} />
    </form>
  )
}
