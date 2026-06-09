import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const bonuses = await prisma.seasonBonus.findMany({
    include: { member: { select: { full_name: true } } },
    orderBy: { awarded_date: 'desc' },
  })
  return NextResponse.json(bonuses.map((b) => ({
    id:           b.id,
    member_id:    b.member_id,
    member_name:  b.member.full_name,
    points:       b.points,
    reason:       b.reason,
    awarded_date: b.awarded_date.toISOString().slice(0, 10),
  })))
}

export async function POST(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { member_id, points, reason, awarded_date } = await request.json()
  if (!member_id || points == null || !reason) {
    return NextResponse.json({ error: 'member_id, points, and reason are required' }, { status: 400 })
  }
  const bonus = await prisma.seasonBonus.create({
    data: {
      member_id,
      points: Number(points),
      reason: reason.trim(),
      awarded_date: awarded_date ? new Date(awarded_date) : new Date(),
    },
    include: { member: { select: { full_name: true } } },
  })
  return NextResponse.json({
    id:           bonus.id,
    member_id:    bonus.member_id,
    member_name:  bonus.member.full_name,
    points:       bonus.points,
    reason:       bonus.reason,
    awarded_date: bonus.awarded_date.toISOString().slice(0, 10),
  })
}

export async function DELETE(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.seasonBonus.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}
