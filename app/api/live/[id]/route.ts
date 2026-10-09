import { NextResponse, connection } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/live/[id] → a round with its hole scores
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection() // request-time only: never prerendered at build
  const { id } = await params
  try {
    const round = await prisma.liveRound.findUnique({
      where:   { id },
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
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await prisma.liveRound.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete round' }, { status: 500 })
  }
}
