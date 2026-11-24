import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { isAdmin as isSiteAdmin } from '@/lib/auth'

// Changing skill levels on /yeti needs a password: YETI_ADMIN_PASSWORD when it's
// set (so the team's line-setter can have one without getting into the SSL
// admin), otherwise the site's ADMIN_PASSWORD. Being signed in to the SSL admin
// counts too. The cookie holds a value derived from the password, never the
// password, and lasts a year so a phone stays unlocked; changing the password
// locks every phone.

const COOKIE = 'yeti_admin'
const COOKIE_PATH = '/api/yeti'
const MAX_AGE_S = 60 * 60 * 24 * 365

function password(): string | null {
  return process.env.YETI_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || null
}

export const isConfigured = () => password() !== null

function sessionToken(): string | null {
  const pw = password()
  return pw ? createHmac('sha256', pw).update('yeti-admin-session-v1').digest('hex') : null
}

const digest = (s: string) => createHash('sha256').update(s).digest()

export function passwordMatches(input: string): boolean {
  const pw = password()
  return !!pw && timingSafeEqual(digest(input), digest(pw))
}

/** admin: may change skill levels. site: that's because of the SSL admin sign-in (so locking here won't undo it). */
export async function adminStatus(): Promise<{ admin: boolean; site: boolean }> {
  const token = sessionToken()
  const got = (await cookies()).get(COOKIE)?.value
  const yeti = !!token && !!got && timingSafeEqual(digest(got), digest(token))
  const site = await isSiteAdmin()
  return { admin: yeti || site, site }
}

export async function isYetiAdmin(): Promise<boolean> {
  return (await adminStatus()).admin
}

export async function startSession(): Promise<void> {
  const token = sessionToken()
  if (!token) throw new Error('No Yeti admin password is set')
  ;(await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_S,
    path: COOKIE_PATH,
  })
}

export async function endSession(): Promise<void> {
  ;(await cookies()).set(COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: COOKIE_PATH,
  })
}
