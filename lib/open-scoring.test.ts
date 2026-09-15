import { describe, expect, it } from 'vitest'
import { projectOpen, projectOpenSeason } from './open-scoring'
import type { OpenEvent, OpenMode, OpenPlayer, OpenSeasonMember } from './open-types'

function player(id: string, overrides: Partial<OpenPlayer> = {}): OpenPlayer {
  return {
    id, memberId: id, name: id, handicap: 0, mode: 'normal', doubleDown: false,
    scores: Array(18).fill(0), version: 0, scoreId: null, bonusId: null, ...overrides,
  }
}

function event(players: OpenPlayer[], overrides: Partial<OpenEvent> = {}): OpenEvent {
  return {
    id: 'open', courseId: 'course', courseName: 'Test Course', teeName: 'White',
    playDate: '2026-09-19', courseRating: 72, slopeRating: 120, coursePar: 72,
    holePars: Array(18).fill(4), difficulty: 'average', finalizedAt: null,
    updatedAt: '2026-09-19T17:00:00Z',
    groups: [{ id: 'group', name: 'Group 1', teeTime: '13:00', players }],
    ...overrides,
  }
}

/** Make a valid complete card with an exact gross total. */
function card(gross: number): number[] {
  return Array.from({ length: 18 }, (_, index) => Math.floor(gross / 18) + (index < gross % 18 ? 1 : 0))
}

function partial(...scores: number[]): number[] {
  return [...scores, ...Array(18 - scores.length).fill(0)]
}

function member(id: string, points: number[], overrides: Partial<OpenSeasonMember> = {}): OpenSeasonMember {
  return {
    id, name: id, startingHandicap: null, currentHandicap: 0,
    scores: points.map((value, index) => ({ id: `${id}-${index}`, points: value })),
    bonuses: [], ...overrides,
  }
}

