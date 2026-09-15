import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth'
import { OpenError, applyOpenUpdate, isUuid, parseOpenUpdate } from '@/lib/open-validation'
import { scoringCodeMatches } from '@/lib/open-server'

export const dynamic = 'force-dynamic'

// PUT /api/ssl-open/players/[id] → save one hole, declare a mode, or declare Double Down.
// Authorized by the admin cookie or the player's group scoring code. Optimistic
// versioning stops two phones in the same group from overwriting each other.
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!isUuid(params.id)) throw new OpenError('Player not found.', 404)
    const update = parseOpenUpdate(await request.json().catch(() => null))

    const player = await prisma.sslOpenPlayer.findUnique({
      where: { id: params.id },
      include: {
        group: { select: { scoring_code: true } },
        event: { select: { finalized_at: true } },
      },
    })
    if (!player) throw new OpenError('Player not found.', 404)
    if (!isAdmin() && !scoringCodeMatches(update.scoringCode, player.group.scoring_code)) {
      throw new OpenError('That scoring code does not unlock this group.', 403)
    }
    if (player.event.finalized_at) throw new OpenError('Results are posted; scoring is closed.', 409)

    const changes = applyOpenUpdate(player, update)
    const result = await prisma.sslOpenPlayer.updateMany({
      where: { id: player.id, version: update.version },
      data: { ...changes, version: { increment: 1 } },
    })
    if (result.count !== 1) {
      throw new OpenError('This scorecard changed on another device. Refresh and try again.', 409)
    }
    return NextResponse.json({ success: true, version: update.version + 1 }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    if (e instanceof OpenError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Failed to save. Please try again.' }, { status: 500 })
  }
}
