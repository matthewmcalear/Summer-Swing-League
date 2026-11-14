import { describe, expect, it } from 'vitest'
import { cleanCustom, cleanOdds, describeDraft, draftFromForm, packOptions, sameMarket, specFor, unpackOptions } from './proposals'

const form = (v: Record<string, string>) => (k: string) => v[k] ?? ''
const FIELD = [1, 2, 3, 4]
const names: Record<number, string> = { 1: 'Jack', 2: 'Megan', 3: 'Jody', 4: 'Dan' }

describe('cleanCustom', () => {
  it('tidies whitespace and drops blank option lines', () => {
    expect(cleanCustom('  Will  Dan cry? ', 'Yes\n\n  No  \n')).toEqual({
      question: 'Will Dan cry?',
      options: ['Yes', 'No'],
    })
  })

  it('rejects a missing question, one option, or duplicate options', () => {
    expect(() => cleanCustom('', 'Yes\nNo')).toThrow('Write the question')
    expect(() => cleanCustom('Will Dan cry?', 'Yes')).toThrow('at least two options')
    expect(() => cleanCustom('Will Dan cry?', 'Yes\nyes')).toThrow('different')
  })
})

describe('projected odds', () => {
  it('scales what was typed to 100%', () => {
    expect(cleanOdds('1, 3', 2)).toEqual([25, 75])
    expect(cleanOdds('50,30,20', 3)).toEqual([50, 30, 20])
  })

  it('travels with the stored options and comes back out', () => {
    const stored = packOptions(['Yes', 'No'], [15, 85])
    expect(unpackOptions(stored)).toEqual({ options: ['Yes', 'No'], odds: [15, 85] })
    // Suggestions sent before odds existed have none.
    expect(unpackOptions(['Yes', 'No'])).toEqual({ options: ['Yes', 'No'], odds: null })
    expect(unpackOptions([])).toEqual({ options: [], odds: null })
  })
})

describe('draftFromForm', () => {
  it('builds a custom draft with an optional note', () => {
    const d = draftFromForm(
      form({ kind: 'CUSTOM', question: 'Who spills first?', options: 'Tom\nSam', odds: '30,70', note: ' Steven decides ' }),
      FIELD,
    )
    expect(d).toMatchObject({
      kind: 'CUSTOM',
      question: 'Who spills first?',
      options: ['Tom', 'Sam'],
      odds: [30, 70],
      note: 'Steven decides',
    })
  })

  it('makes the player give odds for their own question: no even-split default', () => {
    const q = { kind: 'CUSTOM', question: 'Will Dan cry?', options: 'Yes\nNo' }
    expect(() => draftFromForm(form(q), FIELD)).toThrow('Enter the odds')
    expect(() => draftFromForm(form({ ...q, odds: '20,' }), FIELD)).toThrow('Enter the odds')
    expect(() => draftFromForm(form({ ...q, odds: '20,0' }), FIELD)).toThrow('at least 0.5%')
    expect(draftFromForm(form({ ...q, odds: '20,80' }), FIELD).odds).toEqual([20, 80])
  })

  it('checks head-to-head picks come from the field and differ', () => {
    expect(draftFromForm(form({ kind: 'H2H', a: '1', b: '2' }), FIELD)).toMatchObject({ kind: 'H2H', a: 1, b: 2 })
    expect(() => draftFromForm(form({ kind: 'H2H', a: '1', b: '9' }), FIELD)).toThrow('from the field')
    expect(() => draftFromForm(form({ kind: 'H2H', a: '1', b: '1' }), FIELD)).toThrow('different')
  })

  it('keeps top N between 1 and one less than the field', () => {
    expect(draftFromForm(form({ kind: 'TOP_N', a: '3', n: '2' }), FIELD)).toMatchObject({ a: 3, topN: 2 })
    expect(() => draftFromForm(form({ kind: 'TOP_N', a: '3', n: '4' }), FIELD)).toThrow('between 1 and 3')
  })

  it('needs a field for people-based markets, and a known kind', () => {
    expect(() => draftFromForm(form({ kind: 'H2H', a: '1', b: '2' }), [])).toThrow('isn’t set')
    expect(() => draftFromForm(form({ kind: 'WINNER' }), FIELD)).toThrow('what kind')
  })
})

describe('specFor / describeDraft / sameMarket', () => {
  const h2h = { kind: 'H2H' as const, question: null, options: [], a: 1, b: 2, topN: null }
  const top = { kind: 'TOP_N' as const, question: null, options: [], a: 3, b: null, topN: 10 }

  it('maps drafts to market specs', () => {
    expect(specFor(h2h)).toEqual({ kind: 'H2H', a: 1, b: 2 })
    expect(specFor(top)).toEqual({ kind: 'TOP_N', competitorId: 3, n: 10 })
  })

  it('describes drafts the way the market will read', () => {
    const nameOf = (id: number) => names[id]
    expect(describeDraft(h2h, nameOf)).toBe('Jack vs Megan: who lasts longer?')
    expect(describeDraft(top, nameOf)).toBe('Will Jody finish top 10?')
    expect(describeDraft({ ...top, topN: 1 }, nameOf)).toBe('Will Jody win?')
  })

  it('spots duplicates either way round, and custom questions ignoring case', () => {
    expect(sameMarket(h2h, { ...h2h, a: 2, b: 1 })).toBe(true)
    expect(sameMarket(top, { ...top, topN: 5 })).toBe(false)
    const q = { kind: 'CUSTOM' as const, question: 'Will Dan cry?', a: null, b: null, topN: null }
    expect(sameMarket(q, { ...q, question: 'will dan cry?' })).toBe(true)
  })
})
