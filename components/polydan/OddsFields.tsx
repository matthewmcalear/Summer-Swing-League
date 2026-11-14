'use client'

import { normaliseOdds } from '@/lib/polydan/marketDefaults'
import { formatMultiple } from '@/lib/polydan/money'

/** Outcome labels from an "options, one per line" box, tidied the way the server tidies them. */
export function optionLabels(text: string): string[] {
  return text
    .split('\n')
    .map((o) => o.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
}

/** Typed percentages as numbers; blanks count as 0, which is never valid. */
export const oddsWeights = (values: string[]) => values.map((v) => Number(v) || 0)

/**
 * One "% chance" box per outcome. Nothing is pre-filled unless the caller
 * passes values: whoever opens a market has to say what they think the odds
 * are. With two outcomes, typing one fills in the other.
 */
export function OddsFields({
  labels,
  values,
  onChange,
}: {
  labels: string[]
  values: string[]
  onChange: (values: string[]) => void
}) {
  const weights = oddsWeights(values)
  const total = weights.reduce((s, w) => s + w, 0)
  const filled = values.every((v) => v !== '')
  const probs = filled ? normaliseOdds(weights) : null
  const set = (i: number, raw: string) => {
    const next = labels.map((_, k) => values[k] ?? '')
    next[i] = raw.replace(/[^0-9.]/g, '')
    const x = Number(next[i])
    if (labels.length === 2 && next[i] !== '' && x > 0 && x < 100) next[1 - i] = String(Math.round((100 - x) * 10) / 10)
    onChange(next)
  }
  return (
    <div className="rounded-lg border border-pd-line">
      <ul className="divide-y divide-pd-line text-sm">
        {labels.map((label, i) => (
          <li key={`${i}-${label}`} className="flex items-center gap-2 px-3 py-1.5">
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <input
              aria-label={`${label}: % chance`}
              value={values[i] ?? ''}
              onChange={(e) => set(i, e.target.value)}
              inputMode="decimal"
              placeholder="?"
              className="pd-field pd-num w-16 px-2 py-0.5 text-right"
            />
            <span className="w-4 text-pd-muted">%</span>
            <span className="pd-num w-16 text-right text-xs text-pd-muted">
              pays {probs ? formatMultiple(probs[i]) : '—'}
            </span>
          </li>
        ))}
      </ul>
      <p className="pd-num border-t border-pd-line px-3 py-1.5 text-xs text-pd-muted">
        {!filled ? (
          'Enter a % chance for every option'
        ) : !probs ? (
          <span className="text-pd-no">Every option needs at least 0.5%</span>
        ) : (
          <>
            Total {Math.round(total * 10) / 10}%{Math.abs(total - 100) > 0.05 && ' (will be scaled to 100%)'}
          </>
        )}
      </p>
    </div>
  )
}
