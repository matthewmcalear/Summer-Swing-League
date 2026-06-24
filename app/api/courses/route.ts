import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// List the course library. Falls back to distinct names from past scores so the
// submit form still has suggestions even before any courses are configured.
export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      where: { is_active: true },
      orderBy: [{ name: 'asc' }, { tee_name: 'asc' }],
    })

    const legacyRows = await prisma.score.findMany({
      select: { course_name: true },
      distinct: ['course_name'],
      orderBy: { course_name: 'asc' },
    })

    return NextResponse.json({
      courses,
      legacyNames: legacyRows.map((r) => r.course_name),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ courses: [], legacyNames: [] })
  }
}

function parseCourse(body: any): { error?: string; data?: any } {
  const name = String(body?.name ?? '').trim()
  const tee_name = String(body?.tee_name ?? '').trim()
  const course_rating = Number(body?.course_rating)
  const slope_rating = Number(body?.slope_rating)
  const par = Number(body?.par)
  const holes = Number(body?.holes ?? 18)

  if (!name) return { error: 'Course name is required' }
  if (!Number.isFinite(course_rating) || course_rating < 50 || course_rating > 85) {
    return { error: 'Course rating must be between 50 and 85' }
  }
  if (!Number.isInteger(slope_rating) || slope_rating < 55 || slope_rating > 155) {
    return { error: 'Slope rating must be a whole number between 55 and 155' }
  }
  if (!Number.isInteger(par) || par < 27 || par > 80) {
    return { error: 'Par must be a whole number between 27 and 80' }
  }
  if (holes !== 9 && holes !== 18) return { error: 'Holes must be 9 or 18' }

  return { data: { name, tee_name, course_rating, slope_rating, par, holes } }
}

export async function POST(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { error, data } = parseCourse(await request.json())
    if (error) return NextResponse.json({ error }, { status: 400 })

    const course = await prisma.course.create({ data })
    return NextResponse.json(course, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'That course + tee already exists' }, { status: 409 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 })
  }
}