describe('projectOpen', () => {
  it('leaves unstarted players unranked and does not award them projected points', () => {
    const rows = projectOpen(event([player('waiting'), player('started', { scores: partial(5) })]))
    expect(rows[0].player.id).toBe('started')
    expect(rows[1]).toMatchObject({
      holesPlayed: 0, gross: 0, rank: null, projectedGross: null, projectedNet: null,
      roundPoints: null, finishBonus: 0, bonusMin: 0, bonusMax: 0,
    })
  })

  it('compares over-par pace across different hole counts and nonconsecutive holes', () => {
    const pars = [3, 5, ...Array(16).fill(4)]
    const backStart = Array(18).fill(0)
    backStart[9] = 5
    const rows = projectOpen(event([
      player('one', { scores: partial(4) }),
      player('two', { scores: partial(4, 6) }),
      player('back', { scores: backStart }),
    ], { holePars: pars }))

    expect(rows.map((row) => row.projectedGross)).toEqual([90, 90, 90])
    expect(rows.map((row) => row.rank)).toEqual([1, 1, 1])
    expect(rows.map((row) => row.holesPlayed)).toEqual([1, 2, 1])
    expect(rows.every((row) => row.tied)).toBe(true)
  })

  it('uses the existing SSL formula and only partners in the actual group', () => {
    const golfer = player('golfer', { handicap: 18, scores: partial(...Array(9).fill(5)) })
    const source = event([], {
      difficulty: 'tough',
      groups: [
        { id: 'a', name: 'First', teeTime: '13:00', players: [golfer, player('a'), player('b'), player('c')] },
        { id: 'b', name: 'Second', teeTime: '13:10', players: [player('d'), player('e'), player('f')] },
      ],
    })
    expect(projectOpen(source)[0]).toMatchObject({ projectedGross: 90, projectedNet: 72, roundPoints: 43.95 })
  })

  it('ranks by full net score, including fractional and plus handicaps, across all modes', () => {
    const rows = projectOpen(event([
      player('normal', { handicap: 20.5, scores: card(90) }),
      player('hard', { handicap: -1.5, mode: 'hard', scores: card(75) }),
      player('god', { handicap: 0, mode: 'god', scores: card(80) }),
    ]))
    expect(rows.map((row) => [row.player.id, row.projectedNet, row.rank, row.finishBonus])).toEqual([
      ['normal', 69.5, 1, 5], ['hard', 76.5, 2, 6], ['god', 80, 3, 6],
    ])
  })

  it.each<[OpenMode, number[]]>([
    ['normal', [5, 3, 1]], ['hard', [10, 6, 2]], ['god', [25, 12, 6]],
  ])('applies the announced %s mode payouts', (mode, bonuses) => {
    const rows = projectOpen(event([70, 80, 90, 100].map((gross, index) =>
      player(`p${index}`, { mode, scores: card(gross) }))))
    expect(rows.map((row) => row.finishBonus)).toEqual([...bonuses, 0])
  })

  it('shows tied prize-slot ranges without deciding a winner, including a tie across third and fourth', () => {
    const rows = projectOpen(event([
      player('one', { scores: card(70) }),
      player('two', { scores: card(70), mode: 'hard' }),
      player('three', { scores: card(80), mode: 'god' }),
      player('four', { scores: card(80) }),
      player('five', { scores: card(90) }),
      player('six', { scores: card(90) }),
    ]))
    expect(rows.map((row) => [row.rank, row.finishBonus, row.bonusMin, row.bonusMax])).toEqual([
      [1, null, 3, 5], [1, null, 6, 10], [3, null, 0, 6], [3, null, 0, 1],
      [5, 0, 0, 0], [5, 0, 0, 0],
    ])
  })

  it('keeps an undeclared mode unresolved instead of assigning Normal payouts', () => {
    expect(projectOpen(event([player('p', { mode: null, scores: card(80) })]))[0])
      .toMatchObject({ rank: 1, finishBonus: null, bonusMin: 5, bonusMax: 25 })
  })

  it('uses actual gross at completion and preserves fractional pace before completion', () => {
    const source = event([player('p', { scores: partial(5, 4, 4, 4, 4, 4, 4) })])
    expect(projectOpen(source)[0].projectedGross).toBeCloseTo(74.57142857142857)
    source.groups[0].players[0].scores = card(83)
    expect(projectOpen(source)[0]).toMatchObject({ projectedGross: 83, projectedNet: 83, roundPoints: 33.5 })
  })

  it('ranks only complete cards once results are posted', () => {
    const source = event([
      player('quit', { scores: partial(...Array(9).fill(3)) }),
      player('done', { scores: card(80) }),
      player('waiting'),
    ], { finalizedAt: '2026-09-19T21:00:00Z' })
    const rows = projectOpen(source)
    // 35 base points + 1 partner who actually played; the no-show is not a group member.
    expect(rows.map((row) => [row.player.id, row.rank, row.projectedNet, row.roundPoints])).toEqual([
      ['done', 1, 80, 36], ['quit', null, null, null], ['waiting', null, null, null],
    ])
    expect(rows[1]).toMatchObject({ holesPlayed: 9, gross: 27, finishBonus: 0, bonusMin: 0, bonusMax: 0 })
    // Before posting, every assigned partner counts and the pace projection ranks the incomplete card.
    expect(projectOpen({ ...source, finalizedAt: null }).map((row) => [row.player.id, row.rank, row.roundPoints]))
      .toEqual([['quit', 1, 50], ['done', 2, 37], ['waiting', null, null]])
  })

  it('does not mutate event cards or player order while producing rankings', () => {
    const source = event([player('slow', { scores: card(100) }), player('fast', { scores: card(80) })])
    const before = JSON.stringify(source)
    projectOpen(source)
    expect(JSON.stringify(source)).toBe(before)
  })
})

