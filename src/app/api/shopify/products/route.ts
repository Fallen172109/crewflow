import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { getShopifyAuthForUser } from '@/lib/shopify/get-auth'
import { SHOPIFY_API_VERSION } from '@/lib/shopify/constants'

const adminBase = (d: string) => `https://${d}/admin/api/${SHOPIFY_API_VERSION}`

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
  const supabase = await createSupabaseServerClientWithCookies();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: 'Invalid payload', issues: body.error.issues }, { status: 400 });

  const { storeId, product } = body.data;

  // Get unified auth (store-first, fallback to api_connections)
  const auth = await getShopifyAuthForUser(storeId);
  if (!auth) return NextResponse.json({ error: 'No valid Shopify token' }, { status: 401 });

  // Get store info for vendor name
  const { data: store } = await supabase
    .from('shopify_stores')
    .select('id, store_name')
    .eq('id', storeId)
    .maybeSingle();

  // Publish
  const res = await fetch(`${adminBase(auth.shop_domain)}/products.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': auth.access_token
    },
    body: JSON.stringify({
      product: {
        vendor: store?.store_name || auth.shop_domain,
        ...product
      }
    }),
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
  const supabase = await createSupabaseServerClientWithCookies();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!storeId) return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });

  // Get unified auth (store-first, fallback to api_connections)
  const auth = await getShopifyAuthForUser(storeId);
  if (!auth) return NextResponse.json({ error: 'No valid Shopify token' }, { status: 401 });

  // Get store info for response
  const { data: store } = await supabase
    .from('shopify_stores')
    .select('id, store_name')
    .eq('id', storeId)
    .maybeSingle();

  // Fetch products from Shopify
  const res = await fetch(`${adminBase(auth.shop_domain)}/products.json?limit=${limit}`, {
    headers: { 'X-Shopify-Access-Token': auth.access_token },
  });

  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json({ error: 'Shopify getProducts failed', status: res.status, body: text }, { status: 502 });
  }

  const parsed = JSON.parse(text);
  return NextResponse.json({
    ok: true,
    products: parsed.products || [],
    store: store || { shop_domain: auth.shop_domain },
    auth_source: auth.source
  });
}
