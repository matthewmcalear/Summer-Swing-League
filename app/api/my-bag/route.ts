import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const memberId = searchParams.get('memberId')
  if (!memberId) return NextResponse.json([])

  try {
    const clubs = await prisma.clubYardage.findMany({
      where:   { member_id: memberId },
      orderBy: { yards: 'desc' },
    })
    return NextResponse.json(clubs)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const { member_id, club_name, yards } = await request.json()
    if (!member_id || !club_name || yards == null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const club = await prisma.clubYardage.upsert({
      where:  { member_id_club_name: { member_id, club_name: club_name.trim() } },
      update: { yards: Number(yards) },
      create: { member_id, club_name: club_name.trim(), yards: Number(yards) },
    })
    return NextResponse.json(club)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to save club' }, { status: 500 })
  }
}
