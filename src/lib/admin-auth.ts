import { createSupabaseServerClient, createSupabaseServerClientWithCookies } from './supabase/server'
import { createSupabaseAdminClient } from './supabase'
import { redirect } from 'next/navigation'
import { User } from '@supabase/supabase-js'

export interface AdminProfile {
  id: string
  email: string
  role: 'admin'
  subscription_tier: 'starter' | 'professional' | 'enterprise' | null
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due' | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
}

export interface AdminUser {
  user: User
  profile: AdminProfile
}

// Get current admin user (server-side)
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClientWithCookies()

  try {
    // Debug: Check what cookies are available
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    console.log('Available cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })))

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log('No authenticated user found, error:', userError?.message)
      return null
    }

    console.log('Checking admin status for user:', user.id, user.email)

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return null
    }

    if (!profile) {
      console.log('No profile found for user')
      return null
    }

    console.log('User profile found:', { email: profile.email, role: profile.role })

    // Check if user has admin role OR is the specific admin email
    const isSpecificAdmin = user.email === 'borzeckikamil7@gmail.com'
    if (profile.role !== 'admin' && !isSpecificAdmin) {
      console.log('User is not an admin:', profile.role, 'email:', user.email)
      return null
    }

    // If specific admin email but not admin role, temporarily grant admin access
    if (isSpecificAdmin && profile.role !== 'admin') {
      console.log('Granting temporary admin access to:', user.email)
      profile.role = 'admin'
    }

    return {
      user,
      profile: profile as AdminProfile
    }
  } catch (error) {
    console.error('Error getting admin user:', error)
    return null
  }
}

// Require admin authentication (server-side)
export async function requireAdminAuth(): Promise<AdminUser> {
  console.log('requireAdminAuth: Starting admin authentication check...')

  const adminUser = await getAdminUser()

  if (!adminUser) {
    console.log('requireAdminAuth: Admin user not found, redirecting to dashboard')
    redirect('/dashboard')
  }

  console.log('requireAdminAuth: Admin user authenticated successfully:', adminUser.profile.email)
  return adminUser
}

// Check if user is admin (server-side)
export async function isUserAdmin(userId?: string): Promise<boolean> {
  const supabase = await createSupabaseServerClientWithCookies()

  try {
    let targetUserId = userId
    let userEmail = null

    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false
      targetUserId = user.id
      userEmail = user.email
    } else {
      // Get user email for the provided userId
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.id === targetUserId) {
        userEmail = user.email
      }
    }

    // Check if user is the specific admin email
    if (userEmail === 'borzeckikamil7@gmail.com') {
      return true
    }

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', targetUserId)
      .single()

    if (error || !data) {
      return false
    }

    return data.role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

// Admin action logging
export async function logAdminAction(
  adminId: string,
  action: string,
  targetUserId?: string,
  details?: Record<string, any>,
  request?: Request
) {
  const supabase = createSupabaseAdminClient()

  try {
    const ipAddress = request?.headers.get('x-forwarded-for') || 
                     request?.headers.get('x-real-ip') || 
                     null

    const userAgent = request?.headers.get('user-agent') || null

    await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: adminId,
        action,
        target_user_id: targetUserId,
        details: details || {},
        ip_address: ipAddress,
        user_agent: userAgent
      })
  } catch (error) {
    console.error('Error logging admin action:', error)
  }
}

// Get all users (admin only)
export async function getAllUsers(adminId: string) {
  const supabase = createSupabaseAdminClient()

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all users:', error)
      return null
    }

    // Log the action
    await logAdminAction(adminId, 'VIEW_ALL_USERS')

    return data
  } catch (error) {
    console.error('Error in getAllUsers:', error)
    return null
  }
}

// Get user by ID (admin only)
export async function getUserById(adminId: string, userId: string) {
  const supabase = createSupabaseAdminClient()

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user by ID:', error)
      return null
    }

    // Log the action
    await logAdminAction(adminId, 'VIEW_USER', userId)

    return data
  } catch (error) {
    console.error('Error in getUserById:', error)
    return null
  }
}

