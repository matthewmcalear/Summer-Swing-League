import { prisma } from '@/lib/prisma'
import MyBagClient from './MyBagLoader'
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
  return <MyBagPage />
}

async function MyBagPage() {
  'use cache'
  leagueCache() // refreshed on any league write + hourly

  const members = await prisma.member.findMany({
    where:   { is_active: true },
    select:  { id: true, full_name: true },
    orderBy: { full_name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🎒 My Bag</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Save your club distances — the rangefinder will recommend a club when you drop a pin.
        </p>
      </div>
      <MyBagClient members={members} />
    </div>
  )
}
