import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { teamId, hole, strokes } = await request.json()
  if (!teamId || !hole || strokes == null) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (hole < 1 || hole > 18)              return NextResponse.json({ error: 'Invalid hole' },   { status: 400 })
  if (strokes < 1 || strokes > 20)        return NextResponse.json({ error: 'Invalid strokes' }, { status: 400 })

  const score = await prisma.bdayHoleScore.upsert({
    where:  { team_id_hole: { team_id: teamId, hole } },
    update: { strokes },
    create: { team_id: teamId, hole, strokes },
  })
  return NextResponse.json(score)
}

export async function DELETE(request: Request) {
  const { teamId, hole } = await request.json()
  if (!teamId || !hole) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  await prisma.bdayHoleScore.deleteMany({ where: { team_id: teamId, hole } })
  return NextResponse.json({ ok: true })
}
