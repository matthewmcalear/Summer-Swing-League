import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await prisma.score.findMany({
      select: { course_name: true },
      distinct: ['course_name'],
      orderBy: { course_name: 'asc' },
    })
    return NextResponse.json(rows.map((r) => r.course_name))
  } catch {
    return NextResponse.json([])
  }
}
