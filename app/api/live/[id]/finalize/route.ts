import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/live/[id]/finalize
// Called after a live round is submitted via the score form. Persists the
// round's per-hole pars back to its course (so they prefill next time), then
// removes the now-consumed live round.
export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const round = await prisma.liveRound.findUnique({
      where:   { id: params.id },
      include: { hole_scores: { orderBy: { hole: 'asc' } } },
    })
    if (!round) return NextResponse.json({ success: true }) // already gone — nothing to do

    // Save pars to the course only for a full round of that course (so a 9-hole
    // round at an 18-hole course never overwrites the 18-hole pars).
    if (round.course_id && round.hole_scores.length === round.holes) {
      const course = await prisma.course.findUnique({ where: { id: round.course_id } })
      if (course && course.holes === round.holes) {
        const pars = round.hole_scores.map((h) => h.par)
        await prisma.course.update({ where: { id: course.id }, data: { hole_pars: pars } })
      }
    }

    await prisma.liveRound.delete({ where: { id: round.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to finalize round' }, { status: 500 })
  }
}
