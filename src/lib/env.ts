// src/lib/env.ts
export function getBaseUrl() {
  // Prefer explicit public URLs; strip trailing slash
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  const url = fromEnv || 'http://localhost:3000';
  return url.replace(/\/$/, '');
}
