import { NextResponse } from 'next/server'
import { getHandicapSuggestions } from '@/lib/handicapSuggestions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const suggestions = await getHandicapSuggestions()
    return NextResponse.json(suggestions)
  } catch (e) {
    console.error(e)
    return NextResponse.json({}, { status: 500 })
  }
}
