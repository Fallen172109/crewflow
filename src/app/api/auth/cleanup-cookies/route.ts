import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

/**
 * Cookie cleanup utility to resolve authentication issues
 * Clears old/conflicting Supabase cookies and forces fresh login
 */
export async function POST() {
  try {
    const cookieStore = await cookies()
    
    // Get all cookies to identify what needs cleanup
    const allCookies = cookieStore.getAll()
    
    // Find all Supabase-related cookies
    const supabaseCookies = allCookies.filter(cookie => 
      cookie.name.includes('supabase') || 
      cookie.name.includes('sb-') ||
      cookie.name.includes('auth-token')
    )
    
    console.log('🧹 COOKIE CLEANUP: Found cookies to clear:', supabaseCookies.map(c => c.name))
    
    // Create response with cookie clearing headers
    const response = NextResponse.json({
      success: true,
      message: 'Cookies cleared successfully',
      clearedCookies: supabaseCookies.map(c => c.name),
      timestamp: new Date().toISOString(),
      instructions: [
        '1. All Supabase authentication cookies have been cleared',
        '2. Please log in again to establish a fresh session',
        '3. The new session will use standard cookie names',
        '4. This should resolve any client/server session mismatches'
      ]
    })
    
    // Clear each Supabase cookie for both domains
    supabaseCookies.forEach(cookie => {
      // Clear for current domain
      response.cookies.set({
        name: cookie.name,
        value: '',
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      })
      
      // Clear for apex domain (in case we're on www)
      response.cookies.set({
        name: cookie.name,
        value: '',
        expires: new Date(0),
        path: '/',
        domain: '.crewflow.ai',
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      })
    })
    
    // Also clear any potential legacy cookies by name
    const legacyCookieNames = [
      'sb-crewflow-auth-token',
      'sb-bmlieuyijpgxdhvicpsf-auth-token',
      'supabase-auth-token',
      'supabase.auth.token'
    ]
    
    legacyCookieNames.forEach(cookieName => {
      response.cookies.set({
        name: cookieName,
        value: '',
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      })
      
      response.cookies.set({
        name: cookieName,
        value: '',
        expires: new Date(0),
        path: '/',
        domain: '.crewflow.ai',
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      })
    })
    
    return response
    
  } catch (error) {
    console.error('Cookie cleanup error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Cookie cleanup utility',
    usage: 'Send a POST request to this endpoint to clear all Supabase cookies',
    warning: 'This will log out the current user and require re-authentication'
  })
}
