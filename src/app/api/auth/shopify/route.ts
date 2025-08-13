// src/app/api/auth/shopify/route.ts
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/env';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shop = url.searchParams.get('shop');
  if (!shop || !shop.endsWith('.myshopify.com')) {
    return NextResponse.json({ error: 'Missing or invalid "shop" param' }, { status: 400 });
  }

  // Least-privilege defaults (add more only if used)
  const scopes = [
    'read_products','write_products',
    'read_orders',
    'read_customers',
    // 'write_customers','read_inventory','write_inventory','write_draft_orders','write_files',
  ].join(',');

  const state = crypto.randomUUID();
  const redirectUri = `${getBaseUrl()}/api/auth/shopify/callback`; // exact, no query

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set('client_id', process.env.SHOPIFY_CLIENT_ID!);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.append('grant_options[]', 'per-user');

  console.log('[OAuth] redirect_uri ->', redirectUri);
  console.log('[OAuth] authorize URL ->', authUrl.toString());

  return NextResponse.redirect(authUrl.toString());
}
