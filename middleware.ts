import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  console.log('Middleware hit:', pathname)

  // Skip middleware for auth callback route to prevent redirect loops
  if (pathname.startsWith('/auth/callback')) {
    return res
  }

  // Check for auth tokens in cookies
  const accessToken = req.cookies.get('sb-access-token')?.value
  const refreshToken = req.cookies.get('sb-refresh-token')?.value

  // Simple check for authentication based on presence of tokens
  // We'll let the client-side handle detailed session validation
  const isAuthenticated = !!(accessToken && refreshToken)

  // Only protect dashboard route for now to avoid redirect loops
  if (pathname.startsWith('/dashboard') && !isAuthenticated) {
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Don't redirect authenticated users away from auth pages for now
  // Let the client-side handle this to avoid loops

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
