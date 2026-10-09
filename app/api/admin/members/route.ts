import { NextResponse, connection } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth'

export async function GET() {
  await connection() // request-time only: never prerendered at build
  if (!(await isAdmin())) {
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
