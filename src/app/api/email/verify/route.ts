import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET(request: NextRequest) {
  try {
    // Check if API key exists
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { 
          error: 'RESEND_API_KEY environment variable is missing',
          status: 'failed'
        },
        { status: 500 }
      )
    }

    // Initialize Resend client
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Test the API key by getting domains
    try {
      const { data: domains, error: domainError } = await resend.domains.list()
      
      if (domainError) {
        return NextResponse.json(
          { 
            error: 'Resend API error',
            details: domainError.message,
            status: 'failed'
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        status: 'success',
        message: 'Resend API key is valid',
        domains: domains,
        config: {
          fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@crewflow.ai',
          fromName: process.env.RESEND_FROM_NAME || 'CrewFlow'
        },
        timestamp: new Date().toISOString()
      })

    } catch (apiError: any) {
      return NextResponse.json(
        { 
          error: 'Failed to connect to Resend API',
          details: apiError.message,
          status: 'failed'
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        status: 'failed'
      },
      { status: 500 }
    )
  }
}
