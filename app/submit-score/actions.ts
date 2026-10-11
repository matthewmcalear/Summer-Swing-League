'use server'

import { updateTag } from 'next/cache'
import { recordRound, type RecordRoundInput } from '@/lib/recordRound'
import { LEAGUE_TAG } from '@/lib/cache'

export type SubmitRoundResult =
  | { ok: true; scoreId: string }
  | { ok: false; possibleDuplicate: true; existing: { play_date: string; course_name: string; gross_score: number; total_points: number } }
  | { ok: false; possibleDuplicate?: false; error: string }

/**
 * Record a round from the submit form. Same rules as POST /api/scores (kept for
 * other callers), but as a Server Action: `updateTag` expires the league cache and
 * the client router cache in one round trip, so the player sees their round in the
 * standings immediately.
 */
export async function submitRound(input: RecordRoundInput): Promise<SubmitRoundResult> {
  if (input.handicap_used === undefined || Number.isNaN(Number(input.handicap_used))) {
    return { ok: false, error: 'Missing required fields' }
  }
  try {
    const result = await recordRound(input)
    if ('error' in result) return { ok: false, error: result.error }
    if ('possibleDuplicate' in result) return { ok: false, possibleDuplicate: true, existing: result.existing }
    updateTag(LEAGUE_TAG)
    return { ok: true, scoreId: result.score.id }
  } catch (e) {
    console.error(e)
    return { ok: false, error: 'Failed to submit. Please try again.' }
  }
}
