/**
 * Seed Dan's Birthday Event — run once to create groups and teams.
 * Edit GROUPS below to set real team names before the day.
 *
 * Usage:
 *   DATABASE_URL="$(heroku config:get DATABASE_URL -a summerswingleague)?sslmode=require" \
 *     node scripts/seed-bday.mjs
 *
 * Re-running is safe — upserts by group code.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const GROUPS = [
  {
    code: 'GROUP1',
    name: 'Group 1',
    teams: ['Dan & Jackson', 'Doug & Tom'],
  },
  {
    code: 'GROUP2',
    name: 'Group 2',
    teams: ['Nick & Tibi', 'Dad & Grant'],
  },
  {
    code: 'GROUP3',
    name: 'Group 3',
    teams: ['Matt & Bill', 'TBD'],
  },
  {
    code: 'GROUP4',
    name: 'Group 4',
    teams: ['Nick N & Peter', 'Jody & Alex'],
  },
]

async function main() {
  for (const g of GROUPS) {
    const group = await prisma.bdayGroup.upsert({
      where:  { code: g.code },
      update: { name: g.name },
      create: { code: g.code, name: g.name },
    })
    console.log(`✓ Group ${g.code} — ${group.id}`)

    const existing = await prisma.bdayTeam.findMany({ where: { group_id: group.id } })

    for (let i = 0; i < g.teams.length; i++) {
      if (existing[i]) {
        await prisma.bdayTeam.update({ where: { id: existing[i].id }, data: { name: g.teams[i] } })
        console.log(`  ↺ Updated team: ${g.teams[i]}`)
      } else {
        await prisma.bdayTeam.create({ data: { group_id: group.id, name: g.teams[i] } })
        console.log(`  + Created team: ${g.teams[i]}`)
      }
    }
  }
  console.log('\nDone.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
