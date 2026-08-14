import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateLeaguePinOrSession, getLeaguePinSessionCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/live?member_id=...  → that member's in-progress round (or null)
export async function GET(request: Request) {
  try {
    const memberId = new URL(request.url).searchParams.get('member_id')
    // Guard against malformed ids — member_id is a UUID column, so a bad value
    // would otherwise throw at the DB layer.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!memberId || !isUuid.test(memberId)) return NextResponse.json(null)
    const round = await prisma.liveRound.findFirst({
      where:   { member_id: memberId, completed_at: null },
      orderBy: { started_at: 'desc' },
      include: { hole_scores: { orderBy: { hole: 'asc' } } },
    })
    return NextResponse.json(round)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load live round' }, { status: 500 })
  }
}

// POST /api/live  → start a round (or resume the member's existing one)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { member_id, course_id = null, course_name, holes, play_date, group_member_ids = [], league_pin } = body

    // Validate league PIN or session
    const pinCheck = validateLeaguePinOrSession(league_pin)
    if (!pinCheck.valid) {
      return NextResponse.json(
        { error: 'Invalid or missing league PIN. Ask the commissioner if you need it.' },
        { status: 403 }
      )
    }

    if (!member_id || !course_name || !holes || !play_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const holesNum = Number(holes)
    if (holesNum !== 9 && holesNum !== 18) {
      return NextResponse.json({ error: 'holes must be 9 or 18' }, { status: 400 })
    }

    const player = await prisma.member.findUnique({ where: { id: member_id } })
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    // Resume an existing in-progress round rather than starting a duplicate.
    const existing = await prisma.liveRound.findFirst({
      where:   { member_id, completed_at: null },
      include: { hole_scores: { orderBy: { hole: 'asc' } } },
    })
    if (existing) {
      const response = NextResponse.json(existing, { status: 200 })
      
      // Set session cookie if PIN was just validated
      if (pinCheck.newSession) {
        const cookie = getLeaguePinSessionCookie()
        if (cookie) response.headers.set('Set-Cookie', cookie)
      }
      
      return response
    }

    const round = await prisma.liveRound.create({
      data: {
        member_id,
        player_name:      player.full_name,
        course_id:        course_id || null,
        course_name,
        holes:            holesNum,
        play_date:        new Date(String(play_date) + 'T12:00:00'),
        group_member_ids: Array.isArray(group_member_ids) ? group_member_ids : [],
      },
      include: { hole_scores: true },
    })

    const response = NextResponse.json(round, { status: 201 })
    
    // Set session cookie if PIN was just validated
    if (pinCheck.newSession) {
      const cookie = getLeaguePinSessionCookie()
      if (cookie) response.headers.set('Set-Cookie', cookie)
    }

    return response
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to start live round' }, { status: 500 })
  }
}
