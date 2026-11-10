import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

// /sparx is private: the site's ADMIN_PASSWORD, entered once per phone. The
// cookie holds a value derived from the password, never the password, and
// outlasts the 8-hour admin session so a phone stays signed in. Changing
// ADMIN_PASSWORD signs every device out.

const COOKIE = 'sparx_session'
const MAX_AGE_S = 60 * 60 * 24 * 365

function sessionToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD
  return pw ? createHmac('sha256', pw).update('sparx-session-v1').digest('hex') : null
}

const digest = (s: string) => createHash('sha256').update(s).digest()

export function passwordMatches(password: string): boolean {
  const pw = process.env.ADMIN_PASSWORD
  return !!pw && timingSafeEqual(digest(password), digest(pw))
}

export async function hasSession(): Promise<boolean> {
  const token = sessionToken()
  const got = (await cookies()).get(COOKIE)?.value
  return !!token && !!got && timingSafeEqual(digest(got), digest(token))
}

export async function startSession(): Promise<void> {
  const token = sessionToken()
  if (!token) throw new Error('ADMIN_PASSWORD is not set')
  ;(await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_S,
    path: '/',
  })
}
