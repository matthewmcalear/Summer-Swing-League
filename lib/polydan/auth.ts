import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '../prisma'

// Family accounts: a name plus a PIN the admin hands out. The session is a
// signed cookie "<userId>.<expiresAt>.<hmac>", scoped to /polydan; no session
// table needed. Separate from the SSL admin login (lib/auth.ts).

const COOKIE = 'pd_session'
const MAX_AGE_S = 60 * 60 * 24 * 90

// POLYDAN_SESSION_SECRET if set; otherwise a key derived from DATABASE_URL, so
// the app needs no extra config var. (If Heroku rotates the database
// credentials, everyone just logs in again with their PIN.)
function secret(): string {
  const explicit = process.env.POLYDAN_SESSION_SECRET
  if (explicit && explicit.length >= 32) return explicit
  const db = process.env.DATABASE_URL
  if (!db) throw new Error('POLYDAN_SESSION_SECRET or DATABASE_URL must be set')
  return createHash('sha256').update(`polydan-session:${db}`).digest('hex')
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  const a = Buffer.from(hash, 'hex')
  const b = scryptSync(pin, salt, 32)
  return a.length === b.length && timingSafeEqual(a, b)
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export async function startSession(userId: number): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S
  const payload = `${userId}.${exp}`
  ;(await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_S,
    path: '/polydan',
  })
}

export async function endSession(): Promise<void> {
  ;(await cookies()).delete({ name: COOKIE, path: '/polydan' })
}

async function sessionUserId(): Promise<number | null> {
  const raw = (await cookies()).get(COOKIE)?.value
  if (!raw) return null
  const [id, exp, mac] = raw.split('.')
  const expected = sign(`${id}.${exp}`)
  if (!mac || mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null
  if (Number(exp) < Date.now() / 1000) return null
  return Number(id)
}

export async function currentUser() {
  const id = await sessionUserId()
  if (!id) return null
  return prisma.pdUser.findUnique({ where: { id }, select: { id: true, name: true, isAdmin: true } })
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser()
  if (!user) redirect('/polydan/login')
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (!user.isAdmin) redirect('/polydan')
  return user
}
