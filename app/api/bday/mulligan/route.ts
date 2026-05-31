import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { senderTeamId, targetTeamId, hole } = await request.json()
  if (!senderTeamId || !targetTeamId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (senderTeamId === targetTeamId)  return NextResponse.json({ error: 'Cannot target yourself' }, { status: 400 })

  // Check mulligan bank: beers earned - mulligans already sent
  const [beerCount, sentCount] = await Promise.all([
    prisma.bdayActivity.count({ where: { team_id: senderTeamId, type: 'beer' } }),
    prisma.bdayMulligan.count({ where: { sender_id: senderTeamId } }),
  ])
  if (sentCount >= beerCount) {
    return NextResponse.json({ error: 'No mulligans available — shotgun a beer first!' }, { status: 400 })
  }

  const mulligan = await prisma.bdayMulligan.create({
    data: { sender_id: senderTeamId, target_id: targetTeamId, hole: hole ?? null },
  })
  return NextResponse.json(mulligan)
}
