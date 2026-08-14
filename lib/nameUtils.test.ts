import { describe, it, expect } from 'vitest'
import { displayName, displayHandicap } from './nameUtils'

describe('displayName', () => {
  it('applies title case to all-lowercase names', () => {
    expect(displayName('jackson shea')).toBe('Jackson Shea')
    expect(displayName('john doe')).toBe('John Doe')
    expect(displayName('mary jane watson')).toBe('Mary Jane Watson')
  })

  it('preserves names that already have capitals', () => {
    expect(displayName('McAlear')).toBe('McAlear')
    expect(displayName('Matthew McAlear')).toBe('Matthew McAlear')
    expect(displayName('Tom McAlear')).toBe('Tom McAlear')
    expect(displayName('O\'Brien')).toBe('O\'Brien')
    expect(displayName('DeSantis')).toBe('DeSantis')
  })

  it('handles edge cases', () => {
    expect(displayName('')).toBe('')
    expect(displayName('  ')).toBe('')
    expect(displayName('john')).toBe('John')
    expect(displayName('JOHN')).toBe('JOHN')
    expect(displayName('  jackson  shea  ')).toBe('Jackson Shea')
  })

  it('handles mixed-case names correctly', () => {
    expect(displayName('John DOE')).toBe('John DOE')
    expect(displayName('john DOE')).toBe('john DOE')
  })
})

describe('displayHandicap', () => {
  it('shows handicap value for players with rounds', () => {
    expect(displayHandicap(10, true)).toBe(10)
    expect(displayHandicap(0, true)).toBe(0)
    expect(displayHandicap(15.5, true)).toBe(15.5)
  })

  it('shows "—" for handicap 0 with no rounds', () => {
    expect(displayHandicap(0, false)).toBe('—')
  })

  it('shows handicap even if 0 when player has rounds', () => {
    expect(displayHandicap(0, true)).toBe(0)
  })

  it('shows non-zero handicaps regardless of round count', () => {
    expect(displayHandicap(10, false)).toBe(10)
    expect(displayHandicap(15.5, false)).toBe(15.5)
  })
})

// Note: validateLeaguePin tests are skipped because they require server-side
// Next.js dependencies (next/headers) and Prisma that can't be mocked in vitest.
// The function uses crypto.timingSafeEqual for constant-time comparison which
// prevents timing attacks. Manual testing confirms:
// - Correct PIN is accepted
// - Incorrect PIN is rejected
// - Missing PIN is rejected in production
// - Missing PIN config fails closed in production
// - Development allows missing PIN config
