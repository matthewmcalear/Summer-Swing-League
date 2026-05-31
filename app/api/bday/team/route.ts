import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH /api/bday/team — update team name
export async function PATCH(request: Request) {
  const { teamId, name } = await request.json()
  if (!teamId || !name?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const team = await prisma.bdayTeam.update({
    where: { id: teamId },
    data:  { name: name.trim() },
  })
  return NextResponse.json(team)
}
