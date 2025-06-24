import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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
      `${requestUrl.origin}/auth/confirm-success?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  // If we have a code, exchange it for a session
  if (code) {
    try {
      const supabase = await createSupabaseServerClient()

      // Exchange the code for a session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError)
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/confirm-success?error=${encodeURIComponent(exchangeError.message)}`
        )
      }

      if (data.session) {
        console.log('Session created successfully for user:', data.session.user.email)

        // Create response with redirect to confirmation success page
        const response = NextResponse.redirect(`${requestUrl.origin}/auth/confirm-success`)

        // Set the session using Supabase's cookie system
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        })

        return response
      } else {
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/confirm-success?error=${encodeURIComponent('Authentication failed. Please try signing in.')}`
        )
      }
    } catch (error) {
      console.error('Unexpected error during code exchange:', error)
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/confirm-success?error=${encodeURIComponent('Authentication failed. Please try again.')}`
      )
    }
  }

  // No code provided - this might be a direct visit to the callback URL
  console.log('No code provided to callback route')
  return NextResponse.redirect(`${requestUrl.origin}/auth/login`)
}
