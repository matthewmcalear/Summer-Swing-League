import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function isAdmin() {
  const cookieStore = cookies()
  return cookieStore.get('ssl_admin')?.value === process.env.ADMIN_PASSWORD
}

function toTitleCase(str: string): string {
  return str.trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const scores = await prisma.score.findMany({ select: { course_name: true } })
    const counts: Record<string, number> = {}
    scores.forEach((s) => { counts[s.course_name] = (counts[s.course_name] ?? 0) + 1 })
    const result = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
    return NextResponse.json(result)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { old_name, new_name } = await request.json()
    if (!old_name || !new_name) {
      return NextResponse.json({ error: 'old_name and new_name required' }, { status: 400 })
    }
    const normalized = toTitleCase(new_name)
    const result = await prisma.score.updateMany({
      where: { course_name: old_name },
      data:  { course_name: normalized },
    })
    return NextResponse.json({ updated: result.count, new_name: normalized })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to rename course' }, { status: 500 })
  }
}
