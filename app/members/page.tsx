import { prisma } from '@/lib/prisma'
import MembersClient from './MembersClient'
import { getHandicapSuggestions } from '@/lib/handicapSuggestions'
import type { Member } from '@/types'
import { leagueCache } from '@/lib/cache'
import { Suspense } from 'react'
import { connection } from 'next/server'
import PageSkeleton from '@/components/PageSkeleton'

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Live />
    </Suspense>
  )
}

// Rendered per request — never baked into build-time HTML, which Heroku restores on
// every dyno restart — from an in-memory cache that any league write expires.
async function Live() {
  await connection()
  return <MembersPage />
}

async function MembersPage() {
  'use cache'
  leagueCache() // refreshed on any league write + hourly

  const [rows, suggestions, scores] = await Promise.all([
    prisma.member.findMany({
      where:   { is_active: true },
      orderBy: { full_name: 'asc' },
    }),
    getHandicapSuggestions(),
    prisma.score.findMany({
      select: { member_id: true },
    }),
  ])

  // Count rounds per member
  const roundCounts = new Map<string, number>()
  for (const score of scores) {
    if (score.member_id) {
      roundCounts.set(score.member_id, (roundCounts.get(score.member_id) ?? 0) + 1)
    }
  }

  const members: Member[] = rows.map((m) => ({
    id:                m.id,
    full_name:         m.full_name,
    email:             m.email ?? undefined,
    current_handicap:  Number(m.current_handicap),
    starting_handicap: m.starting_handicap ? Number(m.starting_handicap) : null,
    is_active:         m.is_active,
    created_at:        m.created_at.toISOString(),
    round_count:       roundCounts.get(m.id) ?? 0,
  }))

  return <MembersClient members={members} suggestions={suggestions} />
}
