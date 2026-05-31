import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(request: Request) {
  const { activityId } = await request.json()
  if (!activityId) return NextResponse.json({ error: 'Missing activityId' }, { status: 400 })
  await prisma.bdayActivity.delete({ where: { id: activityId } })
  return NextResponse.json({ ok: true })
}
