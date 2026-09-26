import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = new Set(['/api/auth/signup', '/api/auth/login'])

export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204 })
  }

  const path = request.nextUrl.pathname
  const publicRead =
    request.method === 'GET' &&
    (path === '/api/research' || /^\/api\/research\/[^/]+$/.test(path))
  if (!path.startsWith('/api/') || PUBLIC_PATHS.has(path) || publicRead) {
    return NextResponse.next()
  }

  const accessTokenCookie = request.cookies.get('scholarxiv_access_token')?.value
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (!accessTokenCookie && !bearerToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}