import { createHmac } from 'crypto'
import { cookies } from 'next/headers'

/**
 * Admin session token: HMAC of a fixed label keyed by ADMIN_PASSWORD.
 * The cookie never contains the password itself, so a leaked cookie
 * can't reveal it. Changing ADMIN_PASSWORD invalidates all sessions.
 */
export function adminSessionToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD
  if (!pw) return null
  return createHmac('sha256', pw).update('ssl-admin-session-v1').digest('hex')
}

export function isAdmin(): boolean {
  const token = adminSessionToken()
  return token != null && cookies().get('ssl_admin')?.value === token
}
