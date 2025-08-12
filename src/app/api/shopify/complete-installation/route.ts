import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { addStore } from '@/lib/shopify/multi-store-manager'

export async function POST(request: NextRequest) {
  try {
    const { shop, connectionToken } = await request.json()

    if (!shop || !connectionToken) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Decode the connection token
    let tokenData
    try {
      const decoded = Buffer.from(connectionToken, 'base64').toString('utf8')
      tokenData = JSON.parse(decoded)
    } catch (error) {
      console.error('Invalid connection token:', error)
      return NextResponse.json(
        { error: 'Invalid connection token' },
        { status: 400 }
      )
    }

    // Validate token data
    if (tokenData.shop !== shop || !tokenData.accessToken) {
      return NextResponse.json(
        { error: 'Invalid token data' },
        { status: 400 }
      )
    }

    // Check if token is not too old (1 hour max)
    const tokenAge = Date.now() - tokenData.timestamp
    if (tokenAge > 60 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Connection token expired' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Add store to user's account
    console.log('🔄 Completing store installation:', { userId: user.id, shop })
    const result = await addStore(user.id, tokenData.accessToken, shop, supabase)

    if (!result.success) {
      console.error('❌ Failed to complete store installation:', result.error)
      return NextResponse.json(
        { error: result.error || 'Failed to connect store' },
        { status: 500 }
      )
    }

    console.log('✅ Store installation completed successfully:', { storeId: result.store?.id, shop })

    return NextResponse.json({
      success: true,
      store: result.store,
      message: 'Store connected successfully'
    })

  } catch (error) {
    console.error('Complete installation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