describe('Open Double Down', () => {
  it('keeps the bonus pending before back-nine evidence, even after the front is complete', () => {
    const row = projectOpen(event([player('p', {
      mode: 'god', doubleDown: true, scores: partial(...Array(9).fill(5)),
    })]))[0]
    expect(row).toMatchObject({ doubleDownStatus: 'pending', finishBonus: null, bonusMin: 0, bonusMax: 50 })
  })

  it('uses back-nine pace rather than the whole-round pace after a back-nine hole is played', () => {
    const source = event([player('p', {
      handicap: 17.5, doubleDown: true, scores: partial(...Array(9).fill(5), 4),
    })])
    expect(projectOpen(source)[0]).toMatchObject({ doubleDownStatus: 'projected-win', finishBonus: 10 })
    source.groups[0].players[0].scores[9] = 5
    expect(projectOpen(source)[0]).toMatchObject({ doubleDownStatus: 'projected-loss', finishBonus: 0 })
  })

  it('uses the actual pars of the back nine when estimating its finish', () => {
    const pars = [...Array(9).fill(4), 3, 5, ...Array(7).fill(4)]
    const row = projectOpen(event([player('p', {
      doubleDown: true, scores: partial(...Array(9).fill(5), 4),
    })], { holePars: pars }))[0]
    // A 4 on a par 3 is +1/hole pace, projecting 45 on the back: a tie loses.
    expect(row).toMatchObject({ doubleDownStatus: 'projected-loss', finishBonus: 0 })
  })

  it.each([
    [4, 'won', 50], [5, 'lost', 0], [6, 'lost', 0],
  ])('settles a complete back nine at %s strokes per hole', (backScore, status, bonus) => {
    const row = projectOpen(event([player('p', {
      handicap: -1.5, mode: 'god', doubleDown: true,
      scores: [...Array(9).fill(5), ...Array(9).fill(backScore)],
    })]))[0]
    expect(row.doubleDownStatus).toBe(status)
    expect(row.finishBonus).toBe(bonus)
  })

  it('doubles the possible prize slots when a winning Double Down still has an unresolved finish tie', () => {
    const scores = [...Array(9).fill(5), ...Array(9).fill(4)]
    const rows = projectOpen(event([
      player('a', { scores, doubleDown: true }), player('b', { scores, doubleDown: true }),
    ]))
    expect(rows[0]).toMatchObject({ rank: 1, tied: true, doubleDownStatus: 'won', finishBonus: null, bonusMin: 6, bonusMax: 10 })
  })
})

