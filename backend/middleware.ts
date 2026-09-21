import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = new Set(['/api/auth/signup', '/api/auth/login'])

export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204 })
  }

  const path = request.nextUrl.pathname
  if (!path.startsWith('/api/') || PUBLIC_PATHS.has(path)) return NextResponse.next()

  const auth = request.headers.get('authorization')
  if (!auth?.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
