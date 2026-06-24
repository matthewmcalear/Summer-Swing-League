import { prisma } from '@/lib/prisma'
import MembersClient from './MembersClient'
import { getHandicapSuggestions } from '@/lib/handicapSuggestions'
import type { Member } from '@/types'

export const dynamic = 'force-dynamic'

export default async function MembersPage() {
  const [rows, suggestions] = await Promise.all([
    prisma.member.findMany({
      where:   { is_active: true },
      orderBy: { full_name: 'asc' },
    }),
    getHandicapSuggestions(),
  ])

  const members: Member[] = rows.map((m) => ({
    id:                m.id,
    full_name:         m.full_name,
    email:             m.email ?? undefined,
    current_handicap:  Number(m.current_handicap),
    starting_handicap: m.starting_handicap ? Number(m.starting_handicap) : null,
    is_active:         m.is_active,
    created_at:        m.created_at.toISOString(),
  }))

  return <MembersClient members={members} suggestions={suggestions} />
}
