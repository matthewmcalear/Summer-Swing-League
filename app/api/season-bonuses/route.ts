import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const bonuses = await prisma.seasonBonus.findMany({
    include: { member: { select: { full_name: true } } },
    orderBy: { awarded_date: 'desc' },
  })
  return NextResponse.json(bonuses.map((b) => ({
    id:           b.id,
    member_name:  b.member.full_name,
    points:       b.points,
    reason:       b.reason,
    awarded_date: b.awarded_date.toISOString().slice(0, 10),
  })))
}
