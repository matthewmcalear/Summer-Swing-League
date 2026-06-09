import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminSessionToken } from '@/lib/auth'

export async function POST(request: Request) {
  const { password } = await request.json()

  const token = adminSessionToken()
  if (!process.env.ADMIN_PASSWORD || !token) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 })
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const cookieStore = cookies()
  // Store a derived session token, never the password itself
  cookieStore.set('ssl_admin', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 8, // 8 hours
    path:     '/',
  })

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const cookieStore = cookies()
  cookieStore.delete('ssl_admin')
  return NextResponse.json({ success: true })
}
