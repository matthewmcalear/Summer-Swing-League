import { describe, expect, it } from 'vitest'
import { LEAGUE_SITE, leagueGameUrl } from './league'
import { YETI_SCHEDULE } from './schedule'

describe('leagueGameUrl', () => {
  // Addresses copied from westmounthockey.com's schedule (Nov 2026).
  it('builds the league page for a home game (away team first)', () => {
    expect(leagueGameUrl({ date: '2026-11-24', opponent: 'Lightning', home: true })).toBe('https://westmounthockey.com/games/2026-11-24-687471-687468')
  })

  it('builds the league page for an away game', () => {
    expect(leagueGameUrl({ date: '2026-09-22', opponent: 'Devils', home: false })).toBe('https://westmounthockey.com/games/2026-09-22-687468-687465')
  })

  it('ignores case and spacing in the opponent', () => {
    expect(leagueGameUrl({ date: '2027-03-09', opponent: ' hawks ', home: true })).toBe('https://westmounthockey.com/games/2027-03-09-687467-687468')
  })

  it('has no page when home/away or the opponent is unknown', () => {
    expect(leagueGameUrl({ date: '2026-11-24', opponent: 'Lightning', home: null })).toBeNull()
    expect(leagueGameUrl({ date: '2026-11-24', opponent: 'Alumni', home: true })).toBeNull()
    expect(leagueGameUrl({ date: '2026-11-24', opponent: '', home: true })).toBeNull()
    expect(leagueGameUrl({ date: '2026-11-24', opponent: 'Yeti', home: true })).toBeNull()
  })

  it('uses the league site’s own address for Dec 8, which it files under the wrong team', () => {
    expect(leagueGameUrl({ date: '2026-12-08', opponent: 'Coyotes', home: false })).toBe('https://westmounthockey.com/games/2026-12-08-687471-687466')
  })

  it('gives every scheduled game a page', () => {
    for (const g of YETI_SCHEDULE) expect(leagueGameUrl(g)).toMatch(/^https:\/\/westmounthockey\.com\/games\/\d{4}-\d{2}-\d{2}-\d+-\d+$/)
  })

  it('links the team page', () => {
    expect(LEAGUE_SITE.url).toBe('https://westmounthockey.com/teams/687468')
  })
})
