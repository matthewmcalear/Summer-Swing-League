'use client'

import { useMemo, useState } from 'react'
import { headToHeadProbability, topNProbability, winnerProbabilities } from '@/lib/polydan/history'
import { DEFAULT_LIQUIDITY, normaliseOdds, type MarketKindName } from '@/lib/polydan/marketDefaults'
import { formatMoney, formatMultiple } from '@/lib/polydan/money'
import { ordinalSuffix, parseScale, pointsForPlace } from '@/lib/polydan/copper'
import { ActionForm, ConfirmSubmit, SubmitButton } from '@/components/polydan/ui'
import {
  addEvents,
  deleteEvent,
  moveEvent,
  recordIdol,
  removeIdol,
  resetEverything,
  saveCopperScores,
  setCopperFinal,
  setCopperScale,
  updateEvent,
  addMarket,
  adjustBalance,
  createEdition,
  createUser,
  recordResults,
  resetPin,
  resolveCustom,
  setEditionStatus,
  setField,
  setMarketStatus,
  settleAll,
  settleOne,
  undoLastResult,
  voidOne,
  deleteOne,
} from './actions'

interface Named {
  id: number
  name: string
}

// ---------------------------------------------------------------- results

const CHOICES = {
  IN: [
    ['', 'Still in'],
    ['TO_ISLAND', '🏝 Island'],
    ['OUT', 'Out'],
  ],
  ISLAND: [
    ['', 'On island'],
    ['RETURN', 'Returns'],
    ['OUT', 'Out'],
  ],
} as const

