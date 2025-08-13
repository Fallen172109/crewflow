import crypto from 'crypto';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function validHmac(raw: string, header: string | null) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET!;
  const digest = crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('base64');
  return !!header && crypto.timingSafeEqual(Buffer.from(header), Buffer.from(digest));
}

export async function POST(req: Request) {
  const sig = req.headers.get('x-shopify-hmac-sha256');
  const raw = await req.text();

  if (!validHmac(raw, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // handle valid webhook...
  return NextResponse.json({ ok: true });
}
