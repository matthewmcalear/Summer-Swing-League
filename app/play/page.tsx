import { Suspense } from 'react'
import { connection } from 'next/server'
import { getPlayersAndCourses } from '@/lib/formData'
import PageSkeleton from '@/components/PageSkeleton'
import SeasonClosed from '@/components/SeasonClosed'
import { SEASON_FINAL } from '@/lib/scoring'
import PlayClient from './PlayClient'

export default function PlayPage() {
  if (SEASON_FINAL) return <SeasonClosed />
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Live />
    </Suspense>
  )
}

// Per request (never build-time HTML), from the in-memory league cache.
async function Live() {
  await connection()
  const { members, courses } = await getPlayersAndCourses()
  return <PlayClient members={members} courses={courses} />
}
