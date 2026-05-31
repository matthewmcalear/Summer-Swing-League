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
