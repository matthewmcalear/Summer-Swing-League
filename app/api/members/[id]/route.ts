import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

function isAdmin() {
  return cookies().get('ssl_admin')?.value === process.env.ADMIN_PASSWORD
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (body.full_name        !== undefined) updates.full_name        = body.full_name
    if (body.email            !== undefined) updates.email            = body.email.toLowerCase()
    if (body.current_handicap !== undefined) updates.current_handicap = Number(body.current_handicap)

    const member = await prisma.member.update({ where: { id: params.id }, data: updates })
    return NextResponse.json(member)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.member.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 })
  }
}
