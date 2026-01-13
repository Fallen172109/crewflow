// middleware.ts
//
// MAINTENANCE MODE CONTROL
// ========================
// To enable maintenance mode:
//   1. Set MAINTENANCE_MODE=true in your .env.local file
//   2. Set MAINTENANCE_PASSWORD=your-secret-password (REQUIRED when maintenance is enabled)
//   3. Restart the server
//
// To disable maintenance mode:
//   1. Set MAINTENANCE_MODE=false (or remove the line) in .env.local
//   2. Restart the server
//
// Admin bypass:
//   - Users can enter the MAINTENANCE_PASSWORD on the maintenance page to bypass
//   - This sets a cookie that allows access for 24 hours
//
// SECURITY NOTE: MAINTENANCE_PASSWORD must be set in environment variables when using maintenance mode

import { NextResponse } from "next/server";

// Paths that are always accessible, even during maintenance
const PUBLIC_PATHS = [
  "/maintenance",
  "/api/auth/shopify",
  "/api/auth/shopify/callback",
  "/api/shopify/webhooks",
  "/api/maintenance", // API endpoint to check/toggle maintenance
  "/login",
  "/sign-in",
  "/auth",
  "/auth/",
  "/auth/callback",
  "/privacy-policy",
  "/terms-of-service",
  "/_next",
  "/favicon.ico",
];

export function middleware(req: Request) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Always allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check maintenance mode (defaults to false)
  const isMaintenance = process.env.MAINTENANCE_MODE === "true";

  // If not in maintenance mode, proceed normally
  if (!isMaintenance) {
    return NextResponse.next();
  }

  // Check for bypass cookie
  const cookies = (req as any).cookies;
  const maintenanceCookie = cookies?.get?.("maintenance");
  const expectedPassword = process.env.MAINTENANCE_PASSWORD;

  // If MAINTENANCE_PASSWORD is not set, no bypass is allowed (security measure)
  if (!expectedPassword) {
    console.warn("MAINTENANCE_PASSWORD not set - admin bypass disabled");
    return NextResponse.rewrite(new URL("/maintenance", req.url));
  }

  // If user has valid bypass cookie, allow access
  if (maintenanceCookie?.value === expectedPassword) {
    return NextResponse.next();
  }

  // Redirect to maintenance page
  return NextResponse.rewrite(new URL("/maintenance", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
