// src/app/api/auth/shopify/callback/route.ts
import { NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/env';

async function exchangeCodeForToken(shop: string, code: string) {
  const r = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code,
    }),
  });
  if (!r.ok) return null;
  return r.json() as Promise<{ access_token: string; scope: string }>;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shop = url.searchParams.get('shop') || '';
  const code = url.searchParams.get('code') || '';
  const host = url.searchParams.get('host') || '';
  if (!shop || !code) {
    return NextResponse.redirect(`${getBaseUrl()}/shopify/setup?error=missing_params`);
  }

  // TODO: validate "state" if you store it

  const token = await exchangeCodeForToken(shop, code);
  if (!token?.access_token) {
    return NextResponse.redirect(`${getBaseUrl()}/shopify/setup?error=token_exchange_failed`);
  }

  // TODO: upsert/save store to DB (shop_domain, access_token, scope)
  // await saveOrUpdateStore({ shop, accessToken: token.access_token, scope: token.scope });

  const target = new URL('/shopify/setup', getBaseUrl());
  target.searchParams.set('shop', shop);
  if (host) target.searchParams.set('host', host);
  target.searchParams.set('connected', '1');

  return NextResponse.redirect(target.toString());
}


