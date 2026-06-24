import { describe, it, expect } from 'vitest'
import {
  scoreDifferential,
  computeHandicapIndex,
  MIN_ROUNDS_FOR_INDEX,
  MAX_HANDICAP_INDEX,
} from './handicap'

describe('scoreDifferential', () => {
  it('computes an 18-hole differential: (113/slope) × (gross − rating)', () => {
    // (113/120) × (90 − 71.2) = 0.94166.. × 18.8 = 17.7 (rounded to 1 dp)
    const d = scoreDifferential({ gross: 90, courseRating: 71.2, slopeRating: 120, holes: 18 })
    expect(d).toBe(17.7)
  })

  it('scales a 9-hole differential to an 18-hole equivalent (×2)', () => {
    // (113/113) × (40 − 35.5) = 4.5, ×2 = 9.0
    const d = scoreDifferential({ gross: 40, courseRating: 35.5, slopeRating: 113, holes: 9 })
    expect(d).toBe(9.0)
  })

  it('can be negative for a round better than the rating', () => {
    const d = scoreDifferential({ gross: 68, courseRating: 71.2, slopeRating: 120, holes: 18 })
    expect(d).toBeLessThan(0)
  })

  it('returns null on invalid slope', () => {
    expect(scoreDifferential({ gross: 90, courseRating: 71, slopeRating: 0, holes: 18 })).toBeNull()
    expect(scoreDifferential({ gross: NaN, courseRating: 71, slopeRating: 120, holes: 18 })).toBeNull()
  })
})

describe('computeHandicapIndex', () => {
  it('returns null below the minimum round count', () => {
    expect(computeHandicapIndex([10, 12])).toBeNull()
    expect(MIN_ROUNDS_FOR_INDEX).toBe(3)
  })

  it('3 rounds → lowest 1 minus 2.0, truncated', () => {
    // lowest of [10.4, 12.1, 15.0] = 10.4, −2.0 = 8.4
    const r = computeHandicapIndex([15.0, 12.1, 10.4])
    expect(r?.index).toBe(8.4)
    expect(r?.roundsUsed).toBe(1)
  })

  it('5 rounds → lowest 1, no adjustment', () => {
    const r = computeHandicapIndex([20, 18, 16, 14, 12.3])
    expect(r?.index).toBe(12.3)
  })

  it('6 rounds → average of lowest 2 minus 1.0', () => {
    // lowest 2 of [9,10,11,12,13,14] = 9,10 → avg 9.5, −1.0 = 8.5
    const r = computeHandicapIndex([14, 13, 12, 11, 10, 9])
    expect(r?.index).toBe(8.5)
    expect(r?.roundsUsed).toBe(2)
  })

  it('20 rounds → average of lowest 8', () => {
    // diffs 1..20; lowest 8 = 1..8 → avg 4.5
    const diffs = Array.from({ length: 20 }, (_, i) => i + 1)
    const r = computeHandicapIndex(diffs)
    expect(r?.index).toBe(4.5)
    expect(r?.roundsUsed).toBe(8)
    expect(r?.differentialsConsidered).toBe(20)
  })

  it('only considers the most recent 20 (most-recent-first)', () => {
    // 21 differentials, newest first; the trailing huge one must be ignored
    const diffs = [...Array.from({ length: 20 }, (_, i) => i + 1), 999]
    const r = computeHandicapIndex(diffs)
    expect(r?.index).toBe(4.5)
    expect(r?.differentialsConsidered).toBe(20)
  })

  it('truncates rather than rounds', () => {
    // lowest 1 of [10.39] family → 10.39 truncates to 10.3, not 10.4
    const r = computeHandicapIndex([10.39, 20, 20, 20, 20])
    expect(r?.index).toBe(10.3)
  })

  it('caps at the WHS maximum', () => {
    const r = computeHandicapIndex([80, 80, 80, 80, 80])
    expect(r?.index).toBe(MAX_HANDICAP_INDEX)
  })
})
