import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.name          !== undefined) updates.name          = String(body.name).trim()
    if (body.tee_name      !== undefined) updates.tee_name      = String(body.tee_name).trim()
    if (body.is_active     !== undefined) updates.is_active     = Boolean(body.is_active)
    if (body.course_rating !== undefined) {
      const v = Number(body.course_rating)
      if (!Number.isFinite(v) || v < 50 || v > 85) {
        return NextResponse.json({ error: 'Course rating must be between 50 and 85' }, { status: 400 })
      }
      updates.course_rating = v
    }
    if (body.slope_rating !== undefined) {
      const v = Number(body.slope_rating)
      if (!Number.isInteger(v) || v < 55 || v > 155) {
        return NextResponse.json({ error: 'Slope rating must be 55–155' }, { status: 400 })
      }
      updates.slope_rating = v
    }
    if (body.par !== undefined) {
      const v = Number(body.par)
      if (!Number.isInteger(v) || v < 27 || v > 80) {
        return NextResponse.json({ error: 'Par must be 27–80' }, { status: 400 })
      }
      updates.par = v
    }
    if (body.holes !== undefined) {
      const v = Number(body.holes)
      if (v !== 9 && v !== 18) return NextResponse.json({ error: 'Holes must be 9 or 18' }, { status: 400 })
      updates.holes = v
    }

    const course = await prisma.course.update({ where: { id: params.id }, data: updates })
    return NextResponse.json(course)
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'That course + tee already exists' }, { status: 409 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await prisma.course.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
  }
}
