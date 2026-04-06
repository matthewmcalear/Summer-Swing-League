import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { password } = await request.json()

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 })
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const cookieStore = cookies()
  cookieStore.set('ssl_admin', process.env.ADMIN_PASSWORD, {
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
