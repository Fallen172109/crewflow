import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip middleware for auth routes to prevent redirect loops
  if (pathname.startsWith('/auth/')) {
    return NextResponse.next()
  }

  // Skip middleware for Shopify auth routes to prevent interference
  if (pathname.startsWith('/api/auth/shopify/')) {
    return NextResponse.next()
  }

  // Handle Supabase authentication for API routes
  if (pathname.startsWith('/api/')) {
    let response = NextResponse.next({
      request: {
        headers: req.headers,
      },
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Refresh session if expired
    await supabase.auth.getUser()

    return response
  }

  // Skip middleware for static files
  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    // Check for auth tokens in cookies
    const accessToken = req.cookies.get('sb-access-token')?.value
    const refreshToken = req.cookies.get('sb-refresh-token')?.value

    // If no tokens, redirect to login
    if (!accessToken && !refreshToken) {
      const redirectUrl = new URL('/auth/login', req.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Protect admin routes - requires both authentication and admin role
  if (pathname.startsWith('/admin')) {
    // Check for auth tokens in cookies
    const accessToken = req.cookies.get('sb-access-token')?.value
    const refreshToken = req.cookies.get('sb-refresh-token')?.value

    // If no tokens, redirect to login
    if (!accessToken && !refreshToken) {
      const redirectUrl = new URL('/auth/login', req.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Note: Admin role verification is handled at the component level
    // since middleware can't easily access Supabase user data
    // The admin pages will check the role and redirect if necessary
  }

  return NextResponse.next()
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
