import { describe, it, expect } from 'vitest'
import {
  calculatePoints,
  computeSeasonScore,
  validateRound,
  DIFFICULTY_MULTIPLIERS,
  SEASON_START,
  SEASON_END,
} from './scoring'

describe('calculatePoints', () => {
  it('computes 9-hole base: 75 - (gross - handicap/2)', () => {
    const r = calculatePoints({ holes: 9, gross: 45, handicap: 10, difficulty: 'average', otherLeagueMembersCount: 0 })
    expect(r.basePoints).toBe(35)   // 75 - (45 - 5)
    expect(r.totalPoints).toBe(35)
  })

  it('computes 18-hole base: (150 - (gross - handicap)) / 2', () => {
    const r = calculatePoints({ holes: 18, gross: 90, handicap: 10, difficulty: 'average', otherLeagueMembersCount: 0 })
    expect(r.basePoints).toBe(35)   // (150 - 80) / 2
    expect(r.totalPoints).toBe(35)
  })

  it('applies difficulty multiplier to base only, not bonuses', () => {
    const r = calculatePoints({ holes: 18, gross: 90, handicap: 10, difficulty: 'tough', otherLeagueMembersCount: 2, additionalPoints: 3 })
    // 35 × 1.05 = 36.75, + 2 group + 3 additional = 41.75
    expect(r.totalPoints).toBe(41.75)
    expect(r.groupBonus).toBe(2)
  })

  it('falls back to 1.0 multiplier for unknown difficulty', () => {
    const r = calculatePoints({ holes: 9, gross: 45, handicap: 10, difficulty: 'bogus', otherLeagueMembersCount: 0 })
    expect(r.difficultyMultiplier).toBe(1.0)
  })

  it('never produces a negative group bonus', () => {
    const r = calculatePoints({ holes: 9, gross: 45, handicap: 10, difficulty: 'average', otherLeagueMembersCount: -3 })
    expect(r.groupBonus).toBe(0)
  })

  it('has the expected difficulty table', () => {
    expect(DIFFICULTY_MULTIPLIERS).toEqual({ easy: 0.95, average: 1.0, tough: 1.05 })
  })
})

describe('computeSeasonScore', () => {
  it('sums top 5 scores at full multiplier with 5+ rounds', () => {
    const r = computeSeasonScore([10, 20, 30, 40, 50, 60])
    expect(r.topScores).toEqual([60, 50, 40, 30, 20])
    expect(r.totalPoints).toBe(200)
    expect(r.seasonScore).toBe(200)
  })

  it('applies participation multiplier below 5 rounds', () => {
    expect(computeSeasonScore([100]).seasonScore).toBe(20)            // ×0.2
    expect(computeSeasonScore([100, 100]).seasonScore).toBe(80)       // ×0.4
    expect(computeSeasonScore([100, 100, 100]).seasonScore).toBe(180) // ×0.6
    expect(computeSeasonScore([100, 100, 100, 100]).seasonScore).toBe(320) // ×0.8
  })

  it('awards improvement bonus at 3 pts per stroke', () => {
    const r = computeSeasonScore([100, 100, 100, 100, 100], 20, 15)
    expect(r.improvementBonus).toBe(15)   // 5 strokes × 3
    expect(r.handicapImprovement).toBe(5)
    expect(r.seasonScore).toBe(515)
  })

  it('does not penalize a worsening handicap', () => {
    const r = computeSeasonScore([100, 100, 100, 100, 100], 15, 20)
    expect(r.improvementBonus).toBe(0)
    expect(r.seasonScore).toBe(500)
  })

  it('skips improvement bonus when starting handicap is unset', () => {
    const r = computeSeasonScore([100, 100, 100, 100, 100], null, 10)
    expect(r.improvementBonus).toBe(0)
  })

  it('adds season bonus points', () => {
    const r = computeSeasonScore([100, 100, 100, 100, 100], null, undefined, 25)
    expect(r.seasonBonusPoints).toBe(25)
    expect(r.seasonScore).toBe(525)
  })

  it('returns zero for no rounds', () => {
    const r = computeSeasonScore([])
    expect(r.seasonScore).toBe(0)
    expect(r.totalPoints).toBe(0)
    expect(r.topScores).toEqual([])
  })
})

describe('validateRound', () => {
  const valid = { holes: 18, gross: 90, handicap: 10, playDate: '2026-06-09' }

  it('accepts a normal round', () => {
    expect(validateRound(valid)).toBeNull()
  })

  it('rejects holes other than 9 or 18', () => {
    expect(validateRound({ ...valid, holes: 12 })).toMatch(/holes/)
  })

  it('rejects out-of-range gross scores', () => {
    expect(validateRound({ ...valid, gross: 30 })).toMatch(/gross/)        // too low for 18
    expect(validateRound({ ...valid, gross: 200 })).toMatch(/gross/)       // too high
    expect(validateRound({ ...valid, holes: 9, gross: 20 })).toMatch(/gross/)
    expect(validateRound({ ...valid, gross: 90.5 })).toMatch(/gross/)      // not whole
  })

  it('rejects out-of-range handicaps', () => {
    expect(validateRound({ ...valid, handicap: 60 })).toMatch(/handicap/)
    expect(validateRound({ ...valid, handicap: -20 })).toMatch(/handicap/)
    expect(validateRound({ ...valid, handicap: NaN })).toMatch(/handicap/)
  })

  it('rejects dates outside the season', () => {
    expect(validateRound({ ...valid, playDate: '2026-01-01' })).toMatch(/season/)
    expect(validateRound({ ...valid, playDate: '2026-11-01' })).toMatch(/season/)
    expect(validateRound({ ...valid, playDate: SEASON_START })).toBeNull()
    expect(validateRound({ ...valid, playDate: SEASON_END })).toBeNull()
  })

  it('rejects malformed dates', () => {
    expect(validateRound({ ...valid, playDate: 'not-a-date' })).toMatch(/date/)
    expect(validateRound({ ...valid, playDate: '06/09/2026' })).toMatch(/date/)
  })
})
