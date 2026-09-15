import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth'
import { recordRound } from '@/lib/recordRound'
import { groupPartners, projectOpen } from '@/lib/open-scoring'
import { OPEN_EVENT_ID } from '@/lib/open-types'
import type { OpenEvent } from '@/lib/open-types'
import { OpenError } from '@/lib/open-validation'
import { loadStoredEvent, serializeEvent } from '@/lib/open-server'

export const dynamic = 'force-dynamic'

const ordinal = (rank: number) => `${rank}${['th', 'st', 'nd', 'rd'][rank % 100 > 10 && rank % 100 < 14 ? 0 : rank % 10] ?? 'th'}`
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

// POST /api/ssl-open/finalize → post every complete card as an official SSL round
// and every earned finish bonus as a season bonus, then lock scoring.
// Each player is linked to the rows created for them, so re-running after a
// failure continues where it stopped instead of posting anything twice.
export async function POST() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const stored = await loadStoredEvent()
    if (!stored) throw new OpenError('The Open has not been set up yet.', 404)
    if (stored.finalized_at) throw new OpenError('Results were already posted to the SSL standings.', 409)

    const now = new Date()
    // Rank exactly as the posted board will: complete cards only, no-shows out of the group count.
    const event: OpenEvent = { ...serializeEvent(stored, false), finalizedAt: now.toISOString() }
    const projections = projectOpen(event)
    const finished = projections.filter((projection) => projection.holesPlayed === 18)
    if (finished.length === 0) throw new OpenError('Nobody has a complete 18-hole card yet.')
    const skipped = projections.filter((projection) => projection.holesPlayed < 18).map((projection) => projection.player.name)
    const pendingTies: string[] = []

    for (const projection of finished) {
      const { player } = projection
      const group = event.groups.find((candidate) => candidate.id === projection.groupId)!
      const partnerIds = groupPartners(group, player, event).map((partner) => partner.memberId)

      if (!player.scoreId) {
        const result = await recordRound({
          member_id: player.memberId,
          holes: 18,
          gross_score: projection.gross,
          course_name: event.courseName,
          course_id: event.courseId,
          play_date: event.playDate,
          handicap_used: player.handicap,
          course_difficulty: event.difficulty,
          group_member_ids: partnerIds,
          notes: 'SSL Open 2026 — scored live, hole by hole',
          confirm_duplicate: true,
        })
        if ('error' in result) throw new OpenError(`${player.name}: ${result.error}`, result.status)
        if ('possibleDuplicate' in result) throw new OpenError(`${player.name}: a matching round already exists.`, 409)
        await prisma.sslOpenPlayer.update({ where: { id: player.id }, data: { score_id: result.score.id } })
      }

      if (projection.finishBonus === null) {
        // The published rules have no podium tiebreak; the commissioner awards this one by hand.
        pendingTies.push(player.name)
        continue
      }
      if (projection.finishBonus > 0 && !player.bonusId) {
        const mode = player.mode ? `${capitalize(player.mode)} mode` : 'mode undeclared'
        const doubled = projection.doubleDownStatus === 'won' ? ', Double Down ×2' : ''
        const bonus = await prisma.seasonBonus.create({
          data: {
            member_id: player.memberId,
            points: projection.finishBonus,
            reason: `SSL Open 2026 — ${ordinal(projection.rank!)} place, ${mode}${doubled}`,
            awarded_date: new Date(`${event.playDate}T00:00:00Z`),
          },
        })
        await prisma.sslOpenPlayer.update({ where: { id: player.id }, data: { bonus_id: bonus.id } })
      }
    }

    await prisma.sslOpenEvent.update({ where: { id: OPEN_EVENT_ID }, data: { finalized_at: now } })
    return NextResponse.json(
      { success: true, posted: finished.length, skipped, pendingTies },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    if (e instanceof OpenError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Failed to post the Open results. Nothing posted so far is duplicated if you try again.' }, { status: 500 })
  }
}
