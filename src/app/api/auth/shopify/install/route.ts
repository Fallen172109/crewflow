// Shopify Embedded App Installation Handler
// Handles embedded app installation flow for Shopify Partner apps

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getBaseUrl, getOAuthRedirectUri } from '@/lib/utils/environment'
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
      baseUrl: getBaseUrl(),
      redirectUri: getOAuthRedirectUri('shopify'),
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
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

    // For automated checks, we need to redirect immediately to Shopify OAuth
    // This ensures the checker sees the expected grant URL

    console.log('Handling Shopify app installation for shop:', shop)

      // Generate state parameter for security
      const state = crypto.randomUUID()

      // Store OAuth state (without requiring user authentication for installation)
      const supabase = createSupabaseServerClient()

      // For app installation, we store the state temporarily without user_id
      await supabase.from('oauth_states').insert({
        user_id: null, // Will be updated after user authentication
        state,
        shop_domain: shop,
        integration_type: 'shopify',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      })

      // For embedded apps, we need to redirect to the Shopify admin grant page
      // This is what Shopify expects: https://admin.shopify.com/store/{shop}/app/grant
      const clientId = process.env.SHOPIFY_CLIENT_ID || process.env.CREWFLOW_SHOPIFY_CLIENT_ID
      const redirectUri = getOAuthRedirectUri('shopify')

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

      // Build the OAuth URL that will redirect to the grant page
      const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
      authUrl.searchParams.set('client_id', clientId!)
      authUrl.searchParams.set('scope', scopes)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('state', state)

      console.log('Redirecting to Shopify OAuth for embedded app:', {
        authUrl: authUrl.toString(),
        expectedGrantUrl: `https://admin.shopify.com/store/${shop.replace('.myshopify.com', '')}/app/grant`
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

// Validate Shopify request signature with improved security
function validateShopifyRequest(searchParams: URLSearchParams): boolean {
  try {
    const hmac = searchParams.get('hmac')
    const secret = process.env.SHOPIFY_CLIENT_SECRET || process.env.CREWFLOW_SHOPIFY_CLIENT_SECRET

    if (!hmac || !secret) {
      console.warn('Missing HMAC or secret for validation')
      return false
    }

    // Create query string without hmac and signature
    const params = new URLSearchParams(searchParams)
    params.delete('hmac')
    params.delete('signature')

    // Sort parameters alphabetically and encode properly
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')

    // Calculate HMAC using SHA256
    const calculatedHmac = crypto
      .createHmac('sha256', secret)
      .update(sortedParams, 'utf8')
      .digest('hex')

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(hmac, 'hex'),
        Buffer.from(calculatedHmac, 'hex')
      )
    } catch (bufferError) {
      console.error('Buffer comparison error:', bufferError)
      return false
    }
  } catch (error) {
    console.error('HMAC validation error:', error)
    return false
  }
}

// Generate HTML for embedded app installation with proper App Bridge integration
function generateEmbeddedInstallationPage(shop: string, state: string): string {
  const clientId = process.env.SHOPIFY_CLIENT_ID || process.env.CREWFLOW_SHOPIFY_CLIENT_ID
  const redirectUri = getOAuthRedirectUri('shopify')

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

  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

  return `
<!DOCTYPE html>
<html>
<head>
    <title>CrewFlow - Installing...</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
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
            max-width: 400px;
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
        .install-btn {
            background: #ff6b35;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 1rem;
            transition: background-color 0.2s;
        }
        .install-btn:hover {
            background: #e55a2b;
        }
        .install-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">⚓ CrewFlow</div>
        <div class="spinner" id="spinner"></div>
        <p id="status">Preparing installation for your store...</p>
        <button id="installBtn" class="install-btn" style="display: none;" onclick="startInstallation()">
            Install CrewFlow
        </button>
    </div>
    <script>
        const shop = '${shop}';
        const clientId = '${clientId}';
        const authUrl = '${authUrl}';

        // Initialize App Bridge if we're in an embedded context
        let app;
        try {
            if (window.parent !== window && window.shopOrigin) {
                app = AppBridge.createApp({
                    apiKey: clientId,
                    shopOrigin: window.shopOrigin || 'https://${shop}'
                });

                console.log('App Bridge initialized for embedded app');
            }
        } catch (error) {
            console.log('App Bridge not available or not in embedded context:', error);
        }

        function startInstallation() {
            document.getElementById('status').textContent = 'Redirecting to Shopify for authorization...';
            document.getElementById('installBtn').style.display = 'none';
            document.getElementById('spinner').style.display = 'block';

            // Use App Bridge redirect if available, otherwise use top-level redirect
            if (app && AppBridge.Redirect) {
                const redirect = AppBridge.Redirect.create(app);
                redirect.dispatch(AppBridge.Redirect.Action.REMOTE, authUrl);
            } else {
                // Fallback to top-level redirect
                window.top.location.href = authUrl;
            }
        }

        // Auto-start installation after a brief delay
        setTimeout(() => {
            document.getElementById('status').textContent = 'Ready to install CrewFlow for your store';
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('installBtn').style.display = 'inline-block';

            // Auto-click after another short delay for smoother UX
            setTimeout(startInstallation, 1000);
        }, 1500);
    </script>
</body>
</html>
  `
}
