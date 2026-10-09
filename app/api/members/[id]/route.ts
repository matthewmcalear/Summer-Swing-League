import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth'
import { invalidateLeague } from '@/lib/cache'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (body.full_name          !== undefined) updates.full_name          = body.full_name
    if (body.email              !== undefined) updates.email              = body.email.toLowerCase()
    if (body.current_handicap   !== undefined) updates.current_handicap   = Number(body.current_handicap)
    if (body.starting_handicap  !== undefined) updates.starting_handicap  = body.starting_handicap === null ? null : Number(body.starting_handicap)

    const member = await prisma.member.update({ where: { id }, data: updates })
    invalidateLeague()
    return NextResponse.json(member)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.member.delete({ where: { id } })
    invalidateLeague()
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 })
  }
}
