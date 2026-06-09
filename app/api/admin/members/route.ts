import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const members = await prisma.member.findMany({ orderBy: { full_name: 'asc' } })
    return NextResponse.json(members)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}
