'use client'

import { useState } from 'react'
import { proposeMarket } from '@/app/polydan/actions'
import { ActionForm, SubmitButton } from './ui'
import { OddsFields, optionLabels } from './OddsFields'

type Kind = 'CUSTOM' | 'H2H' | 'TOP_N'

const KINDS: { key: Kind; label: string; hint: string }[] = [
  { key: 'CUSTOM', label: 'Your question', hint: 'Anything with a clear answer: yes/no, or a few options.' },
  { key: 'H2H', label: 'Head to head', hint: 'Who lasts longer out of two people.' },
  { key: 'TOP_N', label: 'Top finish', hint: 'Will someone finish in the top N?' },
]

/**
 * The player's "suggest a market" form. The server re-checks everything.
 * Fields are controlled so a refused suggestion (a duplicate, a typo in the
 * options) keeps what was typed; they clear only once it's sent.
 */
export function SuggestForm({
  competitors,
  adminName,
}: {
  competitors: { id: number; name: string }[]
  adminName: string
}) {
  const defaultN = String(Math.min(10, Math.max(1, competitors.length - 1)))
  const blank = { question: '', options: 'Yes\nNo', note: '', a: '', b: '', n: defaultN }
  const [kind, setKind] = useState<Kind>('CUSTOM')
  const [v, setV] = useState(blank)
  // The player's projected odds, kept per option so editing the list doesn't shuffle them.
  const [odds, setOdds] = useState<Record<string, string>>({})
  const labels = optionLabels(v.options)
  const oddsValues = labels.map((l) => odds[l] ?? '')
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }))
  const people = competitors.length >= 2

  const pick = (name: 'a' | 'b', label: string) => (
    <label className="block text-sm font-medium">
      {label}
      <select name={name} required value={v[name]} onChange={set(name)} className="pd-field mt-1">
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
    <ActionForm action={proposeMarket} className="space-y-4" onSuccess={() => { setV(blank); setOdds({}) }}>
      <input type="hidden" name="kind" value={kind} />
      <div
        role="tablist"
        aria-label="Kind of market"
        className="grid grid-cols-3 gap-1 rounded-xl bg-pd-surface-2 p-1 text-sm"
      >
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            role="tab"
            aria-selected={kind === k.key}
            disabled={k.key !== 'CUSTOM' && !people}
            onClick={() => setKind(k.key)}
            className={`min-h-10 rounded-lg px-2 font-semibold disabled:opacity-40 ${
              kind === k.key ? 'bg-pd-surface text-pd-ink shadow-sm ring-1 ring-pd-line-strong' : 'text-pd-muted'
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-pd-muted">{KINDS.find((k) => k.key === kind)!.hint}</p>

      {kind === 'CUSTOM' && (
        <>
          <label className="block text-sm font-medium">
            Question
            <input
              name="question"
              required
              maxLength={140}
              autoComplete="off"
              value={v.question}
              onChange={set('question')}
              placeholder="Will anyone fall in the pool?"
              className="pd-field mt-1"
            />
          </label>
          <label className="block text-sm font-medium">
            Options <span className="font-normal text-pd-muted">(one per line)</span>
            <textarea name="options" rows={3} value={v.options} onChange={set('options')} className="pd-field mt-1" />
          </label>
          {labels.length >= 2 && (
            <div className="text-sm font-medium">
              Your odds <span className="font-normal text-pd-muted">(how likely is each one? {adminName} can adjust them)</span>
              <div className="mt-1 font-normal">
                <OddsFields
                  labels={labels}
                  values={oddsValues}
                  onChange={(next) => setOdds(Object.fromEntries(labels.map((l, i) => [l, next[i]])))}
                />
              </div>
              <input type="hidden" name="odds" value={oddsValues.join(',')} />
            </div>
          )}
        </>
      )}
      {kind === 'H2H' && (
        <div className="grid grid-cols-2 gap-3">
          {pick('a', 'First person')}
          {pick('b', 'Second person')}
        </div>
      )}
      {kind === 'TOP_N' && (
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          {pick('a', 'Who')}
          <label className="block text-sm font-medium">
            Top
            <input
              name="n"
              type="number"
              required
              min={1}
              max={Math.max(1, competitors.length - 1)}
              value={v.n}
              onChange={set('n')}
              inputMode="numeric"
              className="pd-field pd-num mt-1"
            />
          </label>
        </div>
      )}

      <label className="block text-sm font-medium">
        How does it get decided? <span className="font-normal text-pd-muted">(optional)</span>
        <input
          name="note"
          maxLength={280}
          autoComplete="off"
          value={v.note}
          onChange={set('note')}
          placeholder="e.g. Steven’s call at the end of the night"
          className="pd-field mt-1"
        />
      </label>
      <SubmitButton className="pd-btn pd-btn-gold w-full sm:w-auto" pendingText="Sending…">
        Send for approval
      </SubmitButton>
    </ActionForm>
  )
}
