import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, adminKey } = await request.json()

    // Verify admin promotion key
    const expectedAdminKey = process.env.ADMIN_PROMOTION_KEY

    console.log('Admin promotion attempt:', {
      email,
      providedKeyLength: adminKey?.length,
      expectedKeyExists: !!expectedAdminKey,
      expectedKeyLength: expectedAdminKey?.length,
      keysMatch: adminKey === expectedAdminKey
    })

    if (!expectedAdminKey) {
      console.log('Admin promotion key not configured in environment')
      return NextResponse.json(
        { error: 'Admin promotion not configured' },
        { status: 500 }
      )
    }

    if (adminKey !== expectedAdminKey) {
      console.log('Admin promotion key mismatch')
      return NextResponse.json(
        { error: 'Invalid admin promotion key' },
        { status: 401 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is already admin
    if (user.role === 'admin') {
      return NextResponse.json(
        { error: 'User is already an admin' },
        { status: 400 }
      )
    }

    // Promote user to admin
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error promoting user to admin:', updateError)
      return NextResponse.json(
        { error: 'Failed to promote user to admin' },
        { status: 500 }
      )
    }

    // Log the promotion
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: user.id,
        action: 'SELF_PROMOTION',
        target_user_id: user.id,
        details: { method: 'api_promotion', promoted_by: 'system' },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })

    return NextResponse.json({
      success: true,
      message: 'User successfully promoted to admin',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      }
    })

  } catch (error) {
    console.error('Error in admin promotion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
