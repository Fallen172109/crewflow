import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  console.log('👤 AUTH USER: Checking user authentication...')
  
  try {
    const supabase = createSupabaseClient()
    
    // Get current user from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('👤 AUTH USER: Supabase auth result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    })
    
    if (authError) {
      console.log('❌ AUTH USER: Authentication error:', authError.message)
      return NextResponse.json({
        success: false,
        error: 'Authentication error: ' + authError.message,
        user: null
      }, { status: 401 })
    }
    
    if (!user) {
      console.log('❌ AUTH USER: No user found')
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        user: null
      }, { status: 401 })
    }
    
    console.log('✅ AUTH USER: User authenticated successfully:', user.email)
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      }
    })
    
  } catch (error) {
    console.error('💥 AUTH USER: Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      user: null
    }, { status: 500 })
  }
}
