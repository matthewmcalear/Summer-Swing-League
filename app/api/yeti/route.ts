import { NextResponse, connection } from 'next/server'
import { APP_VERSION } from '@/lib/yeti/model'
import { readBoard, saveBoard } from '@/lib/yeti/store'
import { sanitizeBoard } from '@/lib/yeti/validate'

// The shared lineup board behind /yeti.
//
//   GET  /api/yeti?v=12  → { version, updatedAt, app } when nothing changed since v12,
//                          otherwise { version, updatedAt, app, board }
//   PUT  /api/yeti        { baseVersion, board, app } → 200 saved | 409 someone saved
//                          first (body has the newer board to rebase onto)
//
// `app` is the page-code version (APP_VERSION). Pages send theirs so an older
// page's save can't wipe fields it doesn't know about; the server sends its own
// so an older page can tell it should reload.

const MAX_BODY = 256 * 1024

const json = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json({ ...body, app: APP_VERSION }, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(request: Request) {
  await connection() // request-time only: never prerendered at build
  const known = Number(new URL(request.url).searchParams.get('v'))
  try {
    const { board, version, updatedAt } = await readBoard()
    if (Number.isInteger(known) && known === version) return json({ version, updatedAt })
    return json({ version, updatedAt, board })
  } catch (err) {
    console.error('[yeti] read failed', err)
    return json({ error: 'Could not load the board' }, 500)
  }
}

export async function PUT(request: Request) {
  await connection()
  const text = await request.text()
  if (text.length > MAX_BODY) return json({ error: 'Board too large' }, 413)

  let body: { baseVersion?: unknown; board?: unknown; app?: unknown }
  try {
    body = JSON.parse(text)
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const baseVersion = body?.baseVersion
  if (typeof baseVersion !== 'number' || !Number.isInteger(baseVersion) || baseVersion < 0) {
    return json({ error: 'baseVersion is required' }, 400)
  }
  const board = sanitizeBoard(body?.board)
  if (!board) return json({ error: 'Not a valid board' }, 400)

  try {
    const app = typeof body?.app === 'number' && Number.isInteger(body.app) ? body.app : undefined
    const result = await saveBoard(board, baseVersion, app)
    const { ok, ...stored } = result
    return json(stored, ok ? 200 : 409)
  } catch (err) {
    console.error('[yeti] save failed', err)
    return json({ error: 'Could not save the board' }, 500)
  }
}
