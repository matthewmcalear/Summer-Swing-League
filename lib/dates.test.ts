import { describe, it, expect } from 'vitest'
import { localToday, formatCalendarDate } from './dates'

describe('localToday', () => {
  it('uses the local calendar day, even late in the evening', () => {
    expect(localToday(new Date(2026, 9, 10, 21, 30))).toBe('2026-10-10') // 9:30pm local on the final day
    expect(localToday(new Date(2026, 3, 5, 0, 5))).toBe('2026-04-05')
  })
})

describe('formatCalendarDate', () => {
  it('shows the same calendar day that was picked', () => {
    expect(formatCalendarDate('2026-10-08', { month: 'short', day: 'numeric', year: 'numeric' })).toBe('Oct 8, 2026')
    expect(formatCalendarDate('2026-10-08T12:00:00.000Z', { month: 'short', day: 'numeric' })).toBe('Oct 8')
  })
})
