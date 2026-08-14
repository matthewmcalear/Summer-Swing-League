import { createHmac, timingSafeEqual } from 'crypto'
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

/**
 * Validate the league PIN using timing-safe comparison.
 * Returns true if the PIN matches. In production, rejects if no PIN is configured.
 * In development, allows if no PIN is configured (so local dev isn't blocked).
 */
export function validateLeaguePin(submittedPin: string | undefined | null): boolean {
  const configuredPin = process.env.LEAGUE_PIN

  // Production: fail closed if PIN is not configured
  if (process.env.NODE_ENV === 'production' && !configuredPin) {
    return false
  }

  // Development: allow if PIN is not configured
  if (!configuredPin) {
    return true
  }

  // No PIN submitted
  if (!submittedPin) {
    return false
  }

  // Timing-safe comparison to prevent timing attacks
  try {
    const configuredBuf = Buffer.from(configuredPin, 'utf8')
    const submittedBuf = Buffer.from(submittedPin, 'utf8')

    // timingSafeEqual requires equal-length buffers
    if (configuredBuf.length !== submittedBuf.length) {
      return false
    }

    return timingSafeEqual(configuredBuf, submittedBuf)
  } catch {
    return false
  }
}
