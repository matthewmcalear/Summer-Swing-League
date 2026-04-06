import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * One-time fix: back-fill handicap_history.recorded_at from the linked score's play_date.
 * Safe to run multiple times — only updates rows where the dates differ.
 */
export async function GET() {
  try {
    const result = await prisma.$executeRaw`
      UPDATE handicap_history hh
      SET    recorded_at = s.play_date
      FROM   scores s
      WHERE  hh.score_id = s.id
        AND  hh.recorded_at::date != s.play_date::date
    `

    return NextResponse.json({
      success: true,
      rows_updated: result,
      message: `Updated ${result} handicap history record(s) to match their round's play date.`,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
