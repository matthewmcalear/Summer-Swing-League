import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { OPEN_EVENT_ID } from '@/lib/open-types'
import { OpenError, parseOpenJoin } from '@/lib/open-validation'
import { loadOpenState } from '@/lib/open-server'

export const dynamic = 'force-dynamic'

// POST /api/ssl-open/players → an active league member who is not in the announced field
// joins the Open in a group of their choice. Handicap is frozen at today's value, as for everyone else.
export async function POST(request: Request) {
  try {
    const join = parseOpenJoin(await request.json().catch(() => null))
    const [event, member, group] = await Promise.all([
      prisma.sslOpenEvent.findUnique({ where: { id: OPEN_EVENT_ID }, select: { finalized_at: true } }),
      prisma.member.findUnique({ where: { id: join.memberId } }),
      prisma.sslOpenGroup.findUnique({ where: { id: join.groupId }, include: { players: { select: { member_id: true, sort_order: true } } } }),
    ])
    if (!event) throw new OpenError('The Open has not been set up yet. Reload the page.', 404)
    if (event.finalized_at) throw new OpenError('Results are posted; the field is closed.', 409)
    if (!member || !member.is_active) throw new OpenError('Only active league members can join. Register first.', 404)
    if (!group || group.event_id !== OPEN_EVENT_ID) throw new OpenError('That group is not part of the Open.', 404)

    try {
      await prisma.sslOpenPlayer.create({
        data: {
          event_id: OPEN_EVENT_ID,
          group_id: group.id,
          member_id: member.id,
          player_name: member.full_name,
          handicap: Number(member.current_handicap),
          sort_order: group.players.reduce((max, other) => Math.max(max, other.sort_order + 1), 0),
          scores: Array<number>(18).fill(0),
        },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new OpenError(`${member.full_name} is already in the Open. Find them in the player list.`, 409)
      }
      throw error
    }
    return NextResponse.json(await loadOpenState(), { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    if (e instanceof OpenError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Failed to join the Open. Please try again.' }, { status: 500 })
  }
}
