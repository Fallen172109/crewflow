import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { adminBase } from '@/lib/shopify/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ ok: false, step: 'auth', error: 'Not authenticated' }, { status: 401 });
  }

  // 1) Find connected store + token
  const { data: conn, error: connErr } = await supabase
    .from('api_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('integration_id', 'shopify')
    .eq('status', 'connected')
    .maybeSingle();

  if (connErr || !conn) {
    return NextResponse.json({ ok: false, step: 'connection', error: 'No connected Shopify store found for user' }, { status: 404 });
  }

  const shopDomain = conn.shop_domain ?? conn.metadata?.shop_domain;
  const accessToken = conn.access_token ?? conn.credentials?.access_token;
  if (!shopDomain || !accessToken) {
    return NextResponse.json({ ok: false, step: 'secrets', error: 'Missing shop_domain or access_token' }, { status: 500 });
  }

  // 2) Token sanity: GET shop.json
  const shopRes = await fetch(`${adminBase(shopDomain)}/shop.json`, {
    headers: { 'X-Shopify-Access-Token': accessToken },
    cache: 'no-store',
  });
  const shopText = await shopRes.text();
  if (!shopRes.ok) {
    return NextResponse.json({ ok: false, step: 'token_check', status: shopRes.status, body: shopText }, { status: 502 });
  }

  // 3) Scope sanity: GET products.json (read)
  const readRes = await fetch(`${adminBase(shopDomain)}/products.json?limit=1`, {
    headers: { 'X-Shopify-Access-Token': accessToken },
  });
  const readText = await readRes.text();
  if (!readRes.ok) {
    return NextResponse.json({ ok: false, step: 'read_products', status: readRes.status, body: readText }, { status: 502 });
  }

  // 4) Write sanity (dry-run product with unique handle; delete afterwards)
  const draft = {
    title: `CrewFlow Diagnostic Product ${Date.now()}`,
    status: 'draft',
    variants: [{ title: 'Default', price: '9.99' }],
  };

  const writeRes = await fetch(`${adminBase(shopDomain)}/products.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ product: draft }),
  });
  const writeText = await writeRes.text();
  if (!writeRes.ok) {
    return NextResponse.json({ ok: false, step: 'write_products', status: writeRes.status, body: writeText }, { status: 502 });
  }

  let createdId: number | undefined;
  try {
    const parsed = JSON.parse(writeText);
    createdId = parsed?.product?.id;
  } catch {}

  // 5) Cleanup (best effort)
  if (createdId) {
    await fetch(`${adminBase(shopDomain)}/products/${createdId}.json`, {
      method: 'DELETE',
      headers: { 'X-Shopify-Access-Token': accessToken },
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    checks: ['auth', 'connection', 'token_check', 'read_products', 'write_products'],
    shop: JSON.parse(shopText),
    connection: {
      shop_domain: shopDomain,
      integration_id: conn.integration_id,
      status: conn.status,
      connected_at: conn.created_at
    },
    test_product_created_and_deleted: !!createdId
  });
}
