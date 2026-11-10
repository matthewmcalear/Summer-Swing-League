import { NextResponse } from 'next/server'
import { hasSession } from '@/lib/sparx/auth'
import { parseAction, type Action } from '@/lib/sparx/model'
import { readLedger, saveActions } from '@/lib/sparx/store'

// The ledger behind /sparx. Private: every request needs the sign-in cookie.
//
//   GET  /api/sparx                → { ledger, version }
//   POST /api/sparx { actions: [] } → { ledger, version } after applying them in order

const MAX_BODY = 64 * 1024
const MAX_ACTIONS = 100

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

const signedOut = () => json({ error: 'Sign in first' }, 401)

export async function GET() {
  if (!(await hasSession())) return signedOut()
  try {
    return json({ ...(await readLedger()) })
  } catch (err) {
    console.error('[sparx] read failed', err)
    return json({ error: 'Could not load' }, 500)
  }
}

export async function POST(request: Request) {
  if (!(await hasSession())) return signedOut()

  const text = await request.text()
  if (text.length > MAX_BODY) return json({ error: 'Too large' }, 413)

  let body: { actions?: unknown }
  try {
    body = JSON.parse(text)
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  if (!Array.isArray(body?.actions) || body.actions.length === 0 || body.actions.length > MAX_ACTIONS) {
    return json({ error: 'actions is required' }, 400)
  }
  const actions = body.actions.map(parseAction)
  if (actions.some((a) => a === null)) return json({ error: 'Invalid action' }, 400)

  try {
    return json({ ...(await saveActions(actions as Action[])) })
  } catch (err) {
    console.error('[sparx] save failed', err)
    return json({ error: 'Could not save' }, 500)
  }
}
