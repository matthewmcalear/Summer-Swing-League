import { NextResponse } from 'next/server'
import { getStandings } from '@/lib/standings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const standings = await getStandings()
    return NextResponse.json(standings, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 })
  }
}
