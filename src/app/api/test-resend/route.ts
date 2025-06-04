import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Test Resend API directly
    const resendApiKey = 're_HjSe8etJ_9eHRMpAcqLDB3aDBhtazhC8X'
    
    const emailData = {
      from: 'onboarding@resend.dev',
      to: [email],
      subject: '🚢 CrewFlow Test Email - Direct Resend API',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🚢 CrewFlow Test Email</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Direct Resend API Test</p>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #ff6b35; margin: 0 0 20px 0; font-size: 24px;">Email System Test</h2>
            <p style="font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
              This email was sent directly through the Resend API to test if the connection is working.
            </p>
            <p style="font-size: 14px; color: #cccccc;">
              If you received this email, it means:
            </p>
            <ul style="color: #cccccc; font-size: 14px;">
              <li>✅ Resend API key is valid</li>
              <li>✅ Domain configuration is working</li>
              <li>✅ Email delivery is functional</li>
            </ul>
          </div>
          <div style="background: #1a1a1a; padding: 20px 30px; text-align: center; border-top: 1px solid #333;">
            <p style="margin: 0; font-size: 12px; color: #888888;">© 2024 CrewFlow - Maritime AI Automation Platform</p>
          </div>
        </div>
      `
    }

    console.log('🔍 Testing Resend API directly...')
    console.log('Email data:', { ...emailData, html: '[HTML_CONTENT]' })

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    })

    const responseData = await response.json()
    
    console.log('📧 Resend API response:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData
    })

    if (!response.ok) {
      console.error('❌ Resend API error:', responseData)
      return NextResponse.json({
        success: false,
        error: responseData.message || 'Failed to send email',
        details: responseData,
        status: response.status
      }, { status: response.status })
    }

    console.log('✅ Email sent successfully via Resend API')
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully via Resend API',
      emailId: responseData.id,
      details: responseData
    })

  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
