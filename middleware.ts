import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Heroku sets x-forwarded-proto to 'http' when the original request was plain HTTP.
  // Redirect to HTTPS in that case so GPS and other secure APIs work.
  const proto = request.headers.get('x-forwarded-proto')
  if (proto === 'http') {
    const url = request.nextUrl.clone()
    url.protocol = 'https'
    return NextResponse.redirect(url, { status: 301 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
