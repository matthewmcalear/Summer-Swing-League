import { OPEN_COURSE, OPEN_FIELD_PLAYERS } from './open-types'

const TOTAL_HOLES = 18

/** Accent- and case-insensitive name key, so "Nicolas Tuli" and "nicolas  tuli" compare equal. */
export const normalizeName = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** The league members who are in the announced Open field, in field order. Unregistered names are skipped. */
export function fieldMembers<T extends { full_name: string }>(members: T[], field: string[] = OPEN_FIELD_PLAYERS): T[] {
  const byName = new Map(members.map((member) => [normalizeName(member.full_name), member]))
  return field.flatMap((name) => {
    const member = byName.get(normalizeName(name))
    return member ? [member] : []
  })
}

/**
 * Group index for each of `count` players across `groups` groups, filled in
 * order and front-loaded (10 players → 4/3/3). Players can move afterwards.
 */
export function distributeGroups(count: number, groups: number): number[] {
  const sizes = Array.from({ length: groups }, (_, index) => Math.floor(count / groups) + (index < count % groups ? 1 : 0))
  return sizes.flatMap((size, group) => Array<number>(size).fill(group))
}

/** Matches the library entry for the Open venue however it was typed: "Golf Ste-Rose", "Sainte Rose", "Ste. Rose". */
export function isOpenCourse(name: string): boolean {
  return /\b(?:ste|sainte)[\s.-]*rose\b/.test(normalizeName(name))
}

const validCard = (pars: readonly number[] | null | undefined, par: number): pars is number[] =>
  Array.isArray(pars) && pars.length === TOTAL_HOLES &&
  pars.every((value) => Number.isInteger(value) && value >= 3 && value <= 6) &&
  pars.reduce((sum, value) => sum + value, 0) === par

/**
 * An 18-hole par card that sums to the course par: the stored card when it is
 * complete, else the known Ste-Rose card when the par matches, else an even
 * spread of 3s or 5s over a par-4 card. The board only needs the card for
 * pace projections, so a generic card is a fair fallback until it is corrected.
 */
export function parCard(par: number, stored?: readonly number[] | null): number[] {
  if (validCard(stored, par)) return [...stored]
  if (validCard(OPEN_COURSE.holePars, par)) return [...OPEN_COURSE.holePars]
  const card = Array<number>(TOTAL_HOLES).fill(4)
  const difference = Math.max(-TOTAL_HOLES, Math.min(TOTAL_HOLES, par - 4 * TOTAL_HOLES))
  const step = TOTAL_HOLES / Math.abs(difference || 1)
  for (let index = 0; index < Math.abs(difference); index += 1) {
    card[Math.min(TOTAL_HOLES - 1, Math.floor(index * step + step / 2))] += Math.sign(difference)
  }
  return card
}
