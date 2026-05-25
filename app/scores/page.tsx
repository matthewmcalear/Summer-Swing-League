import { prisma } from '@/lib/prisma'
import ScoresClient from './ScoresClient'
import type { Score, SeasonBonus } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ScoresPage() {
  const [rawScores, rawBonuses] = await Promise.all([
    prisma.score.findMany({ orderBy: [{ play_date: 'desc' }, { created_at: 'desc' }] }),
    prisma.seasonBonus.findMany({
      include: { member: { select: { full_name: true } } },
      orderBy: { awarded_date: 'desc' },
    }),
  ])

  const scores: Score[] = rawScores.map((s) => ({
    id:                    s.id,
    member_id:             s.member_id,
    player_name:           s.player_name,
    holes:                 s.holes as 9 | 18,
    gross_score:           s.gross_score,
    handicap_used:         Number(s.handicap_used),
    course_name:           s.course_name,
    course_difficulty:     s.course_difficulty as 'easy' | 'average' | 'tough',
    difficulty_multiplier: Number(s.difficulty_multiplier),
    group_member_ids:      s.group_member_ids as string[],
    group_member_names:    s.group_member_names,
    group_size:            s.group_size,
    base_points:           Number(s.base_points),
    group_bonus:           Number(s.group_bonus),
    additional_points:     Number(s.additional_points),
    total_points:          Number(s.total_points),
    play_date:             s.play_date.toISOString(),
    notes:                 s.notes,
    created_at:            s.created_at.toISOString(),
  }))

  const bonuses: (SeasonBonus & { member_name: string; member_id: string })[] = rawBonuses.map((b) => ({
    id:           b.id,
    member_id:    b.member_id,
    member_name:  b.member.full_name,
    points:       b.points,
    reason:       b.reason,
    awarded_date: b.awarded_date.toISOString().slice(0, 10),
  }))

  return <ScoresClient scores={scores} bonuses={bonuses} />
}
