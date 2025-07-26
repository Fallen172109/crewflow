import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { setPrimaryStore } from '@/lib/shopify/multi-store-manager'

export async function POST(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { storeId } = params

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    // Set primary store
    const result = await setPrimaryStore(user.id, storeId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to set primary store' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Primary store updated successfully'
    })

  } catch (error) {
    console.error('Error setting primary store:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
