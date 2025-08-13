// src/app/api/webhooks/shopify/customers-data-request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validHmac } from '@/lib/shopify/webhook-validator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || '';
  const sig = req.headers.get('x-shopify-hmac-sha256');
  const raw = await req.text();

  if (!validHmac(raw, sig, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // TODO: handle customers/data_request
  return NextResponse.json({ ok: true });
}

export async function GET()    { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }
export async function PUT()    { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }
export async function PATCH()  { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }
export async function DELETE() { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }
