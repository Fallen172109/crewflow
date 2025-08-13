import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never redirect/block Shopify webhooks
  if (pathname.startsWith('/api/webhooks/shopify')) {
    return NextResponse.next();
  }

  // If you use maintenance mode, still allow API calls
  if (process.env.AUTO_MAINTENANCE_MODE === 'true' && pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ...your existing middleware (auth/redirects) here...

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)'],
};
