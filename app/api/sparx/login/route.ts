import { NextResponse } from 'next/server'
import { passwordMatches, startSession } from '@/lib/sparx/auth'

export async function POST(request: Request) {
  if (!process.env.ADMIN_PASSWORD) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  let password: unknown
  try {
    ;({ password } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (typeof password !== 'string' || !passwordMatches(password)) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  await startSession()
  return NextResponse.json({ ok: true })
}
