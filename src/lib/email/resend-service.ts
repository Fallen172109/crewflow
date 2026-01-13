import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Email configuration
const EMAIL_CONFIG = {
  fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@crewflow.ai',
  fromName: process.env.RESEND_FROM_NAME || 'CrewFlow',
  
  // Professional email addresses
  noreply: process.env.CREWFLOW_NOREPLY_EMAIL || 'noreply@crewflow.ai',
  support: process.env.CREWFLOW_SUPPORT_EMAIL || 'support@crewflow.ai',
  admin: process.env.CREWFLOW_ADMIN_EMAIL || 'admin@crewflow.ai',
  
  // Agent-specific email addresses
  agents: {
    anchor: process.env.ANCHOR_EMAIL || 'anchor@crewflow.ai',
    sage: process.env.SAGE_EMAIL || 'sage@crewflow.ai',
    helm: process.env.HELM_EMAIL || 'helm@crewflow.ai',
    ledger: process.env.LEDGER_EMAIL || 'ledger@crewflow.ai',
    patch: process.env.PATCH_EMAIL || 'patch@crewflow.ai',
    pearl: process.env.PEARL_EMAIL || 'pearl@crewflow.ai',
    flint: process.env.FLINT_EMAIL || 'flint@crewflow.ai',
    beacon: process.env.BEACON_EMAIL || 'beacon@crewflow.ai',
    splash: process.env.SPLASH_EMAIL || 'splash@crewflow.ai',
    drake: process.env.DRAKE_EMAIL || 'drake@crewflow.ai'
  }
}

// Email template types
export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

// Email sending options
export interface SendEmailOptions {
  to: string | string[]
  from?: string
  fromName?: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  cc?: string[]
  bcc?: string[]
}

// Email service class
export class ResendEmailService {
  private resend: Resend

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is required')
    }
    this.resend = resend
  }

  /**
   * Send a basic email
   */
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: `${options.fromName || EMAIL_CONFIG.fromName} <${options.from || EMAIL_CONFIG.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
        cc: options.cc,
        bcc: options.bcc
      })

      if (error) {
        console.error('Resend email error:', error)
        return { success: false, error: error.message }
      }

      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('Email sending failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send welcome/confirmation email
   */
  async sendWelcomeEmail(to: string, confirmationUrl: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.generateWelcomeEmailTemplate(confirmationUrl)
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text
    })
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.generatePasswordResetTemplate(resetUrl)
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text
    })
  }

  /**
   * Send agent notification email
   */
  async sendAgentNotification(
    to: string, 
    agentId: string, 
    title: string, 
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const agentEmail = EMAIL_CONFIG.agents[agentId as keyof typeof EMAIL_CONFIG.agents] || EMAIL_CONFIG.fromEmail
    const template = this.generateAgentNotificationTemplate(agentId, title, message)
    
    return this.sendEmail({
      to,
      from: agentEmail,
      fromName: `CrewFlow ${agentId.charAt(0).toUpperCase() + agentId.slice(1)}`,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: EMAIL_CONFIG.support
    })
  }

  /**
   * Generate welcome email template
   */
  private generateWelcomeEmailTemplate(confirmationUrl: string): EmailTemplate {
    const subject = '🚢 Welcome to CrewFlow - Confirm Your Account'
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to CrewFlow</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Source Sans Pro', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #5BBF46, #e55a2b); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 600;">⚓ CrewFlow</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Maritime AI Automation Platform</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 20px;">
            <h2 style="color: #000000; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">Welcome Aboard! 🚢</h2>
            
            <p style="color: #000000; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Thank you for joining CrewFlow, your maritime AI automation platform. We're excited to have you as part of our crew!
            </p>
            
            <p style="color: #000000; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              To get started, please confirm your email address by clicking the button below:
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" 
                 style="display: inline-block; background-color: #5BBF46; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; font-weight: 600; transition: background-color 0.3s;">
                Confirm Your Account
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
              If the button doesn't work, you can also copy and paste this link into your browser:<br>
              <a href="${confirmationUrl}" style="color: #5BBF46; word-break: break-all;">${confirmationUrl}</a>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This email was sent from <strong>CrewFlow</strong><br>
              If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
    
    const text = `
      Welcome to CrewFlow!
      
      Thank you for joining CrewFlow, your maritime AI automation platform.
      
      To get started, please confirm your email address by visiting:
      ${confirmationUrl}
      
      If you didn't create an account, you can safely ignore this email.
      
      - The CrewFlow Team
    `
    
    return { subject, html, text }
  }

  /**
   * Generate password reset email template
   */
  private generatePasswordResetTemplate(resetUrl: string): EmailTemplate {
    const subject = '🔐 CrewFlow Password Reset Request'
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - CrewFlow</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Source Sans Pro', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #5BBF46, #e55a2b); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 600;">⚓ CrewFlow</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Password Reset Request</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 20px;">
            <h2 style="color: #000000; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">Reset Your Password</h2>
            
            <p style="color: #000000; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              We received a request to reset your CrewFlow account password. Click the button below to create a new password:
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; background-color: #5BBF46; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 10px 0 0 0;">
              This link will expire in 24 hours for security reasons.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This email was sent from <strong>CrewFlow</strong><br>
              For support, contact us at support@crewflow.ai
            </p>
          </div>
        </div>
      </body>
      </html>
    `
    
    const text = `
      CrewFlow Password Reset Request
      
      We received a request to reset your CrewFlow account password.
      
      To reset your password, visit:
      ${resetUrl}
      
      If you didn't request a password reset, you can safely ignore this email.
      This link will expire in 24 hours for security reasons.
      
      - The CrewFlow Team
    `
    
    return { subject, html, text }
  }

  /**
   * Generate agent notification email template
   */
  private generateAgentNotificationTemplate(agentId: string, title: string, message: string): EmailTemplate {
    const agentName = agentId.charAt(0).toUpperCase() + agentId.slice(1)
    const subject = `🚢 CrewFlow Alert from ${agentName}: ${title}`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CrewFlow Alert - ${agentName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Source Sans Pro', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #5BBF46, #e55a2b); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 600;">⚓ CrewFlow</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Alert from ${agentName}</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 20px;">
            <h2 style="color: #000000; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">${title}</h2>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #5BBF46; padding: 20px; margin: 20px 0;">
              <p style="color: #000000; font-size: 16px; line-height: 1.6; margin: 0;">
                ${message}
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
              This notification was generated by your ${agentName} agent in CrewFlow.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This email was sent from <strong>CrewFlow ${agentName}</strong><br>
              For support, contact us at support@crewflow.ai
            </p>
          </div>
        </div>
      </body>
      </html>
    `
    
    const text = `
      CrewFlow Alert from ${agentName}
      
      ${title}
      
      ${message}
      
      This notification was generated by your ${agentName} agent in CrewFlow.
      
      - The CrewFlow Team
    `
    
    return { subject, html, text }
  }

  /**
   * Get email configuration
   */
  getEmailConfig() {
    return EMAIL_CONFIG
  }
}

// Export singleton instance
export const emailService = new ResendEmailService()

// Export utility functions
export const getAgentEmail = (agentId: string): string => {
  return EMAIL_CONFIG.agents[agentId as keyof typeof EMAIL_CONFIG.agents] || EMAIL_CONFIG.fromEmail
}

export const getSystemEmail = (type: 'noreply' | 'support' | 'admin'): string => {
  return EMAIL_CONFIG[type]
}
