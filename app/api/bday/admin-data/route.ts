import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const groups = await prisma.bdayGroup.findMany({
    orderBy: { name: 'asc' },
    include: {
      teams: {
        include: {
          hole_scores:    { orderBy: { hole: 'asc' } },
          activities:     { orderBy: { logged_at: 'desc' } },
          mulligans_sent: {
            include: { target: { select: { name: true } } },
            orderBy: { fired_at: 'desc' },
          },
          mulligans_received: {
            include: { sender: { select: { name: true } } },
            orderBy: { fired_at: 'desc' },
          },
        },
      },
    },
  })

  const result = groups.map((g) => ({
    id:   g.id,
    name: g.name,
    code: g.code,
    teams: g.teams.map((t) => ({
      id:      t.id,
      name:    t.name,
      player1: t.player1,
      player2: t.player2,
      hole_scores: t.hole_scores.map((h) => ({ hole: h.hole, strokes: h.strokes })),
      activities: t.activities.map((a) => ({
        id:         a.id,
        type:       a.type,
        hole:       a.hole,
        player:     a.player,
        logged_at:  a.logged_at,
      })),
      mulligans_sent: t.mulligans_sent.map((m) => ({
        id:          m.id,
        target_name: m.target.name,
        hole:        m.hole,
        fired_at:    m.fired_at,
      })),
      mulligans_received: t.mulligans_received.map((m) => ({
        id:          m.id,
        sender_name: m.sender.name,
        hole:        m.hole,
        fired_at:    m.fired_at,
      })),
    })),
  }))

  return NextResponse.json({ groups: result })
}
