import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth'
import { OPEN_DATE, OPEN_EVENT_ID } from '@/lib/open-types'
import { OpenError, parseOpenSetup } from '@/lib/open-validation'
import { loadOpenState, newScoringCode } from '@/lib/open-server'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

// GET /api/ssl-open?code=…  → event + season inputs for the live board.
// The optional group scoring code unlocks score entry for that group.
export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get('code')
    return NextResponse.json(await loadOpenState(code), { headers: NO_STORE })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load the Open leaderboard' }, { status: 500 })
  }
}

// POST /api/ssl-open → commissioner creates the event: course snapshot, three groups, fixed handicaps.
export async function POST(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const setup = parseOpenSetup(await request.json().catch(() => null))

    const existing = await prisma.sslOpenEvent.findUnique({ where: { id: OPEN_EVENT_ID }, select: { id: true } })
    if (existing) throw new OpenError('The Open is already set up. Reset it before creating it again.', 409)

    const course = await prisma.course.findUnique({ where: { id: setup.courseId } })
    if (!course || !course.is_active) throw new OpenError('Choose a course from the course library.', 404)
    if (course.holes !== 18) throw new OpenError('The Open needs an 18-hole course.')
    const parTotal = setup.holePars.reduce((sum, par) => sum + par, 0)
    if (parTotal !== course.par) throw new OpenError(`The hole pars total ${parTotal} but the course par is ${course.par}.`)

    const memberIds = setup.groups.flatMap((group) => group.memberIds)
    const members = await prisma.member.findMany({ where: { id: { in: memberIds } } })
    const membersById = new Map(members.map((member) => [member.id, member]))
    for (const id of memberIds) {
      const member = membersById.get(id)
      if (!member) throw new OpenError('One of the selected players is not a league member.', 404)
      if (!member.is_active) throw new OpenError(`${member.full_name} is not an active member.`)
    }

    await prisma.$transaction(async (tx) => {
      await tx.sslOpenEvent.create({
        data: {
          id: OPEN_EVENT_ID,
          course_id: course.id,
          course_name: course.name,
          tee_name: course.tee_name,
          play_date: new Date(`${OPEN_DATE}T00:00:00Z`),
          course_rating: course.course_rating,
          slope_rating: course.slope_rating,
          course_par: course.par,
          hole_pars: setup.holePars,
          difficulty: setup.difficulty,
        },
      })
      for (let groupIndex = 0; groupIndex < setup.groups.length; groupIndex += 1) {
        const group = setup.groups[groupIndex]
        const created = await tx.sslOpenGroup.create({
          data: {
            event_id: OPEN_EVENT_ID,
            name: group.name,
            tee_time: group.teeTime,
            sort_order: groupIndex,
            scoring_code: newScoringCode(),
          },
        })
        await tx.sslOpenPlayer.createMany({
          data: group.memberIds.map((memberId, playerIndex) => {
            const member = membersById.get(memberId)!
            return {
              event_id: OPEN_EVENT_ID,
              group_id: created.id,
              member_id: member.id,
              player_name: member.full_name,
              handicap: Number(member.current_handicap),
              sort_order: playerIndex,
              scores: Array<number>(18).fill(0),
            }
          }),
        })
      }
      // Remember the card so the next live round at this course prefills its pars.
      if (course.hole_pars.length !== 18) {
        await tx.course.update({ where: { id: course.id }, data: { hole_pars: setup.holePars } })
      }
    })

    return NextResponse.json(await loadOpenState(null), { status: 201, headers: NO_STORE })
  } catch (e) {
    if (e instanceof OpenError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Failed to create the Open' }, { status: 500 })
  }
}

// DELETE /api/ssl-open → commissioner wipes the setup (and any live scores) before results are posted.
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
