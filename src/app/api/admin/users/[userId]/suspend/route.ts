import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isUserAdmin, logAdminAction } from '@/lib/admin-auth'

interface RouteParams {
  params: {
    userId: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isUserAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId } = params
    const body = await request.json()
    const { reason } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Prevent admin from suspending themselves
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot suspend your own account' }, { status: 400 })
    }

    // Get target user info
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is already suspended
    if (targetUser.suspended) {
      return NextResponse.json({ error: 'User is already suspended' }, { status: 400 })
    }

    // Use the database function to suspend user
    const { data: result, error: suspendError } = await supabase
      .rpc('suspend_user', {
        p_admin_id: user.id,
        p_target_user_id: userId,
        p_reason: reason || null
      })

    if (suspendError || !result) {
      console.error('Error suspending user:', suspendError)
      
      // Log failed action
      await logAdminAction(user.id, 'SUSPEND_USER_FAILED', userId, {
        reason,
        error: suspendError?.message
      }, request)

      return NextResponse.json({ error: 'Failed to suspend user' }, { status: 500 })
    }

    // Get updated user data
    const { data: updatedUser, error: updateFetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (updateFetchError) {
      console.error('Error fetching updated user:', updateFetchError)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User suspended successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Error in suspend user API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isUserAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId } = params

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get target user info
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is not suspended
    if (!targetUser.suspended) {
      return NextResponse.json({ error: 'User is not suspended' }, { status: 400 })
    }

    // Use the database function to unsuspend user
    const { data: result, error: unsuspendError } = await supabase
      .rpc('unsuspend_user', {
        p_admin_id: user.id,
        p_target_user_id: userId
      })

    if (unsuspendError || !result) {
      console.error('Error unsuspending user:', unsuspendError)
      
      // Log failed action
      await logAdminAction(user.id, 'UNSUSPEND_USER_FAILED', userId, {
        error: unsuspendError?.message
      }, request)

      return NextResponse.json({ error: 'Failed to unsuspend user' }, { status: 500 })
    }

    // Get updated user data
    const { data: updatedUser, error: updateFetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (updateFetchError) {
      console.error('Error fetching updated user:', updateFetchError)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User unsuspended successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Error in unsuspend user API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
