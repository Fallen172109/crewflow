import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/env'
import crypto from 'crypto'
import {
  createErrorResponse,
  createServerErrorResponse,
  withStandardErrorHandling,
  ERROR_CODES,
  HTTP_STATUS
} from '@/lib/api/response-formatter'
import { handleOAuthError, validateRequest } from '@/lib/api/error-handlers'

export const GET = withStandardErrorHandling(async (request: NextRequest) => {
  console.log('🚢 Shopify OAuth initiation started')
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')

  if (!shop) {
    return createErrorResponse(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      'Shop parameter is required',
      { field: 'shop' },
      { status: HTTP_STATUS.BAD_REQUEST }
    )
  }

  // Validate shop domain format
  if (!shop.endsWith('.myshopify.com')) {
    return createErrorResponse(
      ERROR_CODES.INVALID_FORMAT,
      'Invalid shop domain format',
      { expected: '*.myshopify.com', received: shop },
      { status: HTTP_STATUS.BAD_REQUEST }
    )
  }
    
  const clientId = process.env.SHOPIFY_CLIENT_ID || process.env.CREWFLOW_SHOPIFY_CLIENT_ID
  if (!clientId) {
    return createServerErrorResponse(
      'Shopify client ID not configured',
      new Error('SHOPIFY_CLIENT_ID environment variable is missing')
    )
  }
    
  // Generate state parameter for security
  const state = crypto.randomUUID()

  // Store state in session/database for verification
  const supabase = await createSupabaseServerClientWithCookies()

  // Check if supabase client was created successfully
  if (!supabase || !supabase.auth) {
    console.error('Supabase client not properly initialized')
    return createErrorResponse(
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      'Service temporarily unavailable',
      undefined,
      { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
    )
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (!user || userError) {
    console.log('User not authenticated during Shopify OAuth initiation:', userError?.message)
    // For Shopify OAuth, we can proceed without user authentication initially
    // The user will be required to authenticate during the callback
  }

  // Store OAuth state (with or without user_id)
  const { error: stateError } = await supabase.from('oauth_states').insert({
    user_id: user?.id || null, // Allow null for unauthenticated users
    state,
    shop_domain: shop,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
  })

  if (stateError) {
    console.error('Failed to store OAuth state:', stateError)
    return createServerErrorResponse(
      'Failed to initialize OAuth flow',
      stateError
    )
  }
    
  // Required Shopify scopes
  const scopes = [
    'read_products',
    'write_products',
    'read_orders',
    'write_orders',
    'read_customers',
    'read_analytics',
    'read_inventory',
    'write_inventory',
    'read_fulfillments',
    'write_fulfillments'
  ].join(',')

  // Build Shopify OAuth URL with EXACT redirect URI
  const redirectUri = `${getBaseUrl()}/api/auth/shopify/callback`
  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)

  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('grant_options[]', 'per-user')

  console.log('[OAuth] redirect_uri ->', redirectUri)
  console.log('[OAuth] authorize URL ->', authUrl.toString())

  // Redirect to Shopify OAuth
  return NextResponse.redirect(authUrl.toString())
})
