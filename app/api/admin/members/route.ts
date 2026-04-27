import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function isAdmin() {
  const cookieStore = cookies()
  return cookieStore.get('ssl_admin')?.value === process.env.ADMIN_PASSWORD
}

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
