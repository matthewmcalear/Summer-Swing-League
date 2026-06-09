import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth'
import { getStandings, participationMultiplier } from '@/lib/standings'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

const medalFor = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`)

/** Compose the current standings as a plain-text digest and email it to all active members. */
export async function POST() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [standings, members] = await Promise.all([
      getStandings(),
      prisma.member.findMany({ where: { is_active: true }, select: { email: true } }),
    ])

    if (!members.length) {
      return NextResponse.json({ error: 'No active members to email' }, { status: 400 })
    }

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

    const lines = standings.map((p, i) => {
      const mult  = participationMultiplier(p.totalRounds)
      const nudge = p.totalRounds > 0 && p.totalRounds < 5
        ? `  (${5 - p.totalRounds} more round${5 - p.totalRounds !== 1 ? 's' : ''} to 100% — now ${Math.round(mult * 100)}%)`
        : ''
      return `${medalFor(i)}  ${p.name} — ${p.seasonScore.toFixed(1)} pts · ${p.totalRounds} round${p.totalRounds !== 1 ? 's' : ''}${nudge}`
    })

    const body = [
      `⛳ Summer Swing League — Standings as of ${today}`,
      '',
      ...lines,
      '',
      'Season score = best 5 rounds × participation multiplier + improvement bonus + tournament bonuses.',
      'Full standings, charts, and head-to-heads: https://www.sslgolf.com/standings',
      '',
      'Play more, earn more. See you out there! 🏌️',
    ].join('\n')

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'matthew.mcalear@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: '"Summer Swing League" <matthew.mcalear@gmail.com>',
      to: members.map((m) => m.email).join(', '),
      subject: `⛳ SSL Standings — ${today}`,
      text: body,
      html: body.replace(/\n/g, '<br>'),
    })

    return NextResponse.json({ sent: members.length })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to send digest' }, { status: 500 })
  }
}
