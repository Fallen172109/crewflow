import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = await createSupabaseServerClient()

    // Get all cookies
    const allCookies = cookieStore.getAll()
    const relevantCookies = allCookies.filter(cookie => 
      cookie.name.includes('supabase') || 
      cookie.name.includes('sb-') ||
      cookie.name.includes('auth')
    )

    // Try to get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Try to get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    // If we have a user, try to check admin status
    let adminCheck = null
    let profileCheck = null
    
    if (user) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        
        profileCheck = {
          profile,
          error: profileError?.message
        }

        // Test admin function
        const { data: adminResult, error: adminError } = await supabase
          .rpc('is_admin', { user_id: user.id })
        
        adminCheck = {
          result: adminResult,
          error: adminError?.message
        }
      } catch (error) {
        adminCheck = { error: error.message }
        profileCheck = { error: error.message }
      }
    }

    return NextResponse.json({
      cookies: {
        total: allCookies.length,
        relevant: relevantCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value,
          valueLength: c.value?.length || 0
        }))
      },
      auth: {
        user: user ? {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        } : null,
        userError: userError?.message,
        session: session ? {
          access_token: session.access_token ? 'Present' : 'Missing',
          refresh_token: session.refresh_token ? 'Present' : 'Missing',
          expires_at: session.expires_at,
          user_id: session.user?.id
        } : null,
        sessionError: sessionError?.message
      },
      database: {
        profileCheck,
        adminCheck
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
