import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth'
import { OPEN_EVENT_ID } from '@/lib/open-types'
import { OpenError } from '@/lib/open-validation'
import { loadOpenState } from '@/lib/open-server'

export const dynamic = 'force-dynamic'

// GET /api/ssl-open → the Open board: event (created automatically from the announced
// field and the course library on first load), season inputs, and whether the viewer is admin.
export async function GET() {
  try {
    return NextResponse.json(await loadOpenState(), { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load the Open leaderboard' }, { status: 500 })
  }
}

// DELETE /api/ssl-open → commissioner wipes the event (and any live scores) before results are
// posted. The next visit recreates it from the announced field and the current course library entry.
export async function DELETE() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const event = await prisma.sslOpenEvent.findUnique({ where: { id: OPEN_EVENT_ID }, select: { finalized_at: true } })
    if (!event) return NextResponse.json({ success: true })
    if (event.finalized_at) throw new OpenError('Results are already posted to the SSL standings; the Open can no longer be reset.', 409)
    await prisma.sslOpenEvent.delete({ where: { id: OPEN_EVENT_ID } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof OpenError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Failed to reset the Open' }, { status: 500 })
  }
}
