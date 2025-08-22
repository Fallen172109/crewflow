import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies })

    console.log('🔍 SESSION COOKIE DEBUG: Starting analysis...')
    
    // Get all cookies
    const allCookies = cookieStore.getAll()
    
    // Filter Supabase-related cookies
    const supabaseCookies = allCookies.filter(cookie => 
      cookie.name.includes('supabase') || 
      cookie.name.includes('sb-') ||
      cookie.name.includes('auth-token')
    )
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Get request headers
    const host = req.headers.get('host')
    const userAgent = req.headers.get('user-agent')
    const origin = req.headers.get('origin')
    const referer = req.headers.get('referer')
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      domain: {
        host,
        origin,
        referer,
        isProduction: host === 'crewflow.ai',
        isWww: host?.startsWith('www.'),
      },
      cookies: {
        total: allCookies.length,
        supabaseRelated: supabaseCookies.length,
        supabaseCookies: supabaseCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value,
          valueLength: c.value?.length || 0,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          sameSite: c.sameSite
        })),
        allCookieNames: allCookies.map(c => c.name)
      },
      session: {
        exists: !!session,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        expiresAt: session?.expires_at,
        accessToken: session?.access_token ? 'present' : 'missing',
        refreshToken: session?.refresh_token ? 'present' : 'missing',
        sessionError: sessionError?.message,
        userError: userError?.message
      },
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
      }
    })
  } catch (error) {
    console.error('Session cookie debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
