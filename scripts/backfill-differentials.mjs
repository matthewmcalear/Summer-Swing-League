/**
 * Backfill WHS score differentials onto existing rounds, so suggested
 * handicaps appear for players from their historical scores (no re-entry).
 *
 * For each round WITHOUT a differential yet, match it to a library course by
 * name + holes, assume the White/middle tee (old rounds don't record the tee),
 * and compute the differential with the SAME formula as lib/handicap.ts.
 *
 * Usage:
 *   DATABASE_URL="$(heroku config:get DATABASE_URL -a summerswingleague)" \
 *     node scripts/backfill-differentials.mjs
 *
 * Idempotent: only fills rounds where score_differential IS NULL, so it never
 * overwrites a round submitted with a real (player-picked) tee.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mirror of lib/handicap.ts scoreDifferential (kept in sync manually).
function scoreDifferential(gross, courseRating, slopeRating, holes) {
  if (![gross, courseRating, slopeRating].every(Number.isFinite) || slopeRating <= 0) return null
  const raw = (113 / slopeRating) * (gross - courseRating)
  const diff = holes === 9 ? raw * 2 : raw
  return Math.round(diff * 10) / 10
}

// Prefer the White/middle tee when a course has more than one at the same hole count.
function pickTee(courses) {
  const byName = ['White', 'Blanc', 'Silver']
  for (const t of byName) {
    const m = courses.find((c) => c.tee_name === t)
    if (m) return m
  }
  return courses[0]
}

async function main() {
  const courses = await prisma.course.findMany({ where: { is_active: true } })

  // key: `${name}__${holes}` → chosen course (one tee)
  const lookup = new Map()
  const grouped = {}
  for (const c of courses) {
    const k = `${c.name}__${c.holes}`
    ;(grouped[k] ??= []).push(c)
  }
  for (const [k, list] of Object.entries(grouped)) lookup.set(k, pickTee(list))

  const scores = await prisma.score.findMany({
    where: { score_differential: null },
    select: { id: true, course_name: true, holes: true, gross_score: true },
  })

  let updated = 0
  const unmatched = {}

  for (const s of scores) {
    const course = lookup.get(`${s.course_name}__${s.holes}`)
    if (!course) {
      unmatched[`${s.course_name} (${s.holes}h)`] = (unmatched[`${s.course_name} (${s.holes}h)`] ?? 0) + 1
      continue
    }
    const diff = scoreDifferential(s.gross_score, course.course_rating, course.slope_rating, s.holes)
    if (diff == null) continue

    await prisma.score.update({
      where: { id: s.id },
      data: {
        course_id:          course.id,
        course_rating:      course.course_rating,
        slope_rating:       course.slope_rating,
        course_par:         course.par,
        score_differential: diff,
      },
    })
    updated++
  }

  console.log(`✓ Backfilled ${updated} round(s) with a score differential.`)
  const skips = Object.entries(unmatched)
  if (skips.length) {
    console.log(`\nSkipped (no library course matching name + holes):`)
    for (const [name, n] of skips.sort((a, b) => b[1] - a[1])) console.log(`  ${n.toString().padStart(3)} × ${name}`)
  }
  console.log('\nDone.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
