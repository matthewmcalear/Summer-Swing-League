import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const members = await prisma.member.findMany({
      orderBy: { full_name: 'asc' },
      select: {
        id: true,
        full_name: true,
        current_handicap: true,
        starting_handicap: true,
        is_active: true,
        created_at: true,
      },
    })
    return NextResponse.json(members)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { full_name, email, current_handicap } = await request.json()

    if (!full_name || !email) {
      return NextResponse.json({ error: 'full_name and email are required' }, { status: 400 })
    }

    const handicap = Number(current_handicap)
    if (isNaN(handicap) || handicap < 0) {
      return NextResponse.json({ error: 'Invalid handicap value' }, { status: 400 })
    }

    const member = await prisma.member.create({
      data: {
        full_name:        full_name.trim(),
        email:            email.trim().toLowerCase(),
        current_handicap: handicap,
      },
    })

    // Record initial handicap in history
    await prisma.handicapHistory.create({
      data: { member_id: member.id, handicap, score_id: null },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'A member with that email already exists' }, { status: 409 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Failed to register member' }, { status: 500 })
  }
}
