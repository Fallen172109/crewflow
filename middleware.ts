// middleware.ts
import { NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/maintenance",                 // maintenance page itself
  "/api/auth/shopify",
  "/api/auth/shopify/callback",
  "/api/shopify/webhooks",
  "/api/debug/environment",
  "/login",
  "/sign-in",
  "/auth",
  "/auth/",
  "/auth/callback",
];

export function middleware(req: Request) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Always allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Single source of truth
  const isMaintenance = process.env.MAINTENANCE_MODE === "true";

  if (!isMaintenance) return NextResponse.next();

  // Allow password cookie to bypass
  const cookie = (req as any).cookies?.get?.("maintenance");
  const hasPass = cookie?.value === process.env.MAINTENANCE_PASSWORD;
  if (hasPass) return NextResponse.next();

  return NextResponse.rewrite(new URL("/maintenance", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
