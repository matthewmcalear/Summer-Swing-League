import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { teamId, hole, player } = await request.json()
  if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 })

  const activity = await prisma.bdayActivity.create({
    data: { team_id: teamId, type: 'beer', hole: hole ?? null, player: player ?? null },
  })
  return NextResponse.json(activity)
}

export async function DELETE(request: Request) {
  const { teamId } = await request.json()
  if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 })

  const latest = await prisma.bdayActivity.findFirst({
    where: { team_id: teamId, type: 'beer' },
    orderBy: { logged_at: 'desc' },
  })
  if (!latest) return NextResponse.json({ error: 'No beers to remove' }, { status: 404 })

  await prisma.bdayActivity.delete({ where: { id: latest.id } })
  return NextResponse.json({ ok: true })
}
