// Player-suggested markets: validation and the market each one becomes.
// Pure functions, shared by the player's "Suggest" form action and the
// admin's approve action (which may edit a custom question's wording).

import type { MarketSpec } from './createMarket'
import { normaliseOdds } from './marketDefaults'

export type ProposalKind = 'CUSTOM' | 'H2H' | 'TOP_N'

export interface ProposalDraft {
  kind: ProposalKind
  question: string | null
  options: string[]
  a: number | null
  b: number | null
  topN: number | null
  note: string | null
  /** The player's projected chance of each option, in % (same order as options). CUSTOM only. */
  odds: number[] | null
}

export const MAX_PENDING_PER_PLAYER = 5
const MAX_QUESTION = 140
const MAX_OPTION = 40
const MAX_OPTIONS = 8
const MAX_NOTE = 280

/** Tidies and checks a custom question and its options. Throws a readable error. */
export function cleanCustom(questionRaw: string, optionsRaw: string): { question: string; options: string[] } {
  const question = questionRaw.trim().replace(/\s+/g, ' ')
  if (question.length < 5) throw new Error('Write the question')
  if (question.length > MAX_QUESTION) throw new Error(`Keep the question under ${MAX_QUESTION} characters`)
  const options = optionsRaw
    .split('\n')
    .map((o) => o.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
  if (options.length < 2) throw new Error('Give at least two options (one per line)')
  if (options.length > MAX_OPTIONS) throw new Error(`At most ${MAX_OPTIONS} options`)
  if (options.some((o) => o.length > MAX_OPTION)) throw new Error(`Keep each option under ${MAX_OPTION} characters`)
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length)
    throw new Error('Options must all be different')
  return { question, options }
}

/**
 * The player's projected odds, one percentage per option. Every option needs
 * one (there is no even-split default); they're scaled to total 100%.
 */
export function cleanOdds(raw: string, count: number): number[] {
  const parts = raw.split(',').map((x) => x.trim())
  if (parts.length !== count || parts.some((x) => x === ''))
    throw new Error('Enter the odds: your best guess at the % chance of each option')
  const p = normaliseOdds(parts.map(Number))
  if (!p) throw new Error('Each option needs a chance of at least 0.5%')
  return p.map((x) => Math.round(x * 1000) / 10)
}

// The projected odds ride along in the stored options list as one tagged
// trailing entry, so they need no database change.
const ODDS_TAG = '\u0001odds:'

export function packOptions(options: string[], odds: number[] | null): string[] {
  return odds ? [...options, ODDS_TAG + odds.join(',')] : options
}

export function unpackOptions(stored: string[]): { options: string[]; odds: number[] | null } {
  const options = stored.filter((o) => !o.startsWith(ODDS_TAG))
  const tagged = stored.find((o) => o.startsWith(ODDS_TAG))
  const odds = tagged ? tagged.slice(ODDS_TAG.length).split(',').map(Number) : null
  return { options, odds: odds && odds.length === options.length && odds.every((x) => x > 0) ? odds : null }
}

export function cleanNote(raw: string): string | null {
  const note = raw.trim().replace(/\s+/g, ' ')
  if (note.length > MAX_NOTE) throw new Error(`Keep the note under ${MAX_NOTE} characters`)
  return note || null
}

/**
 * Builds a validated draft from the suggest form. `field` is the edition's
 * competitor ids; head-to-heads and top-N picks must come from it.
 */
export function draftFromForm(get: (k: string) => string, field: number[]): ProposalDraft {
  const kind = get('kind') as ProposalKind
  const note = cleanNote(get('note'))
  const inField = (id: number) => Number.isInteger(id) && field.includes(id)
  if (kind === 'CUSTOM') {
    const { question, options } = cleanCustom(get('question'), get('options'))
    const odds = cleanOdds(get('odds'), options.length)
    return { kind, question, options, a: null, b: null, topN: null, note, odds }
  }
  if (field.length < 2) throw new Error('The field for this Iron Man isn’t set yet')
  if (kind === 'H2H') {
    const a = Number(get('a'))
    const b = Number(get('b'))
    if (!inField(a) || !inField(b)) throw new Error('Pick two people from the field')
    if (a === b) throw new Error('Pick two different people')
    return { kind, question: null, options: [], a, b, topN: null, note, odds: null }
  }
  if (kind === 'TOP_N') {
    const a = Number(get('a'))
    const n = Number(get('n'))
    if (!inField(a)) throw new Error('Pick someone from the field')
    if (!Number.isInteger(n) || n < 1 || n >= field.length)
      throw new Error(`Top N must be between 1 and ${field.length - 1}`)
    return { kind, question: null, options: [], a, b: null, topN: n, note, odds: null }
  }
  throw new Error('Pick what kind of market it is')
}

/** The market a suggestion opens as. */
export function specFor(d: Pick<ProposalDraft, 'kind' | 'question' | 'options' | 'a' | 'b' | 'topN'>): MarketSpec {
  if (d.kind === 'CUSTOM') return { kind: 'CUSTOM', question: d.question ?? '', options: d.options }
  if (d.kind === 'H2H') return { kind: 'H2H', a: d.a!, b: d.b! }
  return { kind: 'TOP_N', competitorId: d.a!, n: d.topN! }
}

/** A one-line description for lists, e.g. "Jack vs Megan: who lasts longer?". */
export function describeDraft(
  d: Pick<ProposalDraft, 'kind' | 'question' | 'a' | 'b' | 'topN'>,
  nameOf: (id: number) => string,
): string {
  if (d.kind === 'CUSTOM') return d.question ?? ''
  if (d.kind === 'H2H') return `${nameOf(d.a!)} vs ${nameOf(d.b!)}: who lasts longer?`
  return d.topN === 1 ? `Will ${nameOf(d.a!)} win?` : `Will ${nameOf(d.a!)} finish top ${d.topN}?`
}

/** Same market already exists or is already suggested? Compares by what it asks. */
export function sameMarket(
  x: Pick<ProposalDraft, 'kind' | 'question' | 'a' | 'b' | 'topN'>,
  y: Pick<ProposalDraft, 'kind' | 'question' | 'a' | 'b' | 'topN'>,
): boolean {
  if (x.kind !== y.kind) return false
  if (x.kind === 'CUSTOM') return (x.question ?? '').toLowerCase() === (y.question ?? '').toLowerCase()
  if (x.kind === 'H2H') return (x.a === y.a && x.b === y.b) || (x.a === y.b && x.b === y.a)
  return x.a === y.a && x.topN === y.topN
}
