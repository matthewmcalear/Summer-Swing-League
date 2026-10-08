import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params
  try {
    const history = await prisma.handicapHistory.findMany({
      where:   { member_id: memberId },
      orderBy: { recorded_at: 'asc' },
    })
    return NextResponse.json(history)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
