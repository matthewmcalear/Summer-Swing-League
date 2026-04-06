import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// One-time migration to add new columns. Safe to run multiple times.
// Visit: /api/migrate?key=YOUR_ADMIN_PASSWORD

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('key') !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const applied: string[] = []

  // Add starting_handicap column if it doesn't exist
  await prisma.$executeRawUnsafe(`
    ALTER TABLE members
    ADD COLUMN IF NOT EXISTS starting_handicap NUMERIC(5,1)
  `)
  applied.push('members.starting_handicap (nullable)')

  return NextResponse.json({ success: true, applied })
}
