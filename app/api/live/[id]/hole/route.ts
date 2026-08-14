import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateLeaguePinOrSession, getLeaguePinSessionCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// PUT /api/live/[id]/hole  → save strokes for one hole (and advance current_hole)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { hole, strokes, putts, par, current_hole, league_pin } = body

    // Validate league PIN or session
    const pinCheck = validateLeaguePinOrSession(league_pin)
    if (!pinCheck.valid) {
      return NextResponse.json(
        { error: 'Invalid or missing league PIN. Ask the commissioner if you need it.' },
        { status: 403 }
      )
    }
    const holeNum    = Number(hole)
    const strokesNum = Number(strokes)

    if (!Number.isInteger(holeNum) || holeNum < 1 || holeNum > 18) {
      return NextResponse.json({ error: 'hole must be 1–18' }, { status: 400 })
    }
    if (!Number.isInteger(strokesNum) || strokesNum < 1 || strokesNum > 20) {
      return NextResponse.json({ error: 'strokes must be 1–20' }, { status: 400 })
    }

    const puttsNum = putts === undefined || putts === null || putts === '' ? null : Number(putts)
    if (puttsNum !== null && (!Number.isInteger(puttsNum) || puttsNum < 0 || puttsNum > 15)) {
      return NextResponse.json({ error: 'putts must be 0–15' }, { status: 400 })
    }
    const parNum = par === undefined ? 4 : Number(par)
    if (!Number.isInteger(parNum) || parNum < 3 || parNum > 6) {
      return NextResponse.json({ error: 'par must be 3–6' }, { status: 400 })
    }

    await prisma.liveHoleScore.upsert({
      where:  { live_round_id_hole: { live_round_id: params.id, hole: holeNum } },
      update: { strokes: strokesNum, putts: puttsNum, par: parNum },
      create: { live_round_id: params.id, hole: holeNum, strokes: strokesNum, putts: puttsNum, par: parNum },
    })

    if (current_hole !== undefined) {
      await prisma.liveRound.update({
        where: { id: params.id },
        data:  { current_hole: Number(current_hole) },
      })
    }

    const round = await prisma.liveRound.findUnique({
      where:   { id: params.id },
      include: { hole_scores: { orderBy: { hole: 'asc' } } },
    })

    const response = NextResponse.json(round)
    
    // Set session cookie if PIN was just validated
    if (pinCheck.newSession) {
      const cookie = getLeaguePinSessionCookie()
      if (cookie) response.headers.set('Set-Cookie', cookie)
    }

    return response
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to save hole' }, { status: 500 })
  }
}