export function ResultsForm({
  editionId,
  nextRound,
  currentRound,
  competitors,
  islandOpen = true,
}: {
  editionId: number
  nextRound: number
  currentRound: number
  competitors: (Named & { status: 'IN' | 'ISLAND' | 'OUT' })[]
  /** False when this round's event has Redemption Island closed. */
  islandOpen?: boolean
}) {
  const [picks, setPicks] = useState<Record<number, string>>({})
  const chosen = Object.values(picks).filter(Boolean).length
  return (
    <ActionForm action={recordResults} className="space-y-4" resetOnSuccess onSuccess={() => setPicks({})}>
      <input type="hidden" name="editionId" value={editionId} />
      <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
        Round
        <input
          name="round"
          type="number"
          inputMode="numeric"
          min={1}
          defaultValue={nextRound}
          key={nextRound}
          className="pd-field pd-num w-20"
        />
        {currentRound > 0 && (
          <span className="text-xs font-normal text-pd-muted">use {currentRound} to add to the last round</span>
        )}
      </label>
      <ul className="grid gap-2 lg:grid-cols-2">
        {competitors.map((c) => (
          <li key={c.id} className="rounded-lg border border-pd-line p-2.5">
            <p className={`mb-2 font-medium ${c.status === 'ISLAND' ? 'text-pd-island' : ''}`}>
              {c.status === 'ISLAND' && '🏝 '}
              {c.name}
              {c.status === 'ISLAND' && <span className="ml-1 text-xs font-normal">on Redemption Island</span>}
            </p>
            {/* Segmented control: large tap targets, the choice is unmistakable. */}
            <div className={`grid gap-1.5 ${!islandOpen && c.status === 'IN' ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {CHOICES[c.status as 'IN' | 'ISLAND']
                .filter(([v]) => islandOpen || v !== 'TO_ISLAND')
                .map(([v, label]) => {
                const on = (picks[c.id] ?? '') === v
                const tone =
                  v === 'OUT'
                    ? on
                      ? 'border-pd-no bg-pd-no text-white'
                      : 'border-pd-no/50 text-pd-no'
                    : v
                      ? on
                        ? 'border-pd-island bg-pd-island text-white'
                        : 'border-pd-island/50 text-pd-island'
                      : on
                        ? 'border-pd-line-strong bg-pd-surface-2 text-pd-ink'
                        : 'border-pd-line text-pd-muted'
                return (
                  <label
                    key={v}
                    className={`flex min-h-10 cursor-pointer items-center justify-center rounded-md border-[1.5px] px-2 text-sm font-semibold ${tone}`}
                  >
                    <input
                      type="radio"
                      name={`r_${c.id}`}
                      value={v}
                      checked={on}
                      onChange={() => setPicks((p) => ({ ...p, [c.id]: v }))}
                      className="sr-only"
                    />
                    {label}
                  </label>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-20 z-10 -mx-2 rounded-xl bg-pd-surface/95 p-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <SubmitButton className="pd-btn pd-btn-gold w-full sm:w-auto" disabled={!chosen} pendingText="Saving…">
          {chosen ? `Record ${chosen} result${chosen === 1 ? '' : 's'} for round` : 'Pick who lost this round'}
        </SubmitButton>
      </div>
    </ActionForm>
  )
}

export function UndoForm({ editionId }: { editionId: number }) {
  return (
    <ActionForm action={undoLastResult}>
      <input type="hidden" name="editionId" value={editionId} />
      <ConfirmSubmit
        className="pd-btn pd-btn-danger pd-btn-sm"
        question="Undo the most recent result?"
        confirmLabel="Yes, undo"
        pendingText="Undoing…"
      >
        Undo last
      </ConfirmSubmit>
    </ActionForm>
  )
}

// ---------------------------------------------------------------- markets

export function NewMarketForm({
  editionId,
  competitors,
  hasWinner,
}: {
  editionId: number
  competitors: Named[]
  hasWinner: boolean
}) {
  const [kind, setKind] = useState<MarketKindName>(hasWinner ? 'H2H' : 'WINNER')
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [who, setWho] = useState('')
  const [n, setN] = useState('5')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState('Yes\nNo')
  const [liquidity, setLiquidity] = useState('')
  const nameOf = (id: string) => competitors.find((c) => String(c.id) === id)?.name

  // Outcomes in the same order the server creates them, with history-based odds.
  const suggested = useMemo((): { label: string; p: number }[] => {
    if (kind === 'WINNER' || kind === 'COPPER') {
      const p = winnerProbabilities(competitors.map((c) => c.name))
      return competitors.map((c, i) => ({ label: c.name, p: p[i] }))
    }
    if (kind === 'H2H') {
      const [an, bn] = [nameOf(a), nameOf(b)]
      if (!an || !bn || a === b) return []
      const p = headToHeadProbability(an, bn)
      return [
        { label: an, p },
        { label: bn, p: 1 - p },
      ]
    }
    if (kind === 'TOP_N') {
      const name = nameOf(who)
      const top = Number(n)
      if (!name || !(top >= 1 && top < competitors.length)) return []
      const p = topNProbability(name, top, competitors.length)
      return [
        { label: 'Yes', p },
        { label: 'No', p: 1 - p },
      ]
    }
    const opts = options.split('\n').map((o) => o.trim()).filter(Boolean)
    return opts.length >= 2 ? opts.map((label) => ({ label, p: 1 / opts.length })) : []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, a, b, who, n, options, competitors])

  // Edits are kept only while the outcome list stays the same.
  const signature = `${kind}|${suggested.map((o) => o.label).join('|')}|${n}`
  const [edits, setEdits] = useState<{ sig: string; values: string[] }>({ sig: '', values: [] })
  const values =
    edits.sig === signature ? edits.values : suggested.map((o) => (Math.round(o.p * 1000) / 10).toString())
  const edited = edits.sig === signature
  const setValue = (i: number, v: string) => {
    const next = values.slice()
    next[i] = v.replace(/[^0-9.]/g, '')
    setEdits({ sig: signature, values: next })
  }
  const weights = values.map(Number)
  const total = weights.reduce((s, w) => s + (Number.isFinite(w) ? w : 0), 0)
  const probs = normaliseOdds(weights)
  const liq = Number(liquidity) || DEFAULT_LIQUIDITY[kind]
  const worstCase = probs ? liq * Math.log(1 / Math.min(...probs)) : null

  const pick = (value: string, set: (v: string) => void, label: string) => (
    <label className="block text-sm">
      {label}
      <select value={value} onChange={(e) => set(e.target.value)} required className="pd-field mt-1">
        <option value="" disabled>
          Pick…
        </option>
        {competitors.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <ActionForm
      action={addMarket}
      className="space-y-3"
      onSuccess={() => {
        setA('')
        setB('')
        setWho('')
        setQuestion('')
        setEdits({ sig: '', values: [] })
      }}
    >
      <input type="hidden" name="editionId" value={editionId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="a" value={a} />
      <input type="hidden" name="b" value={b} />
      <input type="hidden" name="competitorId" value={who} />
      <input type="hidden" name="n" value={n} />
      <input type="hidden" name="question" value={question} />
      <input type="hidden" name="options" value={options} />
      <input type="hidden" name="liquidity" value={liquidity} />
      <input
        type="hidden"
        name="odds"
        value={edited ? JSON.stringify(Object.fromEntries(suggested.map((o, i) => [o.label, weights[i]]))) : ''}
      />

      <div className="grid grid-cols-2 gap-1 text-sm">
        {(
          [
            ['WINNER', 'Winner'],
            ['H2H', 'Head to head'],
            ['TOP_N', 'Top N'],
            ['CUSTOM', 'Custom'],
            ['COPPER', 'Copper Cup'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-md border px-2 py-1.5 ${
              kind === k ? 'border-pd-gold bg-pd-surface-2 font-semibold' : 'border-pd-line text-pd-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {kind === 'WINNER' && hasWinner && <p className="text-sm text-pd-no">There’s already a winner market.</p>}
      {kind === 'COPPER' && (
        <p className="text-sm text-pd-muted">
          One outcome per competitor; pays out the most Copper Cup points once you click Finalize Copper Cup (Results
          tab). Ties split.
        </p>
      )}
      {kind === 'H2H' && (
        <>
          {pick(a, setA, 'Who lasts longer…')}
          {pick(b, setB, '…versus')}
        </>
      )}
      {kind === 'TOP_N' && (
        <>
          {pick(who, setWho, 'Competitor')}
          <label className="block text-sm">
            Finishes in the top
            <input value={n} onChange={(e) => setN(e.target.value)} type="number" min={1} className="pd-field mt-1 pd-num" />
          </label>
        </>
      )}
      {kind === 'CUSTOM' && (
        <>
          <label className="block text-sm">
            Question
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              placeholder="Will anyone podium off Redemption Island?"
              className="pd-field mt-1"
            />
          </label>
          <label className="block text-sm">
            Options (one per line)
            <textarea value={options} onChange={(e) => setOptions(e.target.value)} rows={3} className="pd-field mt-1" />
          </label>
        </>
      )}

      {suggested.length > 0 && (
        <div className="rounded-lg border border-pd-line">
          <div className="flex items-center justify-between border-b border-pd-line px-3 py-2">
            <span className="pd-eyebrow">Opening odds</span>
            {edited ? (
              <button
                type="button"
                className="text-xs text-pd-gold hover:underline"
                onClick={() => setEdits({ sig: '', values: [] })}
              >
                Reset to {kind === 'CUSTOM' ? 'even' : 'history'}
              </button>
            ) : (
              <span className="text-xs text-pd-muted">{kind === 'CUSTOM' ? 'even split' : 'from history'}</span>
            )}
          </div>
          <ul className="max-h-72 divide-y divide-pd-line overflow-y-auto text-sm">
            {suggested.map((o, i) => (
              <li key={o.label} className="flex items-center gap-2 px-3 py-1">
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                <input
                  aria-label={`${o.label} opening %`}
                  value={values[i] ?? ''}
                  onChange={(e) => setValue(i, e.target.value)}
                  inputMode="decimal"
                  className="pd-field w-16 px-2 py-0.5 text-right pd-num"
                />
                <span className="w-4 text-pd-muted">%</span>
                <span className="w-16 text-right text-xs text-pd-muted pd-num">
                  pays {probs ? formatMultiple(probs[i]) : '—'}
                </span>
              </li>
            ))}
          </ul>
          <div className="space-y-0.5 border-t border-pd-line px-3 py-2 text-xs text-pd-muted pd-num">
            <p>
              Total {edited ? Math.round(total * 10) / 10 : 100}%
              {edited && probs && Math.abs(total - 100) > 0.05 && ' — will be scaled to 100%'}
              {!probs && <span className="text-pd-no"> — every outcome needs at least 0.5%</span>}
            </p>
            {worstCase != null && <p>House worst case ≈ {formatMoney(Math.round(worstCase * 100))}</p>}
          </div>
        </div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-pd-muted">Liquidity</summary>
        <label className="mt-2 block">
          <input
            value={liquidity}
            onChange={(e) => setLiquidity(e.target.value)}
            type="number"
            min={5}
            max={1000}
            placeholder={`${DEFAULT_LIQUIDITY[kind]} (default)`}
            className="pd-field pd-num"
          />
        </label>
        <p className="mt-1 text-xs text-pd-muted">
          Higher = odds move less per bet, but a bigger house worst case if a long shot comes in.
        </p>
      </details>
      <SubmitButton pendingText="Opening…" disabled={!suggested.length || !probs}>
        Open market
      </SubmitButton>
    </ActionForm>
  )
}

export function MarketActions({
  market,
  editionId,
}: {
  editionId: number
  market: {
    id: number
    kind: string
    status: string
    resolved: boolean
    hasBets: boolean
    outcomes: { id: number; label: string }[]
  }
}) {
  if (market.status === 'SETTLED') return null
  const id = <input type="hidden" name="marketId" value={market.id} />
  const live = market.status !== 'VOID'
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-start">
      {live && market.resolved && (
        <ActionForm action={settleOne} className="col-span-2 sm:col-span-1">
          {id}
          <SubmitButton className="pd-btn pd-btn-gold w-full" pendingText="Paying…">
            Settle & pay out
          </SubmitButton>
        </ActionForm>
      )}
      {live && !market.resolved && (
        <ActionForm action={setMarketStatus}>
          {id}
          <input type="hidden" name="status" value={market.status === 'OPEN' ? 'CLOSED' : 'OPEN'} />
          <SubmitButton className="pd-btn pd-btn-ghost w-full" pendingText="…">
            {market.status === 'OPEN' ? 'Pause trading' : 'Reopen trading'}
          </SubmitButton>
        </ActionForm>
      )}
      {live && market.kind === 'CUSTOM' && (
        <ActionForm action={resolveCustom} className="col-span-2 flex gap-2 sm:col-span-1">
          {id}
          <select name="outcomeId" className="pd-field min-w-0 flex-1 sm:w-auto" defaultValue="">
            <option value="">No result yet</option>
            {market.outcomes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} wins
              </option>
            ))}
          </select>
          <SubmitButton className="pd-btn pd-btn-ghost" pendingText="…">
            Set result
          </SubmitButton>
        </ActionForm>
      )}
      {live && (
        <ActionForm action={voidOne} className="contents sm:block">
          {id}
          <ConfirmSubmit
            className="pd-btn pd-btn-danger w-full"
            question="Void it and refund everyone's stakes? It stays listed as void."
            confirmLabel="Yes, void"
            pendingText="Voiding…"
          >
            Void
          </ConfirmSubmit>
        </ActionForm>
      )}
      <ActionForm action={deleteOne} className="contents sm:block">
        {id}
        <input type="hidden" name="editionId" value={editionId} />
        <ConfirmSubmit
          className="pd-btn pd-btn-danger w-full"
          question={
            live && market.hasBets
              ? 'Delete it? Everyone who bet gets their stake back, then it disappears.'
              : 'Delete this market for good?'
          }
          confirmLabel="Yes, delete"
          pendingText="Deleting…"
        >
          Delete
        </ConfirmSubmit>
      </ActionForm>
    </div>
  )
}

export function SettleAllForm({ editionId, disabled }: { editionId: number; disabled: boolean }) {
  return (
    <ActionForm action={settleAll} className="w-full sm:w-auto">
      <input type="hidden" name="editionId" value={editionId} />
      <ConfirmSubmit
        className="pd-btn pd-btn-gold w-full sm:w-auto"
        confirmClassName="pd-btn pd-btn-gold"
        question="Pay out every market that has a result?"
        confirmLabel="Yes, pay out"
        pendingText="Paying out…"
        disabled={disabled}
      >
        Settle all decided
      </ConfirmSubmit>
    </ActionForm>
  )
}

// ---------------------------------------------------------------- players

export function CreateUserForm() {
  return (
    <ActionForm action={createUser} className="space-y-3" resetOnSuccess>
      <label className="block text-sm font-medium">
        Name
        <input name="name" required autoComplete="off" className="pd-field mt-1" />
      </label>
      <label className="block text-sm font-medium">
        PIN (4–8 digits)
        <input name="pin" required inputMode="numeric" pattern="\d{4,8}" autoComplete="off" className="pd-field pd-num mt-1" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isAdmin" className="size-4" /> Admin (can run PolyDan)
      </label>
      <SubmitButton className="pd-btn pd-btn-gold w-full">Add player</SubmitButton>
    </ActionForm>
  )
}

export function BalanceForm({ userId }: { userId: number }) {
  return (
    <ActionForm action={adjustBalance} className="space-y-2" resetOnSuccess>
      <p className="text-sm font-medium">Add or cash out money</p>
      <input type="hidden" name="userId" value={userId} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[7rem_9rem_1fr_auto]">
        <input name="amount" inputMode="decimal" placeholder="$ amount" required className="pd-field pd-num" />
        <select name="kind" className="pd-field" defaultValue="DEPOSIT">
          <option value="DEPOSIT">Credit</option>
          <option value="WITHDRAWAL">Cash out</option>
        </select>
        <input name="note" placeholder="Note (e.g. e-Transfer)" className="pd-field col-span-2 sm:col-span-1" />
        <SubmitButton className="pd-btn pd-btn-gold col-span-2 sm:col-span-1" pendingText="Saving…">
          Apply
        </SubmitButton>
      </div>
    </ActionForm>
  )
}

export function ResetPinForm({ userId }: { userId: number }) {
  return (
    <ActionForm action={resetPin} className="space-y-2" resetOnSuccess>
      <p className="text-sm font-medium">Reset PIN</p>
      <input type="hidden" name="userId" value={userId} />
      <div className="flex gap-2">
        <input name="pin" placeholder="New PIN" inputMode="numeric" required className="pd-field pd-num w-32" />
        <SubmitButton className="pd-btn pd-btn-ghost" pendingText="…">
          Reset PIN
        </SubmitButton>
      </div>
    </ActionForm>
  )
}

// ---------------------------------------------------------------- edition

export function CreateEditionForm({ nextNumber }: { nextNumber: number }) {
  return (
    <ActionForm action={createEdition} className="space-y-3">
      <label className="block text-sm font-medium">
        Edition #
        <input name="number" type="number" inputMode="numeric" defaultValue={nextNumber} className="pd-field pd-num mt-1" />
      </label>
      <label className="block text-sm font-medium">
        Date
        <input name="date" type="date" className="pd-field mt-1" />
      </label>
      <SubmitButton className="pd-btn pd-btn-gold w-full">Create edition</SubmitButton>
    </ActionForm>
  )
}

export function EditionStatusForm({ editionId, status }: { editionId: number; status: string }) {
  return (
    <ActionForm action={setEditionStatus} className="w-full space-y-1 sm:w-auto">
      <input type="hidden" name="editionId" value={editionId} />
      <span className="block text-sm font-medium">Status</span>
      <div className="flex gap-2">
        <select name="status" defaultValue={status} className="pd-field min-w-0 flex-1 sm:w-40 sm:flex-none">
          <option value="SETUP">Coming up</option>
          <option value="LIVE">Live</option>
          <option value="FINISHED">Finished</option>
        </select>
        <SubmitButton className="pd-btn pd-btn-ghost" pendingText="…">
          Save status
        </SubmitButton>
      </div>
    </ActionForm>
  )
}

export function FieldForm({
  editionId,
  competitors,
  selected,
  locked,
}: {
  editionId: number
  competitors: Named[]
  selected: number[]
  locked: boolean
}) {
  const [picked, setPicked] = useState(new Set(selected))
  return (
    <ActionForm action={setField} className="space-y-3">
      <input type="hidden" name="editionId" value={editionId} />
      {locked ? (
        <p className="rounded-lg bg-pd-surface-2 p-3 text-sm">
          🔒 The field is locked because markets or results exist for this edition.
        </p>
      ) : (
        <p className="text-sm text-pd-muted">Tick everyone competing, then save.</p>
      )}
      <fieldset disabled={locked} className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
        {competitors.map((c) => (
          <label
            key={c.id}
            className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border-[1.5px] px-2.5 text-sm ${
              picked.has(c.id) ? 'border-pd-gold bg-pd-surface-2 font-medium' : 'border-pd-line'
            } ${locked ? 'cursor-default opacity-70' : ''}`}
          >
            <input
              type="checkbox"
              name="competitorId"
              value={c.id}
              checked={picked.has(c.id)}
              className="size-4 accent-[var(--pd-gold)]"
              onChange={(e) => {
                const next = new Set(picked)
                if (e.target.checked) next.add(c.id)
                else next.delete(c.id)
                setPicked(next)
              }}
            />
            {c.name}
          </label>
        ))}
      </fieldset>
      {!locked && (
        <>
          <label className="block text-sm font-medium">
            New competitors (comma or one per line)
            <textarea name="newNames" rows={2} className="pd-field mt-1" />
          </label>
          <div className="sticky bottom-20 z-10 -mx-2 rounded-xl bg-pd-surface/95 p-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <SubmitButton className="pd-btn pd-btn-gold w-full sm:w-auto" pendingText="Saving…">
              Save field ({picked.size} selected)
            </SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  )
}

// ---------------------------------------------------------------- events

export interface EventRow {
  id: number
  seq: number
  name: string
  description: string | null
  islandOpen: boolean
  copperCup: boolean
  revealed: boolean
}

export function AddEventsForm({ editionId, count }: { editionId: number; count: number }) {
  return (
    <ActionForm action={addEvents} className="space-y-2" resetOnSuccess>
      <input type="hidden" name="editionId" value={editionId} />
      <label className="block text-sm font-medium">
        {count ? 'Add more events' : 'Paste Steven’s events, one per line, in order'}
        <textarea
          name="events"
          rows={count ? 2 : 6}
          placeholder={'Trivia — buzzer round\nMini golf\nBlindfolded Jenga'}
          className="pd-field mt-1 font-mono text-sm"
        />
      </label>
      <p className="text-xs text-pd-muted">
        Optional description after a dash: “Mini golf — 9 holes, lowest wins”. Then set Redemption Island and Copper Cup
        for each below. Only event 1 starts visible to everyone.
      </p>
      <SubmitButton className="pd-btn pd-btn-gold w-full sm:w-auto" pendingText="Adding…">
        Add events
      </SubmitButton>
    </ActionForm>
  )
}

export function EventEditor({ event, isFirst, isLast }: { event: EventRow; isFirst: boolean; isLast: boolean }) {
  const id = <input type="hidden" name="eventId" value={event.id} />
  return (
    <li className={`rounded-lg border-[1.5px] p-3 ${event.revealed ? 'border-pd-line-strong' : 'border-dashed border-pd-line'}`}>
      <ActionForm action={updateEvent} className="space-y-2">
        {id}
        <div className="flex items-center gap-2">
          <span className="pd-num w-7 shrink-0 text-center font-pd-display text-lg font-semibold text-pd-gold">{event.seq}</span>
          <input name="name" defaultValue={event.name} required className="pd-field min-w-0 flex-1 font-medium" aria-label="Event name" />
        </div>
        <input
          name="description"
          defaultValue={event.description ?? ''}
          placeholder="Description (optional)"
          className="pd-field text-sm"
          aria-label="Event description"
        />
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Check name="islandOpen" defaultChecked={event.islandOpen} label="🏝 Redemption Island open" />
          <Check name="copperCup" defaultChecked={event.copperCup} label="🥉 Copper Cup event" />
          <Check name="revealed" defaultChecked={event.revealed} label="👁 Revealed to everyone" />
        </div>
        <SubmitButton className="pd-btn pd-btn-ghost pd-btn-sm" pendingText="Saving…">
          Save event {event.seq}
        </SubmitButton>
      </ActionForm>
      <div className="mt-2 flex flex-wrap gap-2 border-t border-pd-line pt-2">
        {!isFirst && (
          <ActionForm action={moveEvent}>
            {id}
            <input type="hidden" name="dir" value="up" />
            <SubmitButton className="pd-btn pd-btn-ghost pd-btn-sm" pendingText="…">
              ↑ Move up
            </SubmitButton>
          </ActionForm>
        )}
        {!isLast && (
          <ActionForm action={moveEvent}>
            {id}
            <input type="hidden" name="dir" value="down" />
            <SubmitButton className="pd-btn pd-btn-ghost pd-btn-sm" pendingText="…">
              ↓ Move down
            </SubmitButton>
          </ActionForm>
        )}
        <ActionForm action={deleteEvent} className="ml-auto">
          {id}
          <ConfirmSubmit
            className="pd-btn pd-btn-danger pd-btn-sm"
            question={`Delete “${event.name}”? Later events move up one.`}
            confirmLabel="Yes, delete"
            pendingText="…"
          >
            Delete
          </ConfirmSubmit>
        </ActionForm>
      </div>
    </li>
  )
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-[var(--pd-gold)]" />
      {label}
    </label>
  )
}

// ------------------------------------------------------------ copper cup

export function CopperScoresForm({
  event,
  competitors,
  places,
  scale,
  locked,
}: {
  event: { id: number; seq: number; name: string }
  competitors: Named[]
  places: Record<number, number>
  scale: string
  locked: boolean
}) {
  const points = parseScale(scale) ?? []
  const [typed, setTyped] = useState<Record<number, string>>(() =>
    Object.fromEntries(competitors.map((c) => [c.id, places[c.id] ? String(places[c.id]) : ''])),
  )
  return (
    <ActionForm action={saveCopperScores} className="space-y-3">
      <input type="hidden" name="eventId" value={event.id} />
      <p className="text-xs text-pd-muted">Type each person&apos;s finishing place (1, 2, 3…). Leave blank if they didn&apos;t place.</p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {competitors.map((c) => {
          const place = Number(typed[c.id])
          const pts = typed[c.id] ? pointsForPlace(points, place) : null
          return (
            <li key={c.id}>
              <label className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <input
                  name={`place_${c.id}`}
                  value={typed[c.id] ?? ''}
                  onChange={(e) => setTyped((t) => ({ ...t, [c.id]: e.target.value.replace(/[^0-9]/g, '') }))}
                  inputMode="numeric"
                  disabled={locked}
                  placeholder="place"
                  className="pd-field pd-num w-20 text-center"
                  aria-label={`${c.name} place`}
                />
                <span className="pd-num w-14 text-right text-xs text-pd-muted">
                  {pts != null && Number.isInteger(place) && place > 0 ? `${place}${ordinalSuffix(place)} · ${pts}` : ''}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      {!locked && (
        <SubmitButton className="pd-btn pd-btn-gold w-full sm:w-auto" pendingText="Saving…">
          Save places for event {event.seq}
        </SubmitButton>
      )}
    </ActionForm>
  )
}

export function CopperScaleForm({ editionId, scale, locked }: { editionId: number; scale: string; locked: boolean }) {
  return (
    <ActionForm action={setCopperScale} className="space-y-1">
      <input type="hidden" name="editionId" value={editionId} />
      <label className="block text-sm font-medium">
        Points for 1st, 2nd, 3rd… (everyone after gets 0)
        <span className="mt-1 flex gap-2">
          <input name="scale" defaultValue={scale.split(',').join(', ')} disabled={locked} className="pd-field pd-num min-w-0 flex-1" />
          {!locked && (
            <SubmitButton className="pd-btn pd-btn-ghost" pendingText="…">
              Save scale
            </SubmitButton>
          )}
        </span>
      </label>
    </ActionForm>
  )
}

export function CopperFinalForm({ editionId, final }: { editionId: number; final: boolean }) {
  return (
    <ActionForm action={setCopperFinal}>
      <input type="hidden" name="editionId" value={editionId} />
      <input type="hidden" name="final" value={final ? 'false' : 'true'} />
      {final ? (
        <SubmitButton className="pd-btn pd-btn-ghost" pendingText="…">
          Reopen Copper Cup
        </SubmitButton>
      ) : (
        <ConfirmSubmit
          className="pd-btn pd-btn-gold w-full sm:w-auto"
          confirmClassName="pd-btn pd-btn-gold"
          question="Lock the Copper Cup points as final? Its market can then pay out."
          confirmLabel="Yes, finalize"
          pendingText="…"
        >
          Finalize Copper Cup
        </ConfirmSubmit>
      )}
    </ActionForm>
  )
}

// ---------------------------------------------------------- immunity idol

export function IdolForm({ editionId, competitors, round }: { editionId: number; competitors: Named[]; round: number }) {
  return (
    <ActionForm action={recordIdol} className="space-y-2" resetOnSuccess>
      <input type="hidden" name="editionId" value={editionId} />
      <div className="grid grid-cols-2 gap-2">
        <select name="competitorId" required defaultValue="" className="pd-field" aria-label="Who">
          <option value="" disabled>
            Who?
          </option>
          {competitors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="kind" defaultValue="FOUND" className="pd-field" aria-label="What happened">
          <option value="FOUND">found the idol</option>
          <option value="PLAYED">played the idol</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        in round
        <input name="round" type="number" inputMode="numeric" min={1} defaultValue={round} className="pd-field pd-num w-20" />
      </label>
      <SubmitButton className="pd-btn pd-btn-gold w-full sm:w-auto" pendingText="Saving…">
        Record idol
      </SubmitButton>
    </ActionForm>
  )
}

export function RemoveIdolForm({ idolId }: { idolId: number }) {
  return (
    <ActionForm action={removeIdol}>
      <input type="hidden" name="idolId" value={idolId} />
      <ConfirmSubmit className="pd-btn pd-btn-danger pd-btn-sm" question="Remove this idol entry?" confirmLabel="Remove">
        Remove
      </ConfirmSubmit>
    </ActionForm>
  )
}

// ------------------------------------------------------------ hard reset

export function ResetForm() {
  const [typed, setTyped] = useState('')
  return (
    <ActionForm action={resetEverything} className="space-y-2">
      <label className="block text-sm font-medium">
        Type <span className="font-mono font-bold">RESET</span> to enable the button
        <input
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          className="pd-field mt-1 font-mono"
        />
      </label>
      <SubmitButton className="pd-btn pd-btn-danger-solid w-full sm:w-auto" disabled={typed !== 'RESET'} pendingText="Resetting…">
        Reset all PolyDan data
      </SubmitButton>
    </ActionForm>
  )
}
