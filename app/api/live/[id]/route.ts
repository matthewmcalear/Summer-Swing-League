import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/live/[id] → a round with its hole scores
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const round = await prisma.liveRound.findUnique({
      where:   { id: params.id },
      include: { hole_scores: { orderBy: { hole: 'asc' } } },
    })
    if (!round) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(round)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load round' }, { status: 500 })
  }
}

// DELETE /api/live/[id] → abandon an in-progress round (cascades hole scores)
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.liveRound.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete round' }, { status: 500 })
  }
}
