import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordRound } from '@/lib/recordRound'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const scores = await prisma.score.findMany({
      orderBy: [{ play_date: 'desc' }, { created_at: 'desc' }],
    })
    return NextResponse.json(scores)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // handicap_used is required on the manual submit form.
    if (body.handicap_used === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const result = await recordRound(body)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ success: true, score: result.score }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 })
  }
}
