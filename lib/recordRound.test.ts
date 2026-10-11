import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => ({
  member: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  score: { findMany: vi.fn(), create: vi.fn() },
  course: { findUnique: vi.fn() },
  handicapHistory: { create: vi.fn() },
}))
vi.mock('./prisma', () => ({ prisma: db }))
vi.mock('./scoring', async (importOriginal) => ({ ...(await importOriginal<typeof import('./scoring')>()), SEASON_FINAL: false }))

import { recordRound } from './recordRound'

const input = {
  member_id: 'm1', holes: 18, gross_score: 95, course_name: 'Golf Ste-Rose',
  play_date: '2026-10-08', handicap_used: 20,
}

describe('recordRound duplicate guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.member.findUnique.mockResolvedValue({ id: 'm1', current_handicap: 20 })
  })

  it('looks up existing rounds by the stored (title-cased) course name, case-insensitively', async () => {
    db.score.findMany.mockResolvedValue([
      { id: 's1', play_date: new Date('2026-10-08T12:00:00'), course_name: 'Golf Ste-rose', gross_score: 94, total_points: 40 },
    ])
    const result = await recordRound(input)
    expect(db.score.findMany.mock.calls[0][0].where.course_name).toEqual({ equals: 'Golf Ste-rose', mode: 'insensitive' })
    expect(result).toMatchObject({ possibleDuplicate: true, existing: { id: 's1', gross_score: 94 } })
  })

  it('skips the check and records the round when the player confirms the duplicate', async () => {
    db.member.findMany.mockResolvedValue([])
    db.score.create.mockResolvedValue({ id: 's2' })
    const result = await recordRound({ ...input, confirm_duplicate: true })
    expect(db.score.findMany).not.toHaveBeenCalled()
    expect(db.score.create.mock.calls[0][0].data.course_name).toBe('Golf Ste-rose')
    expect(result).toEqual({ score: { id: 's2' } })
  })
})

describe('recordRound after the season is final', () => {
  it('rejects new rounds once SEASON_FINAL is set', async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.doMock('./scoring', async (importOriginal) => ({ ...(await importOriginal<typeof import('./scoring')>()), SEASON_FINAL: true }))
    const { recordRound: closedRecordRound } = await import('./recordRound')
    db.member.findUnique.mockResolvedValue({ id: 'm1', current_handicap: 20 })
    const result = await closedRecordRound({ member_id: 'm1', holes: 18, gross_score: 95, course_name: 'Golf Ste-Rose', play_date: '2026-10-08', handicap_used: 20 })
    expect(result).toEqual({ error: 'The 2026 season is closed — final standings are locked.', status: 403 })
    expect(db.score.create).not.toHaveBeenCalled()
  })
})
