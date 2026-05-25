import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const STANDARD_CLUBS = [
  'Driver', '3-Wood', '5-Wood', '3-Hybrid', '4-Hybrid',
  '3-Iron', '4-Iron', '5-Iron', '6-Iron', '7-Iron', '8-Iron', '9-Iron',
  'Pitching Wedge', 'Gap Wedge', 'Sand Wedge', 'Lob Wedge', 'Putter',
]

export async function GET() {
  try {
    const rows = await prisma.clubYardage.findMany({
      select:   { club_name: true },
      distinct: ['club_name'],
      orderBy:  { club_name: 'asc' },
    })
    const fromDb  = rows.map((r) => r.club_name)
    const merged  = Array.from(new Set([...STANDARD_CLUBS, ...fromDb])).sort((a, b) => {
      const iA = STANDARD_CLUBS.indexOf(a)
      const iB = STANDARD_CLUBS.indexOf(b)
      if (iA !== -1 && iB !== -1) return iA - iB
      if (iA !== -1) return -1
      if (iB !== -1) return 1
      return a.localeCompare(b)
    })
    return NextResponse.json(merged)
  } catch {
    return NextResponse.json(STANDARD_CLUBS)
  }
}
