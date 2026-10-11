import { prisma } from '@/lib/prisma'
import { leagueCache } from '@/lib/cache'
import { loadCourseLibrary } from '@/lib/courseLibrary'

/**
 * Active players and the course library for the submit and live-scoring forms.
 * Cached with the rest of the league data, so the forms render pre-filled instead
 * of fetching after load.
 */
export async function getPlayersAndCourses() {
  'use cache'
  leagueCache()
  const [members, library] = await Promise.all([
    prisma.member.findMany({
      where: { is_active: true },
      orderBy: { full_name: 'asc' },
      select: { id: true, full_name: true, current_handicap: true },
    }),
    loadCourseLibrary(),
  ])
  // Names already covered by a library course shouldn't appear twice.
  const libNames = new Set(library.courses.map((c) => c.name))
  return {
    members: members.map((m) => ({ ...m, current_handicap: Number(m.current_handicap) })),
    courses: library.courses,
    legacyNames: library.legacyNames.filter((n) => !libNames.has(n)),
  }
}
