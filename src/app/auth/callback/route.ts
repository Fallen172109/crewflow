import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  console.log('Auth callback hit:', { code: !!code, error, errorDescription })

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/login?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  // If we have a code, exchange it for a session
  if (code) {
    try {
      const supabase = createSupabaseServerClient()

      // Exchange the code for a session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError)
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`
        )
      }

      if (data.session) {
        console.log('Session created successfully for user:', data.session.user.email)

        // Create response with redirect
        const response = NextResponse.redirect(`${requestUrl.origin}/auth/login?confirmed=true`)

        // Set session cookies manually to ensure they're available immediately
        response.cookies.set('sb-access-token', data.session.access_token, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        })

        response.cookies.set('sb-refresh-token', data.session.refresh_token, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30 // 30 days
        })

        return response
      } else {
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/login?error=${encodeURIComponent('Authentication failed. Please try signing in.')}`
        )
      }
    } catch (error) {
      console.error('Unexpected error during code exchange:', error)
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`
      )
    }
  }

  // No code provided - this might be a direct visit to the callback URL
  console.log('No code provided to callback route')
  return NextResponse.redirect(`${requestUrl.origin}/auth/login`)
}
