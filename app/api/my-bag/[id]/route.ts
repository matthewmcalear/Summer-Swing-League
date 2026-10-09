import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { invalidateLeague } from '@/lib/cache'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await prisma.clubYardage.delete({ where: { id } })
    invalidateLeague()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
