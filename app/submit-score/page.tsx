import { Suspense } from 'react'
import { connection } from 'next/server'
import { getPlayersAndCourses } from '@/lib/formData'
import PageSkeleton from '@/components/PageSkeleton'
import SubmitScoreForm from './SubmitScoreForm'

export default function SubmitScorePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Live />
    </Suspense>
  )
}

// Per request (never build-time HTML), from the in-memory league cache.
async function Live() {
  await connection()
  const { members, courses, legacyNames } = await getPlayersAndCourses()
  return <SubmitScoreForm members={members} courses={courses} legacyNames={legacyNames} />
}
