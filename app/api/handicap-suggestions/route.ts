import { NextResponse, connection } from 'next/server'
import { getHandicapSuggestions } from '@/lib/handicapSuggestions'

export async function GET() {
  await connection() // request-time only: never prerendered at build
  try {
    const suggestions = await getHandicapSuggestions()
    return NextResponse.json(suggestions)
  } catch (e) {
    console.error(e)
    return NextResponse.json({}, { status: 500 })
  }
}
