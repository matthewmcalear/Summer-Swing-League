import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host

  // Canonical host: redirect www and http to https://sslgolf.com (skip localhost/herokuapp for dev)
  if (!host.includes('localhost') && !host.includes('herokuapp.com')) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    
    // Redirect www to non-www
    if (host.startsWith('www.')) {
      const canonicalUrl = `https://${host.slice(4)}${pathname}${request.nextUrl.search}`
      return NextResponse.redirect(canonicalUrl, { status: 301 })
    }
    
    // Redirect http to https
    if (proto === 'http') {
      const canonicalUrl = `https://${host}${pathname}${request.nextUrl.search}`
      return NextResponse.redirect(canonicalUrl, { status: 301 })
    }
  }

  // For document pages (not static assets), set Cache-Control: no-store to prevent HTML caching
  const response = NextResponse.next()
  if (!pathname.startsWith('/_next/static') && !pathname.startsWith('/_next/image')) {
    response.headers.set('Cache-Control', 'no-store, must-revalidate')
  }
  
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
