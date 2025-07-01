import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    console.log('=== AUTH DEBUG ENDPOINT ===')

    // Check cookies
    const cookies = request.cookies
    console.log('Available cookies:', cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value })))

    const supabase = await createSupabaseServerClient()
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Auth result:', {
      user: user ? { id: user.id, email: user.email } : null,
      authError: authError?.message
    })
    
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('Session result:', {
      session: session ? { 
        user: session.user?.id, 
        expires_at: session.expires_at,
        access_token: session.access_token ? 'present' : 'missing'
      } : null,
      sessionError: sessionError?.message
    })
    
    return NextResponse.json({
      success: true,
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      } : null,
      session: session ? {
        expires_at: session.expires_at,
        token_type: session.token_type
      } : null,
      errors: {
        authError: authError?.message,
        sessionError: sessionError?.message
      },
      cookies: cookies.getAll().map(c => ({ 
        name: c.name, 
        hasValue: !!c.value,
        valueLength: c.value?.length || 0
      }))
    })
    
  } catch (error) {
    console.error('Debug auth error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