// Update user subscription (admin only)
export async function updateUserSubscription(
  adminId: string,
  userId: string,
  subscriptionTier: 'starter' | 'professional' | 'enterprise' | null,
  subscriptionStatus: 'active' | 'inactive' | 'cancelled' | 'past_due' | null
) {
  const supabase = createSupabaseAdminClient()

  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        subscription_tier: subscriptionTier,
        subscription_status: subscriptionStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user subscription:', error)
      return null
    }

    // Log the action
    await logAdminAction(adminId, 'UPDATE_SUBSCRIPTION', userId, {
      subscription_tier: subscriptionTier,
      subscription_status: subscriptionStatus
    })

    return data
  } catch (error) {
    console.error('Error in updateUserSubscription:', error)
    return null
  }
}

// Get system analytics (admin only)
export async function getSystemAnalytics(adminId: string) {
  const supabase = createSupabaseAdminClient()

  try {
    // Get basic stats
    const { data: stats, error: statsError } = await supabase
      .rpc('admin_system_overview')

    if (statsError) {
      console.error('Error fetching system stats:', statsError)
    }

    // Get recent activity
    const { data: recentUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, created_at, subscription_tier, subscription_status')
      .order('created_at', { ascending: false })
      .limit(10)

    if (usersError) {
      console.error('Error fetching recent users:', usersError)
    }

    // Log the action
    await logAdminAction(adminId, 'VIEW_SYSTEM_ANALYTICS')

    return {
      stats: stats || {},
      recentUsers: recentUsers || []
    }
  } catch (error) {
    console.error('Error in getSystemAnalytics:', error)
    return null
  }
}

// Promote user to admin (super admin only)
export async function promoteUserToAdmin(
  adminId: string,
  targetUserId: string
) {
  const supabase = createSupabaseAdminClient()

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', targetUserId)
      .select()
      .single()

    if (error) {
      console.error('Error promoting user to admin:', error)
      return null
    }

    // Log the action
    await logAdminAction(adminId, 'PROMOTE_TO_ADMIN', targetUserId)

    return data
  } catch (error) {
    console.error('Error in promoteUserToAdmin:', error)
    return null
  }
}

// Suspend user account (admin only)
export async function suspendUser(
  adminId: string,
  targetUserId: string,
  reason?: string
) {
  const supabase = createSupabaseAdminClient()

  try {
    // Use the database function
    const { data: result, error } = await supabase
      .rpc('suspend_user', {
        p_admin_id: adminId,
        p_target_user_id: targetUserId,
        p_reason: reason || null
      })

    if (error || !result) {
      console.error('Error suspending user:', error)
      return null
    }

    return result
  } catch (error) {
    console.error('Error in suspendUser:', error)
    return null
  }
}

// Unsuspend user account (admin only)
export async function unsuspendUser(
  adminId: string,
  targetUserId: string
) {
  const supabase = createSupabaseAdminClient()

  try {
    // Use the database function
    const { data: result, error } = await supabase
      .rpc('unsuspend_user', {
        p_admin_id: adminId,
        p_target_user_id: targetUserId
      })

    if (error || !result) {
      console.error('Error unsuspending user:', error)
      return null
    }

    return result
  } catch (error) {
    console.error('Error in unsuspendUser:', error)
    return null
  }
}

// Get audit logs (admin only)
export async function getAuditLogs(
  adminId: string,
  filters: {
    action_type?: string
    action?: string
    target_user_id?: string
    start_date?: string
    end_date?: string
    success?: boolean
    page?: number
    limit?: number
  } = {}
) {
  const supabase = createSupabaseAdminClient()

  try {
    let query = supabase
      .from('admin_audit_log')
      .select(`
        *,
        admin:admin_id(email),
        target_user:target_user_id(email)
      `, { count: 'exact' })

    // Apply filters
    if (filters.action_type && filters.action_type !== 'all') {
      query = query.eq('action_type', filters.action_type)
    }

    if (filters.action) {
      query = query.ilike('action', `%${filters.action}%`)
    }

    if (filters.target_user_id) {
      query = query.eq('target_user_id', filters.target_user_id)
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date)
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date)
    }

    if (filters.success !== undefined) {
      query = query.eq('success', filters.success)
    }

    // Apply pagination
    const page = filters.page || 1
    const limit = filters.limit || 50
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: auditLogs, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching audit logs:', error)
      return null
    }

    // Log the action
    await logAdminAction(adminId, 'VIEW_AUDIT_LOGS', undefined, filters)

    return {
      auditLogs: auditLogs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  } catch (error) {
    console.error('Error in getAuditLogs:', error)
    return null
  }
}
