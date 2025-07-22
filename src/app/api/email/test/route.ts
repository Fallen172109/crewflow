import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { emailService } from '@/lib/email/resend-service'

export async function POST(request: NextRequest) {
  try {
    // Require authentication for email testing
    const user = await requireAuth()
    
    const { type, to, testData } = await request.json()
    
    if (!type || !to) {
      return NextResponse.json(
        { error: 'Missing required parameters: type, to' },
        { status: 400 }
      )
    }

    let result: { success: boolean; messageId?: string; error?: string }

    switch (type) {
      case 'welcome':
        const confirmationUrl = testData?.confirmationUrl || `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?token=test-token`
        result = await emailService.sendWelcomeEmail(to, confirmationUrl)
        break

      case 'password_reset':
        const resetUrl = testData?.resetUrl || `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset?token=test-token`
        result = await emailService.sendPasswordResetEmail(to, resetUrl)
        break

      case 'agent_notification':
        const agentId = testData?.agentId || 'anchor'
        const title = testData?.title || 'Test Notification'
        const message = testData?.message || 'This is a test notification from your CrewFlow agent.'
        result = await emailService.sendAgentNotification(to, agentId, title, message)
        break

      case 'custom':
        result = await emailService.sendEmail({
          to,
          subject: testData?.subject || 'Test Email from CrewFlow',
          html: testData?.html || '<h1>Test Email</h1><p>This is a test email from CrewFlow.</p>',
          text: testData?.text || 'Test Email\n\nThis is a test email from CrewFlow.'
        })
        break

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: `${type} email sent successfully to ${to}`,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          message: `Failed to send ${type} email to ${to}`
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Email test API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to show available test options
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    const emailConfig = emailService.getEmailConfig()
    
    return NextResponse.json({
      availableTypes: [
        'welcome',
        'password_reset', 
        'agent_notification',
        'custom'
      ],
      emailConfig: {
        fromEmail: emailConfig.fromEmail,
        fromName: emailConfig.fromName,
        systemEmails: {
          noreply: emailConfig.noreply,
          support: emailConfig.support,
          admin: emailConfig.admin
        },
        agentEmails: emailConfig.agents
      },
      testExamples: {
        welcome: {
          type: 'welcome',
          to: 'test@example.com',
          testData: {
            confirmationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?token=test-token`
          }
        },
        password_reset: {
          type: 'password_reset',
          to: 'test@example.com',
          testData: {
            resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset?token=test-token`
          }
        },
        agent_notification: {
          type: 'agent_notification',
          to: 'test@example.com',
          testData: {
            agentId: 'anchor',
            title: 'Test Notification',
            message: 'This is a test notification from your CrewFlow agent.'
          }
        },
        custom: {
          type: 'custom',
          to: 'test@example.com',
          testData: {
            subject: 'Custom Test Email',
            html: '<h1>Custom Test</h1><p>This is a custom test email.</p>',
            text: 'Custom Test\n\nThis is a custom test email.'
          }
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Email test info API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
