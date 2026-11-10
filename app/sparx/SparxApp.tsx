'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import {
  entryValue,
  forecast,
  parseAction,
  parseEntry,
  summarize,
  summarizeRing,
  type Action,
  type Entry,
  type Ledger,
  type Ring,
} from '@/lib/sparx/model'
import { EMPTY_SYNC, LedgerSync, type SyncState } from '@/lib/sparx/sync'

// ── Helpers ──────────────────────────────────────────────────────────────────

function usd(n: number) {
  const v = Math.round(n * 100) / 100
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`
}

const signed = (n: number) => `${n < 0 ? '−' : '+'}${usd(Math.abs(n))}`
const plural = (n: number, word: string) => `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`
const toNumber = (raw: string) => Number(raw.replace(/[$,\s]/g, '') || 'NaN')

function localDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shortDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

function safeStorage(): Storage | null {
  try {
    const s = window.localStorage
    s.getItem('sparx:probe')
    return s
  } catch {
    return null
  }
}

function buzz() {
  try {
    navigator.vibrate?.(8)
  } catch {
    // not supported
  }
}

const noopSubscribe = () => () => {}
const emptySnapshot = () => EMPTY_SYNC

function statusText(s: SyncState) {
  if (s.rejected > 0) return `${plural(s.rejected, 'change')} not saved`
  if (s.unsaved > 0) return s.offline ? `${s.unsaved} waiting for signal` : 'Saving…'
  return s.offline ? 'Offline' : 'Saved'
}

function entryLabel(entry: Entry) {
  if (entry.who === 'others') return 'Paid by others'
  return `${entry.who === 'me' ? 'My own' : 'Free'} · ${plural(entry.uses, 'sharpening')}`
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function SparxApp() {
  const [sync] = useState(() => (typeof window === 'undefined' ? null : new LedgerSync({ storage: safeStorage() })))
  const state = useSyncExternalStore(sync ? sync.subscribe : noopSubscribe, sync ? sync.getSnapshot : emptySnapshot, emptySnapshot)

  useEffect(() => {
    if (!sync) return
    sync.start()
    const wake = () => {
      if (document.visibilityState === 'visible') void sync.refresh()
    }
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('online', wake)
    window.addEventListener('focus', wake)
    return () => {
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('online', wake)
      window.removeEventListener('focus', wake)
      sync.stop()
    }
  }, [sync])

  // The site-wide <head> points "Add to Home Screen" at the golf league. While
  // this page is open, point it here instead.
  useEffect(() => {
    const swap = (selector: string, attr: string, value: string) => {
      const el = document.head.querySelector(selector)
      const old = el?.getAttribute(attr)
      el?.setAttribute(attr, value)
      return () => {
        if (old != null) el?.setAttribute(attr, old)
      }
    }
    const restore = [
      swap('link[rel="manifest"]', 'href', '/sparx/manifest.webmanifest'),
      swap('link[rel="apple-touch-icon"]', 'href', '/sparx/icon-180.png'),
      swap('meta[name="apple-mobile-web-app-title"]', 'content', 'Sparx'),
    ]
    return () => restore.forEach((undo) => undo())
  }, [])

  if (!sync) return <Centered>Loading…</Centered>
  if (state.phase === 'login') return <Login sync={sync} />
  if (!state.ledger) {
    return (
      <Centered>
        {state.phase === 'error' ? (
          <>
            <p>Couldn’t reach the site.</p>
            <button className="sx-primary" onClick={() => void sync.refresh()}>
              Try again
            </button>
          </>
        ) : (
          'Loading…'
        )}
      </Centered>
    )
  }
  return <Tracker ledger={state.ledger} state={state} sync={sync} />
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="sx-center">
      <p className="sx-word">SPARX</p>
      {children}
    </div>
  )
}

function Login({ sync }: { sync: LedgerSync }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError('')
    const result = await sync.login(password)
    if (result === 'ok') return
    setBusy(false)
    setError(result === 'wrong' ? 'That password isn’t right.' : 'Couldn’t reach the site. Try again.')
  }

  return (
    <Centered>
      <form className="sx-login" onSubmit={submit}>
        <label htmlFor="sx-password">Your site admin password. You only enter it once on each phone.</label>
        <input
          id="sx-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p className="sx-error" role="alert">{error}</p>}
        <button className="sx-primary" disabled={busy || !password}>
          {busy ? 'Checking…' : 'Open'}
        </button>
      </form>
    </Centered>
  )
}

// ── Tracker ──────────────────────────────────────────────────────────────────

type SheetState =
  | { kind: 'paid' }
  | { kind: 'own' }
  | { kind: 'free' }
  | { kind: 'saving' }
  | { kind: 'newRing' }
  | { kind: 'ring'; ring: Ring; number: number }
  | { kind: 'entry'; entry: Entry; ring: Ring }

function Tracker({ ledger, state, sync }: { ledger: Ledger; state: SyncState; sync: LedgerSync }) {
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [toast, setToast] = useState<{ text: string; undo?: Action } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const current = ledger.rings[ledger.rings.length - 1]
  const close = () => setSheet(null)

  const showToast = (text: string, undo?: Action) => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ text, undo })
    timer.current = setTimeout(() => setToast(null), undo ? 6000 : 3000)
  }

  /** Validates a change and applies it. False means the numbers weren't usable. */
  const send = (action: Action) => {
    const clean = parseAction(action)
    if (!clean) return false
    sync.dispatch(clean)
    buzz()
    return true
  }

  const logPaid = (amount: number) => {
    const entry: Entry = { id: newId(), who: 'others', amount, date: localDate() }
    if (!send({ type: 'add', ringId: current.id, entry })) return false
    showToast(`Added ${usd(amount)} from others`, { type: 'remove', id: entry.id })
    return true
  }

  const logOwn = (uses: number) => {
    const entry: Entry = { id: newId(), who: 'me', uses, date: localDate() }
    if (!send({ type: 'add', ringId: current.id, entry })) return false
    showToast(`Added ${plural(uses, 'sharpening')}, saved ${usd(uses * ledger.savingPerOwnUse)}`, { type: 'remove', id: entry.id })
    return true
  }

  const logFree = (uses: number) => {
    const entry: Entry = { id: newId(), who: 'free', uses, date: localDate() }
    if (!send({ type: 'add', ringId: current.id, entry })) return false
    showToast(`Added ${plural(uses, 'free sharpening')}`, { type: 'remove', id: entry.id })
    return true
  }

  const paidChips = [1, 2, 3, 4].map((n) => n * ledger.pricePerUse)
  const lastRingCost = [...ledger.rings].reverse().find((r) => r.cost > 0)?.cost ?? 0

  return (
    <>
      <Progress ledger={ledger} status={statusText(state)} />

      <div className="sx-col sx-body">
        <section className="sx-card" aria-label="Log a sharpening">
          <div className="sx-log-head">
            <h2>
              <i className="sx-key sx-key-others" aria-hidden /> Someone paid me
            </h2>
          </div>
          <div className="sx-chips">
            {paidChips.map((amount) => (
              <button key={amount} className="sx-chip" aria-label={`Log ${usd(amount)} from others`} onClick={() => logPaid(amount)}>
                {usd(amount)}
              </button>
            ))}
            <button className="sx-chip sx-chip-other" onClick={() => setSheet({ kind: 'paid' })}>
              Other
            </button>
          </div>

          <div className="sx-log-head sx-log-second">
            <h2>
              <i className="sx-key sx-key-me" aria-hidden /> I sharpened my own
            </h2>
            <button className="sx-link" onClick={() => setSheet({ kind: 'saving' })}>
              saves {usd(ledger.savingPerOwnUse)} each
            </button>
          </div>
          <div className="sx-chips">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} className="sx-chip" aria-label={`Log ${plural(n, 'sharpening')} of my own`} onClick={() => logOwn(n)}>
                {n}
              </button>
            ))}
            <button className="sx-chip sx-chip-other" onClick={() => setSheet({ kind: 'own' })}>
              Other
            </button>
          </div>

          <div className="sx-log-head sx-log-second">
            <h2>
              <i className="sx-key sx-key-free" aria-hidden /> Free sharpenings given
            </h2>
          </div>
          <div className="sx-chips">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} className="sx-chip" aria-label={`Log ${plural(n, 'free sharpening')}`} onClick={() => logFree(n)}>
                {n}
              </button>
            ))}
            <button className="sx-chip sx-chip-other" onClick={() => setSheet({ kind: 'free' })}>
              Other
            </button>
          </div>
        </section>

        <section aria-label="Rings">
          <div className="sx-rings-head">
            <h2>Rings</h2>
            <button className="sx-secondary" onClick={() => setSheet({ kind: 'newRing' })}>
              New ring
            </button>
          </div>
          {[...ledger.rings].reverse().map((ring, i) => {
            const number = ledger.rings.length - i
            return (
              <RingCard
                key={ring.id}
                ring={ring}
                number={number}
                isCurrent={ring === current}
                ledger={ledger}
                onEntry={(entry) => setSheet({ kind: 'entry', entry, ring })}
                onEdit={() => setSheet({ kind: 'ring', ring, number })}
              />
            )
          })}
        </section>
      </div>

      {sheet?.kind === 'paid' && (
        <Sheet title="Someone paid me" onClose={close}>
          <NumberForm label="Amount" prefix="$" decimal submit="Add" onSubmit={(n) => logPaid(n) && (close(), true)} />
        </Sheet>
      )}

      {sheet?.kind === 'own' && (
        <Sheet title="I sharpened my own" onClose={close}>
          <NumberForm label="How many sharpenings" submit="Add" onSubmit={(n) => logOwn(n) && (close(), true)} />
        </Sheet>
      )}

      {sheet?.kind === 'free' && (
        <Sheet title="Free sharpenings given" onClose={close}>
          <NumberForm label="How many sharpenings" submit="Add" onSubmit={(n) => logFree(n) && (close(), true)} />
        </Sheet>
      )}

      {sheet?.kind === 'saving' && (
        <Sheet title="What one of mine saves" onClose={close}>
          <p className="sx-note">What a shop would charge you. Ring wear is already in your costs, so use the full price.</p>
          <NumberForm
            label="Saved per sharpening"
            prefix="$"
            decimal
            initial={String(ledger.savingPerOwnUse)}
            presets={[5, 10]}
            submit="Save"
            onSubmit={(amount) => {
              if (!send({ type: 'setSaving', amount })) return false
              close()
              showToast(`Your own sharpenings now save ${usd(amount)} each`)
              return true
            }}
          />
        </Sheet>
      )}

      {sheet?.kind === 'newRing' && (
        <Sheet title={`Start ring ${ledger.rings.length + 1}`} onClose={close}>
          <p className="sx-note">This adds to what you’ve spent. Everything you log after this goes on the new ring.</p>
          <NumberForm
            label="What the ring cost"
            prefix="$"
            decimal
            initial={lastRingCost ? String(lastRingCost) : ''}
            submit="Start ring"
            onSubmit={(cost) => {
              const id = newId()
              if (!send({ type: 'newRing', id, cost, date: localDate() })) return false
              close()
              showToast(`Ring ${ledger.rings.length + 1} started`, { type: 'removeRing', id })
              return true
            }}
          />
        </Sheet>
      )}

      {sheet?.kind === 'ring' && (
        <Sheet title={`Ring ${sheet.number}`} onClose={close}>
          <NumberForm
            label="What the ring cost"
            prefix="$"
            decimal
            initial={String(sheet.ring.cost)}
            submit="Save"
            onSubmit={(cost) => {
              if (!send({ type: 'editRing', id: sheet.ring.id, cost })) return false
              close()
              return true
            }}
          />
          {sheet.ring.entries.length === 0 && ledger.rings.length > 1 && (
            <button
              className="sx-danger"
              onClick={() => {
                send({ type: 'removeRing', id: sheet.ring.id })
                close()
                showToast(`Ring ${sheet.number} removed`)
              }}
            >
              Remove this ring
            </button>
          )}
        </Sheet>
      )}

      {sheet?.kind === 'entry' && (
        <Sheet title="Edit entry" onClose={close}>
          <EntryForm
            entry={sheet.entry}
            onSave={(entry) => {
              send({ type: 'edit', entry })
              close()
            }}
            onDelete={() => {
              const at = sheet.ring.entries.findIndex((e) => e.id === sheet.entry.id)
              send({ type: 'remove', id: sheet.entry.id })
              close()
              showToast('Entry deleted', { type: 'add', ringId: sheet.ring.id, entry: sheet.entry, at })
            }}
          />
        </Sheet>
      )}

      {toast && (
        <div className="sx-toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              onClick={() => {
                sync.dispatch(toast.undo as Action)
                setToast(null)
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </>
  )
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function Progress({ ledger, status }: { ledger: Ledger; status: string }) {
  const t = summarize(ledger)
  const pct = Math.floor(t.paidOff * 100)
  const f = forecast(ledger)

  let outlook: string
  if (t.toGo <= 0) outlook = t.ahead > 0 ? `Paid off, and ${usd(t.ahead)} ahead.` : 'Paid off.'
  else if (!f) outlook = 'At these numbers, a ring costs more than it brings in.'
  else if (f.newRings === 0) outlook = `About ${plural(f.uses, 'more sharpening')} to go, all on this ring.`
  else outlook = `About ${plural(f.uses, 'more sharpening')} and ${plural(f.newRings, 'more ring')} to pay it off.`

  const label = `${pct}% paid off: ${usd(t.fromOthers)} paid by others, ${usd(t.saved)} saved on my own, ${usd(t.toGo)} to go.`

  return (
    <section className="sx-panel">
      <div className="sx-col">
        <header className="sx-top">
          <h1 className="sx-word">SPARX</h1>
          <span className="sx-status">{status}</span>
        </header>

        <div className="sx-hero">
          <p className="sx-pct">
            {pct}%<span>paid off</span>
          </p>
          <p className="sx-togo">
            {t.toGo > 0 ? usd(t.toGo) : usd(t.ahead)}
            <span>{t.toGo > 0 ? 'to go' : 'ahead'}</span>
          </p>
        </div>

        <div className="sx-bar" role="img" aria-label={label}>
          <Segment who="others" share={t.othersShare} amount={t.fromOthers} name="Paid by others" />
          <Segment who="me" share={t.ownShare} amount={t.saved} name="Saved on my own" />
        </div>

        <ul className="sx-legend">
          <li>
            <i className="sx-key sx-key-others" aria-hidden /> Paid by others
          </li>
          <li>
            <i className="sx-key sx-key-me" aria-hidden /> Saved on my own
          </li>
        </ul>

        <p className="sx-line">
          {usd(t.value)} back of {usd(t.spent)} spent
        </p>
        <p className="sx-line">
          ≈{Math.round(t.uses).toLocaleString('en-US')} sharpenings so far
          {t.freeUses > 0 && `, ${t.freeUses.toLocaleString('en-US')} of them free`}
        </p>
        <p className="sx-line">{outlook}</p>
      </div>
    </section>
  )
}

function Segment({ who, share, amount, name }: { who: 'others' | 'me'; share: number; amount: number; name: string }) {
  if (amount <= 0) return null
  return (
    <div className={`sx-seg sx-seg-${who}`} style={{ width: `${share * 100}%` }} title={`${name}: ${usd(amount)}`}>
      {share >= 0.13 ? usd(amount) : ''}
    </div>
  )
}

// ── Rings ────────────────────────────────────────────────────────────────────

const MIX_LABEL: Record<Entry['who'], string> = { others: 'paid', me: 'mine', free: 'free' }

function RingCard({
  ring,
  number,
  isCurrent,
  ledger,
  onEntry,
  onEdit,
}: {
  ring: Ring
  number: number
  isCurrent: boolean
  ledger: Ledger
  onEntry: (entry: Entry) => void
  onEdit: () => void
}) {
  const s = summarizeRing(ring, ledger)
  // Grouped by kind so a ring reads at a glance. Paid uses are estimated from the money.
  const mix: [Entry['who'], number][] = [
    ['others', Math.round(s.fromOthers / ledger.pricePerUse)],
    ['me', s.ownUses],
    ['free', s.freeUses],
  ]
  const used = mix.reduce((n, [, count]) => n + count, 0)
  const ticks = mix.flatMap(([who, count]) => Array<Entry['who']>(count).fill(who))
  const shown = mix.filter(([, count]) => count > 0)
  const mixText = shown.map(([who, n]) => `${n} ${MIX_LABEL[who]}`).join(', ')

  return (
    <details className="sx-card sx-ring" open={isCurrent}>
      <summary>
        <span className="sx-ring-top">
          <span className="sx-ring-name">
            Ring {number}
            {isCurrent && <em>on the machine</em>}
          </span>
          <span className="sx-ring-net">{signed(s.net)} net</span>
        </span>
        <span className="sx-wear" role="img" aria-label={`About ${used} of ${ledger.usesPerRing} uses${mixText ? `: ${mixText}` : ''}`}>
          {Array.from({ length: ledger.usesPerRing }, (_, i) => (
            <i key={i} className={ticks[i] ? `on-${ticks[i]}` : undefined} />
          ))}
        </span>
        {shown.length > 0 && (
          <span className="sx-ring-mix" aria-hidden>
            {shown.map(([who, n]) => (
              <span key={who}>
                <i className={`sx-key sx-key-${who}`} />
                {n} {MIX_LABEL[who]}
              </span>
            ))}
          </span>
        )}
        <span className="sx-ring-meta">
          ≈{used} of {ledger.usesPerRing} uses · {usd(s.value)} in · {ring.cost > 0 ? `${usd(ring.cost)} ring` : 'came with the machine'}
        </span>
      </summary>

      {ring.entries.length === 0 ? (
        <p className="sx-empty">Nothing logged on this ring yet.</p>
      ) : (
        <ul className="sx-entries">
          {[...ring.entries].reverse().map((entry) => (
            <li key={entry.id}>
              <button onClick={() => onEntry(entry)}>
                <i className={`sx-key sx-key-${entry.who}`} aria-hidden />
                <span className="sx-entry-what">{entryLabel(entry)}</span>
                {entry.date && <span className="sx-entry-date">{shortDate(entry.date)}</span>}
                <span className="sx-entry-value">{usd(entryValue(entry, ledger))}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button className="sx-link sx-ring-edit" onClick={onEdit}>
        Change ring cost
      </button>
    </details>
  )
}

// ── Sheets and forms ─────────────────────────────────────────────────────────

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="sx-sheet"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="sx-sheet-body">
        <header>
          <h2>{title}</h2>
          <button className="sx-close" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}

function NumberForm({
  label,
  prefix,
  decimal,
  initial = '',
  presets,
  submit,
  onSubmit,
}: {
  label: string
  prefix?: string
  decimal?: boolean
  initial?: string
  presets?: number[]
  submit: string
  onSubmit: (value: number) => boolean
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!onSubmit(toNumber(value))) setError('Enter a valid number.')
      }}
    >
      {presets && (
        <div className="sx-presets">
          {presets.map((p) => (
            <button key={p} type="button" className="sx-chip" aria-pressed={toNumber(value) === p} onClick={() => setValue(String(p))}>
              {usd(p)}
            </button>
          ))}
        </div>
      )}
      <label className="sx-field">
        <span>{label}</span>
        <span className="sx-input">
          {prefix && <b aria-hidden>{prefix}</b>}
          <input type="text" inputMode={decimal ? 'decimal' : 'numeric'} value={value} onChange={(e) => setValue(e.target.value)} autoFocus={!presets} />
        </span>
      </label>
      {error && <p className="sx-error" role="alert">{error}</p>}
      <button className="sx-primary">{submit}</button>
    </form>
  )
}

function EntryForm({ entry, onSave, onDelete }: { entry: Entry; onSave: (entry: Entry) => void; onDelete: () => void }) {
  const [who, setWho] = useState(entry.who)
  const [value, setValue] = useState(String(entry.who === 'others' ? entry.amount : entry.uses))
  const [date, setDate] = useState(entry.date ?? '')
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = toNumber(value)
    const base = { id: entry.id, date: date || null }
    const next = parseEntry(who === 'others' ? { ...base, who, amount: n } : { ...base, who, uses: n })
    if (next) onSave(next)
    else setError(who === 'others' ? 'Enter a valid amount.' : 'Enter a whole number.')
  }

  return (
    <form onSubmit={submit}>
      <div className="sx-segmented" role="group" aria-label="Who it was for">
        <button type="button" aria-pressed={who === 'others'} onClick={() => setWho('others')}>
          Paid
        </button>
        <button type="button" aria-pressed={who === 'me'} onClick={() => setWho('me')}>
          Mine
        </button>
        <button type="button" aria-pressed={who === 'free'} onClick={() => setWho('free')}>
          Free
        </button>
      </div>
      <label className="sx-field">
        <span>{who === 'others' ? 'Amount' : 'How many sharpenings'}</span>
        <span className="sx-input">
          {who === 'others' && <b aria-hidden>$</b>}
          <input type="text" inputMode={who === 'others' ? 'decimal' : 'numeric'} value={value} onChange={(e) => setValue(e.target.value)} />
        </span>
      </label>
      <label className="sx-field">
        <span>Date (optional)</span>
        <span className="sx-input">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </span>
      </label>
      {error && <p className="sx-error" role="alert">{error}</p>}
      <button className="sx-primary">Save</button>
      <button type="button" className="sx-danger" onClick={onDelete}>
        Delete entry
      </button>
    </form>
  )
}
