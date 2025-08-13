import { NextRequest, NextResponse } from 'next/server';
import { validHmac } from '@/lib/shopify/webhook-validator';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
  const rawBody = await request.text();  // get raw body for HMAC verification
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.CREWFLOW_SHOPIFY_WEBHOOK_SECRET;

  if (!secret) {
    // Missing secret configuration – log and return 500 error
    console.error('Webhook secret not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Verify HMAC signature using our secret
  const isValid = validHmac(rawBody, hmacHeader, secret);
  if (!isValid) {
    console.error('Invalid webhook signature');
    // Shopify expects a 401 Unauthorized if the HMAC check fails
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse the JSON payload (after HMAC verification)
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // At this point, the request is authenticated. Handle the webhook event:
  const topic = request.headers.get('x-shopify-topic') || 'unknown_topic';
  const shopDomain = request.headers.get('x-shopify-shop-domain') || 'unknown_shop';
  console.log(`🔔 Received Shopify webhook "${topic}" from ${shopDomain}`, payload);
  // TODO: Process the webhook payload (e.g., enqueue for processing or update DB)

  // Return 200 OK to acknowledge receipt
  return NextResponse.json({ success: true });
}
