import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { groupCode, lat, lon } = await request.json()
  if (!groupCode || lat == null || lon == null) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const group = await prisma.bdayGroup.update({
    where: { code: groupCode.toUpperCase() },
    data:  { location_lat: lat, location_lon: lon, location_at: new Date() },
  })
  return NextResponse.json({ ok: true, group_id: group.id })
}
