import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PUT /api/live/[id]/hole  → save strokes for one hole (and advance current_hole)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { hole, strokes, current_hole } = await request.json()
    const holeNum    = Number(hole)
    const strokesNum = Number(strokes)

    if (!Number.isInteger(holeNum) || holeNum < 1 || holeNum > 18) {
      return NextResponse.json({ error: 'hole must be 1–18' }, { status: 400 })
    }
    if (!Number.isInteger(strokesNum) || strokesNum < 1 || strokesNum > 20) {
      return NextResponse.json({ error: 'strokes must be 1–20' }, { status: 400 })
    }

    await prisma.liveHoleScore.upsert({
      where:  { live_round_id_hole: { live_round_id: params.id, hole: holeNum } },
      update: { strokes: strokesNum },
      create: { live_round_id: params.id, hole: holeNum, strokes: strokesNum },
    })

    if (current_hole !== undefined) {
      await prisma.liveRound.update({
        where: { id: params.id },
        data:  { current_hole: Number(current_hole) },
      })
    }

    const round = await prisma.liveRound.findUnique({
      where:   { id: params.id },
      include: { hole_scores: { orderBy: { hole: 'asc' } } },
    })
    return NextResponse.json(round)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to save hole' }, { status: 500 })
  }
}
