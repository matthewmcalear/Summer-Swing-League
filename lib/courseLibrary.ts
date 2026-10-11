import { prisma } from '@/lib/prisma'

export type LibraryCourse = {
  id: string
  name: string
  tee_name: string
  course_rating: number
  slope_rating: number
  par: number
  holes: number
  hole_pars: number[] // per-hole pars learned from live rounds (empty until known)
}

/**
 * The course library, plus distinct course names from past rounds so the submit
 * form still has suggestions for courses that aren't in the library yet.
 */
export async function loadCourseLibrary(): Promise<{ courses: LibraryCourse[]; legacyNames: string[] }> {
  const [courses, legacyRows] = await Promise.all([
    prisma.course.findMany({
      where: { is_active: true },
      orderBy: [{ name: 'asc' }, { tee_name: 'asc' }],
      select: { id: true, name: true, tee_name: true, course_rating: true, slope_rating: true, par: true, holes: true, hole_pars: true },
    }),
    prisma.score.findMany({
      select: { course_name: true },
      distinct: ['course_name'],
      orderBy: { course_name: 'asc' },
    }),
  ])
  return { courses, legacyNames: legacyRows.map((r) => r.course_name) }
}
