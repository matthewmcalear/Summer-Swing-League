import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// DELETE — wipe all event data (scores, beers, hotdogs, mulligans, locations)
// Keeps groups and teams intact so you can use it to reset before the real day.
export async function DELETE() {
  await prisma.$transaction([
    prisma.bdayMulligan.deleteMany(),
    prisma.bdayActivity.deleteMany(),
    prisma.bdayHoleScore.deleteMany(),
    prisma.bdayMessage.deleteMany(),
    prisma.bdayGroup.updateMany({
      data: { location_lat: null, location_lon: null, location_at: null },
    }),
  ])
  return NextResponse.json({ ok: true })
}
