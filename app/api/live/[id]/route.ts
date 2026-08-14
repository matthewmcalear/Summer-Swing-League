import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateLeaguePinOrSession, getLeaguePinSessionCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/live/[id] → a round with its hole scores
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const round = await prisma.liveRound.findUnique({
      where:   { id: params.id },
      include: { hole_scores: { orderBy: { hole: 'asc' } } },
    })
    if (!round) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(round)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load round' }, { status: 500 })
  }
}

// DELETE /api/live/[id] → abandon an in-progress round (cascades hole scores)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // Read league_pin from query params or body
    const url = new URL(request.url)
    const queryPin = url.searchParams.get('league_pin')
    let bodyPin: string | undefined
    try {
      const body = await request.json()
      bodyPin = body.league_pin
    } catch {
      // No body or invalid JSON
    }
    const league_pin = bodyPin || queryPin

    // Validate league PIN or session
    const pinCheck = validateLeaguePinOrSession(league_pin)
    if (!pinCheck.valid) {
      return NextResponse.json(
        { error: 'Invalid or missing league PIN. Ask the commissioner if you need it.' },
        { status: 403 }
      )
    }
    
    await prisma.liveRound.delete({ where: { id: params.id } })
    
    const response = NextResponse.json({ success: true })
    if (pinCheck.newSession) {
      const cookie = getLeaguePinSessionCookie()
      if (cookie) response.headers.set('Set-Cookie', cookie)
    }
    
    return response
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete round' }, { status: 500 })
  }
}
