import { describe, it, expect } from 'vitest'
import { buildSeasonRecap, type RecapRound } from './seasonRecap'

const round = (o: Partial<RecapRound>): RecapRound => ({
  member_id: 'a', player_name: 'A', holes: 18, gross_score: 90, course_name: 'Carling',
  total_points: 20, play_date: '2026-06-10', group_member_ids: [], ...o,
})
const members = [
  { id: 'a', name: 'Alice', handicapImprovement: 2 },
  { id: 'b', name: 'Bob', handicapImprovement: 0 },
  { id: 'c', name: 'Cy', handicapImprovement: 4.5 },
]

describe('buildSeasonRecap', () => {
  const rounds = [
    round({ member_id: 'a', group_member_ids: ['a', 'b'] }),
    round({ member_id: 'a', course_name: 'Carling ', group_member_ids: ['a', 'b', 'c'], play_date: '2026-07-01' }),
    round({ member_id: 'a', course_name: 'Ste-Rose', holes: 9, gross_score: 44, play_date: '2026-07-20' }),
    round({ member_id: 'b', gross_score: 78, total_points: 31.5, group_member_ids: ['a', 'b'] }),
    round({ member_id: 'c', course_name: 'Gray Rocks', group_member_ids: ['a', 'c'] }),
    round({ member_id: 'ghost', total_points: 99 }), // inactive/unknown member: ignored
  ]
  const recap = buildSeasonRecap(rounds, members)
  const award = (k: string) => recap.awards.find((a) => a.key === k)

  it('totals only count known members', () => {
    expect(recap.totals).toEqual({ rounds: 5, holes: 81, courses: 3, players: 3, strokes: 90 + 90 + 44 + 78 + 90 })
  })

  it('hands out awards', () => {
    expect(award('ironman')?.winner).toBe('Alice')
    expect(award('round')?.winner).toBe('Bob')
    expect(award('round')?.detail).toBe('Carling · Jun 10')
    expect(award('lowgross')?.value).toBe('78')
    expect(award('improved')?.winner).toBe('Cy')
    expect(award('explorer')?.winner).toBe('Alice') // course names are trimmed/case-folded
    expect(award('social')?.winner).toBe('Alice')
  })

  it('builds player wraps', () => {
    const alice = recap.players[0]
    expect(alice).toMatchObject({
      name: 'Alice', rounds: 3, holes: 45, courses: 2, favoriteCourse: 'Carling',
      topPartner: { name: 'Bob', rounds: 2 }, busiestMonth: 'July',
    })
  })

  it('handles an empty season', () => {
    const empty = buildSeasonRecap([], members)
    expect(empty.awards.filter((a) => a.key !== 'improved')).toEqual([])
    expect(empty.players).toEqual([])
  })
})
