import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const groups = await prisma.bdayGroup.findMany({
    orderBy: { name: 'asc' },
    include: {
      teams: {
        include: {
          hole_scores:        { orderBy: { hole: 'asc' } },
          activities:         { orderBy: { logged_at: 'desc' } },
          mulligans_sent:     { include: { target: { select: { name: true } } } },
          mulligans_received: { include: { sender: { select: { name: true } } }, orderBy: { fired_at: 'desc' } },
        },
      },
    },
  })

  const enriched = groups.map((g) => ({
    id:           g.id,
    name:         g.name,
    code:         g.code,
    location_lat: g.location_lat,
    location_lon: g.location_lon,
    location_at:  g.location_at,
    teams: g.teams.map((t) => {
      const beers           = t.activities.filter((a) => a.type === 'beer').length
      const hotdogs         = t.activities.filter((a) => a.type === 'hotdog').length
      const hotdog_discount = Math.floor(hotdogs / 3)
      const mulligansSent   = t.mulligans_sent.length
      const mulliganBank    = Math.max(0, beers - mulligansSent)
      const total           = t.hole_scores.reduce((s, h) => s + h.strokes, 0)
      return {
        id:                 t.id,
        name:               t.name,
        group_id:           t.group_id,
        beers,
        hotdogs,
        hotdog_discount,    // informational only — teams apply this themselves
        mulligan_bank:      mulliganBank,
        mulligans_sent:     mulligansSent,
        mulligans_received: t.mulligans_received.map((m) => ({
          id:          m.id,
          sender_name: m.sender.name,
          hole:        m.hole,
          fired_at:    m.fired_at,
        })),
        hole_scores:  t.hole_scores.map((h) => ({ hole: h.hole, strokes: h.strokes })),
        holes_played: t.hole_scores.length,
        total,
      }
    }),
  }))

  // Build activity feed from all activities + mulligans, combined and sorted
  const allActivities = groups.flatMap((g) =>
    g.teams.flatMap((t) =>
      t.activities.map((a) => ({
        id:        a.id,
        timestamp: a.logged_at,
        type:      a.type as 'beer' | 'hotdog',
        message:   a.type === 'beer'
          ? `🍺 ${t.name} (${g.name}) shotgunned a beer${a.hole ? ` on hole ${a.hole}` : ''}`
          : `🌭 ${t.name} (${g.name}) ate a hot dog${a.hole ? ` on hole ${a.hole}` : ''}`,
      }))
    )
  )

  const allMulligans = groups.flatMap((g) =>
    g.teams.flatMap((t) =>
      t.mulligans_sent.map((m) => ({
        id:        m.id,
        timestamp: m.fired_at,
        type:      'mulligan' as const,
        message:   `💀 ${t.name} (${g.name}) reverse mulligan'd ${m.target.name}${m.hole ? ` on hole ${m.hole}` : ''}`,
      }))
    )
  )

  const feed = [...allActivities, ...allMulligans]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const rawMessages = await prisma.bdayMessage.findMany({
    orderBy: { sent_at: 'desc' },
    take: 60,
  })
  const messages = rawMessages.reverse().map((m) => ({
    id: m.id, sender_name: m.sender_name, text: m.text, sent_at: m.sent_at,
  }))

  return NextResponse.json({ groups: enriched, feed, messages })
}
