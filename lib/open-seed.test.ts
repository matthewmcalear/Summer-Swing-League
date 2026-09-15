import { describe, expect, it } from 'vitest'
import { distributeGroups, fieldMembers, isOpenCourse, normalizeName, parCard } from './open-seed'
import { OPEN_COURSE, OPEN_FIELD_PLAYERS } from './open-types'

const member = (full_name: string) => ({ full_name })

describe('fieldMembers', () => {
  it('keeps the announced field order and ignores members who are not playing', () => {
    const roster = [member('Sophie Therien'), member('Rachel Kuta'), member('matthew mcalear'), member('Dan McAlear')]
    expect(fieldMembers(roster).map((m) => m.full_name)).toEqual(['matthew mcalear', 'Dan McAlear', 'Rachel Kuta'])
  })

  it('matches names regardless of accents, case and spacing, and skips unregistered names', () => {
    expect(fieldMembers([member('  Tibi   MITRAN ')], ['Tibi Mitran', 'Nobody Here']).length).toBe(1)
    expect(normalizeName('Thérien')).toBe('therien')
    expect(fieldMembers([], OPEN_FIELD_PLAYERS)).toEqual([])
  })
})

describe('distributeGroups', () => {
  it('splits ten players 4/3/3 and fills earlier groups first', () => {
    expect(distributeGroups(10, 3)).toEqual([0, 0, 0, 0, 1, 1, 1, 2, 2, 2])
    expect(distributeGroups(2, 3)).toEqual([0, 1])
    expect(distributeGroups(0, 3)).toEqual([])
  })
})

describe('isOpenCourse', () => {
  it.each(['Golf Ste-Rose', 'Club de golf Sainte-Rose', 'STE ROSE', 'Golf Ste. Rose — Blanc'])('recognizes %s', (name) => {
    expect(isOpenCourse(name)).toBe(true)
  })
  it.each(['Rive Sud', 'Roseland', 'St. Lambert', 'Sainte-Rosalie'])('does not match %s', (name) => {
    expect(isOpenCourse(name)).toBe(false)
  })
})

describe('parCard', () => {
  it('uses the stored card when it is complete and adds up', () => {
    const stored = [...OPEN_COURSE.holePars].reverse()
    expect(parCard(70, stored)).toEqual(stored)
  })

  it('falls back to the known Ste-Rose card for a par-70 course without hole pars', () => {
    expect(parCard(70, [])).toEqual(OPEN_COURSE.holePars)
    expect(parCard(70, [4, 4])).toEqual(OPEN_COURSE.holePars)
    expect(parCard(70, OPEN_COURSE.holePars.map((par) => par + 1))).toEqual(OPEN_COURSE.holePars)
  })

  it('spreads 3s or 5s over a par-4 card when nothing better is known', () => {
    for (const par of [66, 68, 71, 72, 73, 90]) {
      const card = parCard(par, null)
      expect(card).toHaveLength(18)
      expect(card.reduce((sum, value) => sum + value, 0)).toBe(par)
      expect(card.every((value) => value >= 3 && value <= 5)).toBe(true)
    }
    expect(parCard(72, undefined)).toEqual(Array(18).fill(4))
    expect(parCard(68, undefined).filter((value) => value === 3)).toHaveLength(4)
  })
})
