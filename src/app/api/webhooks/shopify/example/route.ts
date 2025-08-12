// Example Shopify Webhook Handler
// Clean implementation following the user's suggested pattern

import { NextRequest, NextResponse } from 'next/server'
import { validHmac } from '@/lib/shopify/webhook-validator'

export async function POST(req: Request) {
  const sig = req.headers.get('x-shopify-hmac-sha256')
  const body = await req.text()
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.CREWFLOW_SHOPIFY_WEBHOOK_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  if (!validHmac(body, sig, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Parse webhook payload
  let payload
  try {
    payload = JSON.parse(body)
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  // Handle webhook...
  console.log('Webhook processed successfully:', payload)

  return NextResponse.json({ ok: true })
}
