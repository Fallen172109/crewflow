import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { adminBase } from '@/lib/shopify/constants'

const Body = z.object({
  storeId: z.string().uuid(),
  product: z.object({
    title: z.string().min(1),
    body_html: z.string().optional(),
    product_type: z.string().optional(),
    tags: z.string().optional(),
    variants: z.array(
      z.object({
        title: z.string().default('Default Title'),
        price: z.string(),
        inventory_quantity: z.number().int().min(0).optional(),
        inventory_management: z.string().optional(),
        inventory_policy: z.string().optional(),
      })
    ).min(1),
    images: z.array(z.object({ src: z.string().url(), position: z.number().int().min(1).optional() })).optional(),
    status: z.enum(['draft', 'active']).default('draft'),
  }),
});

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: 'Invalid payload', issues: body.error.issues }, { status: 400 });

  const { storeId, product } = body.data;

  // Resolve store + token by storeId
  const { data: store, error: storeErr } = await supabase
    .from('shopify_stores')
    .select('id, shop_domain, store_name')
    .eq('id', storeId)
    .maybeSingle();

  if (storeErr || !store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const { data: conn } = await supabase
    .from('api_connections')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('integration_id', 'shopify')
    .eq('status', 'connected')
    .maybeSingle();

  const accessToken = conn?.access_token;
  if (!accessToken) return NextResponse.json({ error: 'Missing Shopify access token' }, { status: 500 });

  // Publish
  const res = await fetch(`${adminBase(store.shop_domain)}/products.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
    body: JSON.stringify({ product: { vendor: store.store_name, ...product } }),
  });

  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json({ error: 'Shopify createProduct failed', status: res.status, body: text }, { status: 502 });
  }

  const parsed = JSON.parse(text);

  // non-blocking activity log
  void supabase.from('shopify_activity_log').insert({
    user_id: user.id,
    store_id: storeId,
    action: 'product_created',
    resource_id: String(parsed?.product?.id ?? ''),
  }).catch(() => {});

  return NextResponse.json({ ok: true, product: parsed.product });
}

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!storeId) return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });

  // Resolve store + token by storeId
  const { data: store, error: storeErr } = await supabase
    .from('shopify_stores')
    .select('id, shop_domain, store_name')
    .eq('id', storeId)
    .maybeSingle();

  if (storeErr || !store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const { data: conn } = await supabase
    .from('api_connections')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('integration_id', 'shopify')
    .eq('status', 'connected')
    .maybeSingle();

  const accessToken = conn?.access_token;
  if (!accessToken) return NextResponse.json({ error: 'Missing Shopify access token' }, { status: 500 });

  // Fetch products from Shopify
  const res = await fetch(`${adminBase(store.shop_domain)}/products.json?limit=${limit}`, {
    headers: { 'X-Shopify-Access-Token': accessToken },
  });

  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json({ error: 'Shopify getProducts failed', status: res.status, body: text }, { status: 502 });
  }

  const parsed = JSON.parse(text);
  return NextResponse.json({ ok: true, products: parsed.products || [], store });
}