describe('projectOpenSeason', () => {
  it('replaces the fifth-best round and adds the Open bonus outside the round total', () => {
    const source = event([player('p', { handicap: 18, scores: card(90) }), player('a'), player('b'), player('c')], { difficulty: 'tough' })
    const rows = projectOpenSeason(source, [member('p', [50, 49, 48, 47, 40], { currentHandicap: 18 })])
    expect(rows[0]).toMatchObject({ currentScore: 234, projectedScore: 242.95, delta: 8.95, bonusPending: false })
  })

  it('recomputes participation when adding the fifth round', () => {
    const source = event([player('p', { scores: card(70) })]) // 40 SSL + 5 Open bonus
    expect(projectOpenSeason(source, [member('p', [40, 40, 40, 40])])[0])
      .toMatchObject({ currentScore: 128, projectedScore: 205, delta: 77 })
  })

  it('retains the event bonus even when the Open round does not enter the best five', () => {
    const source = event([player('p', { scores: card(100) })])
    expect(projectOpenSeason(source, [member('p', [50, 50, 50, 50, 50])])[0])
      .toMatchObject({ currentScore: 250, projectedScore: 255, delta: 5 })
  })

  it('keeps the member handicap improvement fixed and retains unrelated season bonuses', () => {
    const source = event([player('p', { handicap: 18, scores: card(90) })]) // 39 SSL
    const season = [member('p', [50, 50, 50, 50, 50], {
      startingHandicap: 20, currentHandicap: 16, bonuses: [{ id: 'birthday', points: 3 }],
    })]
    expect(projectOpenSeason(source, season)[0]).toMatchObject({ currentScore: 265, projectedScore: 270 })
  })

  it('does not double-count linked official Open rounds and awards', () => {
    const source = event([player('p', { scores: card(70), scoreId: 'official-open', bonusId: 'open-award' })])
    const season = [member('p', [40, 40, 40, 40], {
      scores: [...member('p', [40, 40, 40, 40]).scores, { id: 'official-open', points: 40 }],
      bonuses: [{ id: 'open-award', points: 5 }, { id: 'birthday', points: 3 }],
    })]
    expect(projectOpenSeason(source, season)[0]).toMatchObject({ currentScore: 208, projectedScore: 208, delta: 0 })
  })

  it('uses a tied bonus range minimum and flags the season estimate as pending', () => {
    const source = event([player('a', { scores: card(72) }), player('b', { scores: card(72) })])
    // Each is 39 base + 1 group = 40 SSL; a T1 Normal award is 3..5.
    expect(projectOpenSeason(source, [member('a', [40, 40, 40, 40]), member('b', [])])[0])
      .toMatchObject({ id: 'a', projectedScore: 203, bonusPending: true })
  })

  it('adds nothing for a tied bonus once results are posted, until the commissioner awards it', () => {
    const scores = card(72)
    const live = event([player('a', { scores }), player('b', { scores })])
    const posted = { ...live, finalizedAt: '2026-09-19T21:00:00Z' }
    const season = [member('a', [40, 40, 40, 40]), member('b', [])]
    expect(projectOpenSeason(live, season)[0]).toMatchObject({ id: 'a', projectedScore: 203, bonusPending: true })
    expect(projectOpenSeason(posted, season)[0]).toMatchObject({ id: 'a', projectedScore: 200, bonusPending: true })
    // Once the official round and a hand-awarded bonus exist they count on their own.
    const awarded = [member('a', [40, 40, 40, 40], {
      scores: [...member('a', [40, 40, 40, 40]).scores, { id: 'open-round', points: 40 }],
      bonuses: [{ id: 'manual', points: 5 }],
    }), member('b', [])]
    posted.groups[0].players[0].scores = scores
    posted.groups[0].players[0].scoreId = 'open-round'
    expect(projectOpenSeason(posted, awarded)[0]).toMatchObject({ id: 'a', currentScore: 205, projectedScore: 205, delta: 0 })
  })

  it('preserves members outside the event and unstarted players without adding rounds or bonuses', () => {
    const source = event([player('waiting')])
    const rows = projectOpenSeason(source, [member('waiting', [40]), member('outside', [50])])
    expect(rows.map((row) => [row.id, row.currentScore, row.projectedScore, row.delta])).toEqual([
      ['outside', 10, 10, 0], ['waiting', 8, 8, 0],
    ])
  })

  it('matches official season tie breaks by round count, then best round', () => {
    const source = event([])
    const rows = projectOpenSeason(source, [
      member('flat', [40, 40, 40, 40, 40]),
      member('big-round', [60, 35, 35, 35, 35]),
      member('more-rounds', [40, 40, 40, 40, 40, 1]),
    ])
    expect(rows.map((row) => [row.id, row.rank, row.currentRank])).toEqual([
      ['more-rounds', 1, 1], ['big-round', 2, 2], ['flat', 3, 3],
    ])
  })

  it('reports movement against the whole current league table', () => {
    const source = event([player('p', { scores: card(70) })])
    const rows = projectOpenSeason(source, [member('leader', [40, 40, 40, 40, 40]), member('p', [40, 40, 40, 40])])
    expect(rows.map((row) => [row.id, row.currentRank, row.rank, row.projectedScore])).toEqual([
      ['p', 2, 1, 205], ['leader', 1, 2, 200],
    ])
  })
})
