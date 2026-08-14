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

/**
 * Generate a session token for the league PIN (HMAC of label keyed by PIN).
 * Similar to admin token - cookie never contains the PIN itself.
 */
function leaguePinSessionToken(): string | null {
  const pin = process.env.LEAGUE_PIN
  if (!pin) return null
  return createHmac('sha256', pin).update('ssl-league-pin-session-v1').digest('hex')
}

/**
 * Check if the current request has a valid league PIN session cookie.
 */
export function hasLeaguePinSession(): boolean {
  const token = leaguePinSessionToken()
  return token != null && cookies().get('ssl_league_pin')?.value === token
}

/**
 * Validate league PIN or session for live-round routes.
 * Checks if the user has a valid session cookie OR a valid PIN.
 * Returns { valid: true, newSession: boolean } if authorized.
 * Set newSession=true when the PIN was just validated (caller should set cookie).
 */
export function validateLeaguePinOrSession(submittedPin: string | undefined | null): {
  valid: boolean
  newSession: boolean
} {
  // Check if there's a valid session cookie
  if (hasLeaguePinSession()) {
    return { valid: true, newSession: false }
  }

  // Check the submitted PIN
  if (validateLeaguePin(submittedPin)) {
    return { valid: true, newSession: true }
  }

  return { valid: false, newSession: false }
}

/**
 * Get the Set-Cookie header for the league PIN session.
 * Call this when a PIN is successfully validated to establish a session.
 */
export function getLeaguePinSessionCookie(): string | null {
  const token = leaguePinSessionToken()
  if (!token) return null
  
  // HttpOnly, Secure in production, SameSite=Lax, 7-day expiry
  const maxAge = 7 * 24 * 60 * 60 // 7 days in seconds
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `ssl_league_pin=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
}
