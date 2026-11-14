import { describe, expect, it } from 'vitest'
import { marketExposure } from './exposure'

const o = (label: string, shares: number, price: number, dead = false) => ({ label, shares, price, dead })

describe('marketExposure', () => {
  it('is what was taken in minus the shares held on whichever outcome wins', () => {
    // $30 in; 40 shares on Yes, 10 on No.
    const e = marketExposure(3000, [o('Yes', 40, 0.7), o('No', 10, 0.3)], false)
    expect(e.worstCents).toBe(-1000)
    expect(e.worstLabel).toBe('Yes')
    expect(e.bestCents).toBe(2000)
    expect(e.expectedCents).toBe(3000 - 2800 - 300)
    expect(e.ifWins.map((x) => x.label)).toEqual(['Yes', 'No'])
  })

  it('ignores outcomes that can no longer win', () => {
    const e = marketExposure(2000, [o('Megan', 50, 0, true), o('Jack', 5, 0.6), o('Jody', 0, 0.4)], false)
    expect(e.worstCents).toBe(1500)
    expect(e.worstLabel).toBe('Jack')
    expect(e.bestCents).toBe(2000)
  })

  it('has nothing at stake with no bets', () => {
    const e = marketExposure(0, [o('Yes', 0, 0.5), o('No', 0, 0.5)], false)
    expect([e.worstCents, e.bestCents, e.expectedCents]).toEqual([0, 0, 0])
  })

  it('is one fixed number once the result is in', () => {
    // Yes won: price holds the payout per share.
    const e = marketExposure(3000, [o('Yes', 40, 1), o('No', 10, 0)], true)
    expect([e.worstCents, e.bestCents, e.expectedCents]).toEqual([-1000, -1000, -1000])
  })
})
