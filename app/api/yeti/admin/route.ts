import { NextResponse, connection } from 'next/server'
import { isAdmin as isSiteAdmin } from '@/lib/auth'
import { adminStatus, endSession, isConfigured, passwordMatches, startSession } from '@/lib/yeti/admin'

// Unlocks roster editing on /yeti for this phone (see lib/yeti/admin.ts).
//
//   GET    → { admin, site }   whether this phone may change the roster
//   POST   { password }        → 200 unlocked | 401 wrong password
//   DELETE                     → locks this phone again → { admin, site }

const json = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET() {
  await connection()
  return json(await adminStatus())
}

export async function POST(request: Request) {
  await connection()
  if (!isConfigured()) return json({ error: 'No admin password is set' }, 500)

  let password: unknown
  try {
    ;({ password } = await request.json())
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  if (typeof password !== 'string' || !passwordMatches(password)) {
    await new Promise((r) => setTimeout(r, 750)) // slow down guessing
    return json({ error: 'Wrong password' }, 401)
  }

  await startSession()
  return json({ admin: true })
}

export async function DELETE() {
  await connection()
  await endSession()
  // A phone signed in to the SSL admin stays unlocked; that sign-in isn't ours to end.
  const site = await isSiteAdmin()
  return json({ admin: site, site })
}
