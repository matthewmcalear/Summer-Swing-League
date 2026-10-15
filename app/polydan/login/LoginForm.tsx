'use client'

import { useActionState, useState } from 'react'
import { login, setupAdmin, signup } from '../actions'
import { Notice, SubmitButton } from '@/components/polydan/ui'

export function LoginForm({ names }: { names: string[] }) {
  const [state, action] = useActionState(login, {})
  const [name, setName] = useState('')
  const [filter, setFilter] = useState('')
  const shown = names.filter((n) => n.toLowerCase().includes(filter.trim().toLowerCase()))
  return (
    <form action={action} className="pd-card space-y-4 p-5">
      <input type="hidden" name="name" value={name} />
      <div>
        <span className="pd-eyebrow">Who are you? Tap your name</span>
        {names.length > 12 && (
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search names…"
            aria-label="Search names"
            className="pd-field mt-1"
          />
        )}
        {/* Name buttons instead of a dropdown: easier to hit on a phone. */}
        <div className="mt-2 flex max-h-64 flex-wrap gap-1.5 overflow-y-auto">
          {shown.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setName(n)}
              aria-pressed={name === n}
              className={`min-h-10 rounded-full border-[1.5px] px-3.5 text-sm font-medium ${
                name === n ? 'border-pd-gold bg-pd-gold text-pd-on-gold' : 'border-pd-line-strong'
              }`}
            >
              {n}
            </button>
          ))}
          {!shown.length && <p className="text-sm text-pd-muted">No one by that name — try Join instead.</p>}
        </div>
      </div>
      <label className="block">
        <span className="pd-eyebrow">{name ? `PIN for ${name}` : 'PIN'}</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          required
          className="pd-field mt-1 tracking-[0.3em]"
        />
      </label>
      <SubmitButton className="pd-btn pd-btn-gold w-full" pendingText="Checking…" disabled={!name}>
        {name ? `Log in as ${name}` : 'Tap your name first'}
      </SubmitButton>
      <Notice state={state} />
    </form>
  )
}

/** Log in (or switch player) and Join, as two tabs of one card. */
export function AccessForms({ names, startOnJoin }: { names: string[]; startOnJoin?: boolean }) {
  const [mode, setMode] = useState<'login' | 'join'>(startOnJoin ? 'join' : 'login')
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-pd-surface-2 p-1 text-sm">
        {(
          [
            ['login', 'Log in'],
            ['join', 'New here? Join'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`min-h-10 rounded-lg font-semibold ${
              mode === m ? 'bg-pd-surface text-pd-ink shadow-sm ring-1 ring-pd-line-strong' : 'text-pd-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'login' ? <LoginForm names={names} /> : <SignupForm />}
    </div>
  )
}

export function SignupForm() {
  const [state, action] = useActionState(signup, {})
  return (
    <form action={action} className="pd-card space-y-4 p-5">
      <p className="text-sm text-pd-muted">
        Anyone can join — you don&apos;t need to be competing. Your account starts at $0; send Matt money (e.g. an
        e-Transfer) and he&apos;ll add it so you can bet.
      </p>
      <label className="block">
        <span className="pd-eyebrow">Your name</span>
        <input name="name" required minLength={2} maxLength={24} autoComplete="nickname" className="pd-field mt-1" />
        <span className="mt-1 block text-xs text-pd-muted">How the family will see you, e.g. “Auntie Sue” or “Ben S”.</span>
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
      <label className="block">
        <span className="pd-eyebrow">Type it again</span>
        <input
          name="confirm"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          required
          pattern="\d{4,8}"
          className="pd-field mt-1 tracking-[0.3em]"
        />
      </label>
      {/* Bot trap: hidden from people, often filled in by spam scripts. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <SubmitButton className="pd-btn pd-btn-gold w-full" pendingText="Creating…">
        Create my account
      </SubmitButton>
      <Notice state={state} />
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
