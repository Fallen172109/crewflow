// Shopify Embedded App Installation Handler
// Handles embedded app installation flow for Shopify Partner apps

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')
    const embedded = searchParams.get('embedded')
    const hmac = searchParams.get('hmac')
    const timestamp = searchParams.get('timestamp')

    console.log('Shopify embedded app installation request:', {
      shop,
      embedded,
      timestamp,
      hasHmac: !!hmac,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      clientId: process.env.SHOPIFY_CLIENT_ID ? 'Present' : 'Missing',
      clientSecret: process.env.SHOPIFY_CLIENT_SECRET ? 'Present' : 'Missing'
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      )
    }

    // Validate the request is from Shopify
    if (hmac && timestamp) {
      const isValid = validateShopifyRequest(searchParams)
      if (!isValid) {
        console.error('Invalid Shopify installation request signature')
        return NextResponse.json(
          { error: 'Invalid request signature' },
          { status: 401 }
        )
      }
    }

    // For embedded apps, we need to handle the installation differently
    if (embedded === '1') {
      console.log('Handling embedded app installation for shop:', shop)
      // Return HTML that will handle the embedded app installation
      const installationHtml = generateEmbeddedInstallationPage(shop)
      return new NextResponse(installationHtml, {
        headers: {
          'Content-Type': 'text/html',
          'X-Frame-Options': 'ALLOWALL',
          'Content-Security-Policy': "frame-ancestors 'self' https://*.shopify.com https://admin.shopify.com"
        }
      })
    }

    // For non-embedded apps, redirect to standard OAuth flow
    const clientId = process.env.SHOPIFY_CLIENT_ID || process.env.CREWFLOW_SHOPIFY_CLIENT_ID
    if (!clientId) {
      return NextResponse.json(
        { error: 'Shopify app not configured' },
        { status: 500 }
      )
    }

    // Generate state parameter for security
    const state = crypto.randomUUID()
    
    // Store OAuth state (if user is authenticated)
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase.from('oauth_states').insert({
        user_id: user.id,
        state,
        shop_domain: shop,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })
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

    // Build Shopify OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/shopify/callback`
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)

    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)

    console.log('Shopify OAuth redirect details:', {
      redirectUri,
      authUrl: authUrl.toString(),
      shop,
      clientId: clientId.substring(0, 8) + '...'
    })

    // Redirect to Shopify OAuth
    return NextResponse.redirect(authUrl.toString())

  } catch (error) {
    console.error('Shopify installation error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Environment check:', {
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      hasClientId: !!process.env.SHOPIFY_CLIENT_ID,
      hasClientSecret: !!process.env.SHOPIFY_CLIENT_SECRET
    })
    return NextResponse.json(
      { error: 'Installation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Validate Shopify request signature
function validateShopifyRequest(searchParams: URLSearchParams): boolean {
  try {
    const hmac = searchParams.get('hmac')
    const secret = process.env.SHOPIFY_CLIENT_SECRET || process.env.CREWFLOW_SHOPIFY_CLIENT_SECRET
    
    if (!hmac || !secret) {
      return false
    }

    // Create query string without hmac
    const params = new URLSearchParams(searchParams)
    params.delete('hmac')
    params.delete('signature')
    
    // Sort parameters
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&')

    // Calculate HMAC
    const calculatedHmac = crypto
      .createHmac('sha256', secret)
      .update(sortedParams, 'utf8')
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(hmac, 'hex'),
      Buffer.from(calculatedHmac, 'hex')
    )
  } catch (error) {
    console.error('HMAC validation error:', error)
    return false
  }
}

// Generate HTML for embedded app installation
function generateEmbeddedInstallationPage(shop: string): string {
  const clientId = process.env.SHOPIFY_CLIENT_ID || process.env.CREWFLOW_SHOPIFY_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/shopify/callback`
  
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

  const state = crypto.randomUUID()
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

  return `
<!DOCTYPE html>
<html>
<head>
    <title>CrewFlow - Installing...</title>
    <meta charset="utf-8">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f8f9fa;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .logo {
            color: #ff6b35;
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 1rem;
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #ff6b35;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 1rem auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">⚓ CrewFlow</div>
        <div class="spinner"></div>
        <p>Installing CrewFlow for your store...</p>
        <p><small>You'll be redirected to complete the installation.</small></p>
    </div>
    <script>
        // Redirect to OAuth flow
        setTimeout(() => {
            window.top.location.href = '${authUrl}';
        }, 2000);
    </script>
</body>
</html>
  `
}
