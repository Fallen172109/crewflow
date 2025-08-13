// src/app/api/auth/shopify/callback/route.ts
import { NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/env';



export async function GET(request: Request) {
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop') || '';    // e.g. "your-store.myshopify.com"
  const host = url.searchParams.get('host') || '';    // present for embedded app installs
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';

  if (!shop || !code) {
    // Missing critical params – redirect to an error page or reinstall prompt
    return NextResponse.redirect(`${getBaseUrl()}/shopify/setup?error=missing_params`);
  }

  // (Optional) Validate the 'state' parameter here if you issued one during install

  // Exchange the authorization code for a permanent access token...
  const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code,
    }),
  });
  if (!tokenResponse.ok) {
    return NextResponse.redirect(`${getBaseUrl()}/shopify/setup?error=token_exchange_failed`);
  }
  const { access_token, scope } = await tokenResponse.json();
  // TODO: Save the shop domain, access_token, and scope to your database here

  // Determine final redirect URL:
  if (host) {
    // **Embedded app** – redirect to Shopify admin interface URL
    // Construct the admin URL: https://admin.shopify.com/store/{store-name}/apps/{app-handle}
    const storeName = shop.replace(/\.myshopify\.com$/, '');  // e.g. "your-store"
    const appHandle = 'crewflow';  // your app's handle/slug as configured in Shopify Partner Dashboard
    const embeddedAppURL = `https://admin.shopify.com/store/${storeName}/apps/${appHandle}`;
    console.log(`Redirecting to embedded app URL: ${embeddedAppURL}`);
    return NextResponse.redirect(embeddedAppURL);
  } else {
    // **Non-embedded app** (fallback) – redirect to your app's own URL (e.g., a dashboard or setup page)
    return NextResponse.redirect(`${getBaseUrl()}/dashboard?shop=${shop}&installed=1`);
  }
}


