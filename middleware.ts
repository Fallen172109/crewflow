import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // 1) Canonical host: redirect www → apex to keep Supabase cookies valid
  const host = req.headers.get('host') || ''
  if (host.startsWith('www.crewflow.ai')) {
    const url = new URL(req.url)
    url.host = 'crewflow.ai'
    return NextResponse.redirect(url, 308)
  }

  const { pathname } = req.nextUrl;

  // Skip middleware for auth routes to prevent redirect loops
  if (pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  // Skip middleware for ALL OAuth routes to prevent interference with third-party integrations
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Never redirect/block Shopify webhooks
  if (pathname.startsWith('/api/webhooks/shopify')) {
    return NextResponse.next();
  }

  // If you use maintenance mode, still allow API calls
  if (process.env.AUTO_MAINTENANCE_MODE === 'true' && pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Handle Supabase authentication for API routes
  if (pathname.startsWith('/api/')) {
    let response = NextResponse.next({
      request: {
        headers: req.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Refresh session if expired
    await supabase.auth.getUser();

    return response;
  }

  // Skip middleware for static files
  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    // Check for auth tokens in cookies
    const accessToken = req.cookies.get('sb-access-token')?.value;
    const refreshToken = req.cookies.get('sb-refresh-token')?.value;

    // If no tokens, redirect to login
    if (!accessToken && !refreshToken) {
      const redirectUrl = new URL('/auth/login', req.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Protect admin routes - requires both authentication and admin role
  if (pathname.startsWith('/admin')) {
    // Check for auth tokens in cookies
    const accessToken = req.cookies.get('sb-access-token')?.value;
    const refreshToken = req.cookies.get('sb-refresh-token')?.value;

    // If no tokens, redirect to login
    if (!accessToken && !refreshToken) {
      const redirectUrl = new URL('/auth/login', req.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Note: Admin role verification is handled at the component level
    // since middleware can't easily access Supabase user data
    // The admin pages will check the role and redirect if necessary
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
