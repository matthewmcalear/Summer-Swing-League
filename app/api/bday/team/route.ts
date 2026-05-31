import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH /api/bday/team — update team name and/or group
export async function PATCH(request: Request) {
  const { teamId, name, groupId } = await request.json()
  if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 })

  const data: { name?: string; group_id?: string } = {}
  if (name?.trim())  data.name     = name.trim()
  if (groupId)       data.group_id = groupId

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const team = await prisma.bdayTeam.update({ where: { id: teamId }, data })
  return NextResponse.json(team)
}

// POST /api/bday/team — add a new team to a group
export async function POST(request: Request) {
  const { groupId, name } = await request.json()
  if (!groupId || !name?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const team = await prisma.bdayTeam.create({ data: { group_id: groupId, name: name.trim() } })
  return NextResponse.json(team)
}

// DELETE /api/bday/team — remove a team (and all its data)
export async function DELETE(request: Request) {
  const { teamId } = await request.json()
  if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 })

  await prisma.bdayTeam.delete({ where: { id: teamId } })
  return NextResponse.json({ ok: true })
}
