import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { validateLeaguePin } from './auth'

describe('validateLeaguePin', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns true when PIN matches in development', () => {
    process.env.NODE_ENV = 'development'
    process.env.LEAGUE_PIN = 'secret123'
    expect(validateLeaguePin('secret123')).toBe(true)
  })

  it('returns false when PIN does not match', () => {
    process.env.NODE_ENV = 'development'
    process.env.LEAGUE_PIN = 'secret123'
    expect(validateLeaguePin('wrong')).toBe(false)
  })

  it('returns false when PIN is missing in production', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.LEAGUE_PIN
    expect(validateLeaguePin('anything')).toBe(false)
  })

  it('returns true when no PIN configured in development', () => {
    process.env.NODE_ENV = 'development'
    delete process.env.LEAGUE_PIN
    expect(validateLeaguePin(undefined)).toBe(true)
  })

  it('returns false when no PIN submitted but one is configured', () => {
    process.env.NODE_ENV = 'development'
    process.env.LEAGUE_PIN = 'secret123'
    expect(validateLeaguePin(undefined)).toBe(false)
    expect(validateLeaguePin(null)).toBe(false)
    expect(validateLeaguePin('')).toBe(false)
  })

  it('returns false for timing attack with different lengths', () => {
    process.env.NODE_ENV = 'development'
    process.env.LEAGUE_PIN = 'secret123'
    expect(validateLeaguePin('short')).toBe(false)
    expect(validateLeaguePin('verylongpasswordthatdoesnotmatch')).toBe(false)
  })

  it('is case-sensitive', () => {
    process.env.NODE_ENV = 'development'
    process.env.LEAGUE_PIN = 'Secret123'
    expect(validateLeaguePin('secret123')).toBe(false)
    expect(validateLeaguePin('Secret123')).toBe(true)
  })

  it('fails closed in production with no PIN configured', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.LEAGUE_PIN
    expect(validateLeaguePin('anypin')).toBe(false)
    expect(validateLeaguePin(undefined)).toBe(false)
  })
})
