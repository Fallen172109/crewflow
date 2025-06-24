// API Route: OAuth Callback
// Production-ready OAuth callback with enhanced security

import { NextRequest, NextResponse } from 'next/server'
import { createOAuthManager } from '@/lib/integrations/oauth'
import { validateOAuthState, createOAuthMiddleware } from '@/lib/integrations/middleware'

export async function GET(request: NextRequest) {
  const middleware = createOAuthMiddleware({
    requireAuth: false, // OAuth callback doesn't require pre-auth
    rateLimitByIP: true,
    validateOrigin: false, // OAuth providers redirect from their domains
    logRequests: true
  })

  try {
    // Apply security middleware
    const middlewareResult = await middleware.handle(request)
    if (!middlewareResult.success) {
      console.error('OAuth callback security check failed:', middlewareResult.error)
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Security check failed', request.url)
      )
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth provider errors
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'OAuth authorization failed'
      console.error('OAuth provider error:', error, errorDescription)

      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(errorDescription)}`, request.url)
      )
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('OAuth callback missing required parameters:', { code: !!code, state: !!state })
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Invalid OAuth callback parameters', request.url)
      )
    }

    // Validate state parameter for security
    const stateValidation = await validateOAuthState(state)
    if (!stateValidation.valid) {
      console.error('OAuth state validation failed:', stateValidation.error)
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(stateValidation.error || 'Invalid OAuth state')}`, request.url)
      )
    }

    // Get client IP and user agent for audit logging
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const oauthManager = createOAuthManager()
    const result = await oauthManager.handleCallback(code, state, {
      ip: clientIP,
      userAgent
    })

    if (result.success) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?success=Integration connected successfully', request.url)
      )
    } else {
      console.error('OAuth callback failed:', result.error, result.errorCode)

      // Provide more specific error messages based on error code
      let userMessage = 'Connection failed'
      switch (result.errorCode) {
        case 'TOKEN_EXPIRED':
          userMessage = 'Authorization expired. Please try connecting again.'
          break
        case 'INVALID_REQUEST':
          userMessage = 'Invalid authorization request. Please try again.'
          break
        case 'UNAUTHORIZED':
          userMessage = 'Authorization denied. Please check your permissions.'
          break
        case 'RATE_LIMITED':
          userMessage = 'Too many requests. Please wait a moment and try again.'
          break
        default:
          userMessage = result.error || 'Connection failed'
      }

      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(userMessage)}`, request.url)
      )
    }

  } catch (error) {
    console.error('OAuth callback unexpected error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=OAuth callback failed', request.url)
    )
  }
}
