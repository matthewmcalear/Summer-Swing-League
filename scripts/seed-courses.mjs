/**
 * Seed the course library with rating / slope / par per tee.
 * Run once to populate; re-running is safe (upserts by name + tee).
 *
 * Usage:
 *   DATABASE_URL="$(heroku config:get DATABASE_URL -a summerswingleague)" \
 *     node scripts/seed-courses.mjs
 *
 * Names match the existing plain-text course names so the library entry
 * replaces the old free-text one in the submit-score dropdown.
 *
 * Data note: White/middle tees where available (greater-Montreal courses,
 * web-sourced). Two are best-guess and flagged — verify against a scorecard:
 *   - St. Lambert: main men's tee (no separate White confirmed)
 *   - Carling Lake: back tee (no White found)
 * Parcours de Cerf is the Bleu/Vert combo, White tee (par 70).
 * Mystic Pines is a 9-hole course played twice (18 holes, par 72), Silver tee.
 * Verchères: main Verchères course (not Madeleine). The legacy score name
 * "Vercheres" is the same place — merge it into "Club De Golf Vercheres" via
 * the admin rename tool to consolidate old rounds.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const COURSES = [
  { name: 'Atlantide',                      tee_name: 'White', course_rating: 67.7, slope_rating: 120, par: 72, holes: 18 },
  { name: 'Atlantide',                      tee_name: 'Black', course_rating: 72.4, slope_rating: 127, par: 72, holes: 18 },
  { name: 'Canadian Golf And Country Club', tee_name: 'White', course_rating: 67.0, slope_rating: 118, par: 72, holes: 18 },
  { name: 'Caughnawaga',                    tee_name: 'White', course_rating: 66.7, slope_rating: 113, par: 70, holes: 18 },
  { name: 'Golf Des Îles Boucherville',     tee_name: 'White', course_rating: 65.8, slope_rating: 111, par: 70, holes: 18 },
  { name: 'Hemmingford (frontière)',        tee_name: 'White', course_rating: 70.3, slope_rating: 123, par: 71, holes: 18 },
  { name: 'La Cite (hawkesbury)',           tee_name: 'White', course_rating: 66.7, slope_rating: 119, par: 71, holes: 18 },
  { name: 'Oasis',                          tee_name: 'White', course_rating: 67.1, slope_rating: 118, par: 71, holes: 18 },
  { name: 'Rive Sud',                       tee_name: 'Blanc', course_rating: 71.2, slope_rating: 124, par: 72, holes: 18 },
  { name: 'St. Lambert',                    tee_name: 'White', course_rating: 67.3, slope_rating: 124, par: 71, holes: 18 },
  { name: 'Carling Lake',                   tee_name: 'Back',  course_rating: 72.0, slope_rating: 126, par: 72, holes: 18 },
  { name: 'Parcours de Cerf',               tee_name: 'Bleu/Vert (White)', course_rating: 66.1, slope_rating: 119, par: 70, holes: 18 },
  { name: 'Club De Golf Vercheres',         tee_name: 'White',  course_rating: 69.4, slope_rating: 114, par: 71, holes: 18 },
  { name: 'Mystic Pines',                   tee_name: 'Silver', course_rating: 69.5, slope_rating: 127, par: 72, holes: 18 },
]

async function main() {
  for (const c of COURSES) {
    const course = await prisma.course.upsert({
      where:  { name_tee_name: { name: c.name, tee_name: c.tee_name } },
      update: { course_rating: c.course_rating, slope_rating: c.slope_rating, par: c.par, holes: c.holes, is_active: true },
      create: c,
    })
    console.log(`✓ ${course.name} — ${course.tee_name} (R ${course.course_rating}/S ${course.slope_rating}, par ${course.par})`)
  }
  console.log(`\nDone — ${COURSES.length} course tees seeded.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
