import { describe, it, expect } from 'vitest'
import { buildStandings, pointsNeededToPass, type StandingsInput } from './standings'
import { computeSeasonScore } from './scoring'

const NOW = new Date('2026-10-08T12:00:00Z')
const d = (iso: string) => new Date(`${iso}T12:00:00Z`)
const member = (id: string, start: number | null = 10, current = 10) =>
  ({ id, full_name: id, starting_handicap: start, current_handicap: current })

describe('buildStandings', () => {
  it('ranks by season score and shares ranks on ties', () => {
    const input: StandingsInput = {
      members: [member('a'), member('b'), member('c')],
      scores: [
        { member_id: 'a', total_points: 20, play_date: d('2026-06-01') },
        { member_id: 'b', total_points: 20, play_date: d('2026-06-01') },
        { member_id: 'c', total_points: 10, play_date: d('2026-06-01') },
      ],
      bonuses: [], handicaps: [],
    }
    const s = buildStandings(input, NOW)
    expect(s.map((p) => p.rank)).toEqual([1, 1, 3])
    expect(s[2].gapToLeader).toBe(2) // 20×0.2 − 10×0.2
    expect(s[2].gapToNext).toBe(2)
  })

  it('tracks week-over-week movement', () => {
    const input: StandingsInput = {
      members: [member('a'), member('b'), member('new')],
      scores: [
        { member_id: 'a', total_points: 20, play_date: d('2026-06-01') },
        { member_id: 'b', total_points: 10, play_date: d('2026-06-01') },
        { member_id: 'b', total_points: 30, play_date: d('2026-10-05') }, // b jumps a this week
        { member_id: 'new', total_points: 5, play_date: d('2026-10-06') },
      ],
      bonuses: [], handicaps: [],
    }
    const s = buildStandings(input, NOW)
    const by = Object.fromEntries(s.map((p) => [p.id, p]))
    expect(by.b.rank).toBe(1)
    expect(by.b.movement).toBe(1)
    expect(by.a.movement).toBe(-1)
    expect(by.new.movement).toBeNull()
  })

  it('uses the handicap on record at the earlier date for movement', () => {
    const input: StandingsInput = {
      members: [member('a', 20, 10), member('b', 10, 10)],
      scores: [
        { member_id: 'a', total_points: 10, play_date: d('2026-05-01') },
        { member_id: 'b', total_points: 20, play_date: d('2026-05-01') },
      ],
      bonuses: [],
      handicaps: [
        { member_id: 'a', handicap: 20, recorded_at: d('2026-05-01') },
        { member_id: 'a', handicap: 10, recorded_at: d('2026-10-07') }, // 10 strokes = +30 this week
      ],
    }
    const s = buildStandings(input, NOW)
    expect(s[0].id).toBe('a')
    expect(s[0].movement).toBe(1)
  })

  it('computes points needed to pass the player above', () => {
    const input: StandingsInput = {
      members: [member('a'), member('b')],
      scores: [
        ...[30, 30, 30, 30, 30].map((p) => ({ member_id: 'a', total_points: p, play_date: d('2026-06-01') })),
        ...[25, 25, 25, 25, 25].map((p) => ({ member_id: 'b', total_points: p, play_date: d('2026-06-01') })),
      ],
      bonuses: [], handicaps: [],
    }
    const [, b] = buildStandings(input, NOW)
    // b at 125, a at 150: replacing a 25 needs > 50 → 50.1
    expect(b.pointsToPass).toBe(50.1)
    expect(b.nextName).toBe('a')
    // Nobody has posted more than 30 this season, so 50.1 is a stretch.
    expect(b.toPassAboveBest).toBe(true)
  })
})

describe('pointsNeededToPass', () => {
  it('returns the minimal tenth that strictly passes', () => {
    const x = pointsNeededToPass([10, 10], 10, 10, 0, 13)!
    const score = (p: number) => computeSeasonScore([10, 10, p], 10, 10, 0).seasonScore
    expect(x).toBe(1.7) // (20 + x) × 0.6 > 13
    expect(score(x)).toBeGreaterThan(13)
    expect(score(x - 0.1)).toBeLessThanOrEqual(13)
  })
  it('returns null when out of reach', () => {
    expect(pointsNeededToPass([], null, 10, 0, 500)).toBeNull()
  })
})
