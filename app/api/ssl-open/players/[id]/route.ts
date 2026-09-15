import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OpenError, applyOpenUpdate, isUuid, parseOpenUpdate } from '@/lib/open-validation'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

// PUT /api/ssl-open/players/[id] → save one hole, declare a mode, call Double Down, or move
// to another group. Open to everyone in the field, like the rest of the site. Optimistic
// versioning stops two phones editing the same card from overwriting each other.
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!isUuid(params.id)) throw new OpenError('Player not found.', 404)
    const update = parseOpenUpdate(await request.json().catch(() => null))

    const player = await prisma.sslOpenPlayer.findUnique({
      where: { id: params.id },
      include: { event: { select: { finalized_at: true } } },
    })
    if (!player) throw new OpenError('Player not found.', 404)
    if (player.event.finalized_at) throw new OpenError('Results are posted; scoring is closed.', 409)
    if (player.version !== update.version) throw new OpenError('This scorecard changed on another device. Refresh and try again.', 409)

    if (update.kind === 'group') {
      if (update.groupId !== player.group_id) {
        const group = await prisma.sslOpenGroup.findUnique({
          where: { id: update.groupId },
          include: { players: { select: { sort_order: true } } },
        })
        if (!group || group.event_id !== player.event_id) throw new OpenError('That group is not part of the Open.', 404)
        const sortOrder = group.players.reduce((max, other) => Math.max(max, other.sort_order + 1), 0)
        const moved = await prisma.sslOpenPlayer.updateMany({
          where: { id: player.id, version: update.version },
          data: { group_id: group.id, sort_order: sortOrder, version: { increment: 1 } },
        })
        if (moved.count !== 1) throw new OpenError('This scorecard changed on another device. Refresh and try again.', 409)
      }
      return NextResponse.json({ success: true }, { headers: NO_STORE })
    }

    const changes = applyOpenUpdate(player, update)
    const result = await prisma.sslOpenPlayer.updateMany({
      where: { id: player.id, version: update.version },
      data: { ...changes, version: { increment: 1 } },
    })
    if (result.count !== 1) throw new OpenError('This scorecard changed on another device. Refresh and try again.', 409)
    return NextResponse.json({ success: true, version: update.version + 1 }, { headers: NO_STORE })
  } catch (e) {
    if (e instanceof OpenError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Failed to save. Please try again.' }, { status: 500 })
  }
}
