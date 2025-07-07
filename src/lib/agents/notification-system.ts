// Notification System for Agent Actions
// Handles real-time notifications for agent activities, approvals, and alerts

import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface Notification {
  id: string
  userId: string
  type: 'approval_request' | 'action_completed' | 'action_failed' | 'emergency_alert' | 'system_alert' | 'agent_status'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: 'agent_action' | 'approval' | 'system' | 'security' | 'performance'
  agentId?: string
  integrationId?: string
  actionId?: string
  approvalId?: string
  metadata: any
  read: boolean
  createdAt: Date
  readAt?: Date
  expiresAt?: Date
  actionRequired: boolean
  actionUrl?: string
}

export interface NotificationPreferences {
  userId: string
  emailEnabled: boolean
  pushEnabled: boolean
  smsEnabled: boolean
  inAppEnabled: boolean
  categories: {
    agent_action: boolean
    approval: boolean
    system: boolean
    security: boolean
    performance: boolean
  }
  priorities: {
    low: boolean
    medium: boolean
    high: boolean
    critical: boolean
  }
  quietHours: {
    enabled: boolean
    startTime: string // HH:MM
    endTime: string // HH:MM
    timezone: string
  }
  frequency: {
    immediate: string[] // notification types for immediate delivery
    digest: string[] // notification types for digest delivery
    digestFrequency: 'hourly' | 'daily' | 'weekly'
  }
}

// Create a new notification
export async function createNotification(
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  options: {
    priority?: Notification['priority']
    category?: Notification['category']
    agentId?: string
    integrationId?: string
    actionId?: string
    approvalId?: string
    metadata?: any
    actionRequired?: boolean
    actionUrl?: string
    expiresAt?: Date
  } = {}
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const supabase = createSupabaseServerClient()
  
  try {
    const notification: Notification = {
      id: crypto.randomUUID(),
      userId,
      type,
      title,
      message,
      priority: options.priority || 'medium',
      category: options.category || 'agent_action',
      agentId: options.agentId,
      integrationId: options.integrationId,
      actionId: options.actionId,
      approvalId: options.approvalId,
      metadata: options.metadata || {},
      read: false,
      createdAt: new Date(),
      expiresAt: options.expiresAt,
      actionRequired: options.actionRequired || false,
      actionUrl: options.actionUrl
    }
    
    // Store in database
    const { error } = await supabase.from('notifications').insert({
      id: notification.id,
      user_id: userId,
      type,
      title,
      message,
      priority: notification.priority,
      category: notification.category,
      agent_id: options.agentId,
      integration_id: options.integrationId,
      action_id: options.actionId,
      approval_id: options.approvalId,
      metadata: notification.metadata,
      read: false,
      created_at: notification.createdAt.toISOString(),
      expires_at: options.expiresAt?.toISOString(),
      action_required: notification.actionRequired,
      action_url: options.actionUrl
    })
    
    if (error) {
      throw error
    }
    
    // Send notification based on user preferences
    await sendNotification(notification)
    
    return {
      success: true,
      notificationId: notification.id
    }
  } catch (error) {
    console.error('Error creating notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Send notification through various channels
async function sendNotification(notification: Notification): Promise<void> {
  try {
    // Get user preferences
    const preferences = await getNotificationPreferences(notification.userId)
    
    // Check if notification should be sent based on preferences
    if (!shouldSendNotification(notification, preferences)) {
      return
    }
    
    // Check quiet hours
    if (isQuietHours(preferences)) {
      // Queue for later delivery unless it's critical
      if (notification.priority !== 'critical') {
        await queueNotification(notification)
        return
      }
    }
    
    // Send through enabled channels
    const promises: Promise<void>[] = []
    
    if (preferences.inAppEnabled) {
      promises.push(sendInAppNotification(notification))
    }
    
    if (preferences.emailEnabled && shouldSendEmail(notification, preferences)) {
      promises.push(sendEmailNotification(notification))
    }
    
    if (preferences.pushEnabled) {
      promises.push(sendPushNotification(notification))
    }
    
    if (preferences.smsEnabled && notification.priority === 'critical') {
      promises.push(sendSMSNotification(notification))
    }
    
    await Promise.allSettled(promises)
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}

// Get user notification preferences
async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const supabase = createSupabaseServerClient()
  
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error || !data) {
      // Return default preferences
      return getDefaultNotificationPreferences(userId)
    }
    
    return {
      userId: data.user_id,
      emailEnabled: data.email_enabled,
      pushEnabled: data.push_enabled,
      smsEnabled: data.sms_enabled,
      inAppEnabled: data.in_app_enabled,
      categories: data.categories || {
        agent_action: true,
        approval: true,
        system: true,
        security: true,
        performance: true
      },
      priorities: data.priorities || {
        low: true,
        medium: true,
        high: true,
        critical: true
      },
      quietHours: data.quiet_hours || {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC'
      },
      frequency: data.frequency || {
        immediate: ['approval_request', 'emergency_alert', 'action_failed'],
        digest: ['action_completed', 'system_alert'],
        digestFrequency: 'daily'
      }
    }
  } catch (error) {
    console.error('Error getting notification preferences:', error)
    return getDefaultNotificationPreferences(userId)
  }
}

// Get default notification preferences
function getDefaultNotificationPreferences(userId: string): NotificationPreferences {
  return {
    userId,
    emailEnabled: true,
    pushEnabled: true,
    smsEnabled: false,
    inAppEnabled: true,
    categories: {
      agent_action: true,
      approval: true,
      system: true,
      security: true,
      performance: true
    },
    priorities: {
      low: false,
      medium: true,
      high: true,
      critical: true
    },
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
      timezone: 'UTC'
    },
    frequency: {
      immediate: ['approval_request', 'emergency_alert', 'action_failed'],
      digest: ['action_completed', 'system_alert'],
      digestFrequency: 'daily'
    }
  }
}

// Check if notification should be sent based on preferences
function shouldSendNotification(notification: Notification, preferences: NotificationPreferences): boolean {
  // Check category preferences
  if (!preferences.categories[notification.category]) {
    return false
  }
  
  // Check priority preferences
  if (!preferences.priorities[notification.priority]) {
    return false
  }
  
  return true
}

// Check if it's currently quiet hours
function isQuietHours(preferences: NotificationPreferences): boolean {
  if (!preferences.quietHours.enabled) {
    return false
  }
  
  const now = new Date()
  const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
  
  // Simple time comparison (doesn't handle timezone properly - would need proper implementation)
  const startTime = preferences.quietHours.startTime
  const endTime = preferences.quietHours.endTime
  
  if (startTime < endTime) {
    return currentTime >= startTime && currentTime <= endTime
  } else {
    // Quiet hours span midnight
    return currentTime >= startTime || currentTime <= endTime
  }
}

// Check if email should be sent for this notification
function shouldSendEmail(notification: Notification, preferences: NotificationPreferences): boolean {
  return preferences.frequency.immediate.includes(notification.type) ||
         notification.priority === 'critical' ||
         notification.actionRequired
}

// Send in-app notification (real-time via WebSocket/SSE)
async function sendInAppNotification(notification: Notification): Promise<void> {
  // TODO: Implement real-time in-app notification
  // This would typically use WebSockets or Server-Sent Events
  console.log('In-app notification sent:', notification.title)
}

// Send email notification
async function sendEmailNotification(notification: Notification): Promise<void> {
  try {
    // TODO: Implement actual email sending using Resend or similar service
    console.log('Email notification sent:', notification.title)
    
    // Example email content structure:
    const emailContent = {
      to: notification.userId, // Would need to get actual email
      subject: `CrewFlow Alert: ${notification.title}`,
      html: generateEmailTemplate(notification)
    }
    
    // await sendEmail(emailContent)
  } catch (error) {
    console.error('Error sending email notification:', error)
  }
}

// Send push notification
async function sendPushNotification(notification: Notification): Promise<void> {
  try {
    // TODO: Implement push notification using service like Firebase Cloud Messaging
    console.log('Push notification sent:', notification.title)
  } catch (error) {
    console.error('Error sending push notification:', error)
  }
}

// Send SMS notification
async function sendSMSNotification(notification: Notification): Promise<void> {
  try {
    // TODO: Implement SMS sending using service like Twilio
    console.log('SMS notification sent:', notification.title)
  } catch (error) {
    console.error('Error sending SMS notification:', error)
  }
}

// Queue notification for later delivery
async function queueNotification(notification: Notification): Promise<void> {
  const supabase = createSupabaseServerClient()
  
  try {
    await supabase.from('notification_queue').insert({
      notification_id: notification.id,
      user_id: notification.userId,
      scheduled_for: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours later
      type: 'quiet_hours_delay'
    })
  } catch (error) {
    console.error('Error queueing notification:', error)
  }
}

// Generate email template
function generateEmailTemplate(notification: Notification): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ea580c, #f97316); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">⚓ CrewFlow</h1>
        <p style="color: white; margin: 5px 0 0 0;">Maritime AI Automation Platform</p>
      </div>
      
      <div style="padding: 30px; background: white;">
        <h2 style="color: #1f2937; margin-top: 0;">${notification.title}</h2>
        <p style="color: #4b5563; line-height: 1.6;">${notification.message}</p>
        
        ${notification.actionRequired ? `
          <div style="margin: 20px 0; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-weight: 500;">Action Required</p>
          </div>
        ` : ''}
        
        ${notification.actionUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${notification.actionUrl}" style="background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Take Action
            </a>
          </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
          <p>Priority: <strong style="text-transform: capitalize;">${notification.priority}</strong></p>
          <p>Agent: <strong>${notification.agentId || 'System'}</strong></p>
          <p>Time: <strong>${notification.createdAt.toLocaleString()}</strong></p>
        </div>
      </div>
      
      <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
        <p>You're receiving this because you have notifications enabled for ${notification.category} alerts.</p>
        <p><a href="#" style="color: #ea580c;">Manage notification preferences</a></p>
      </div>
    </div>
  `
}

// Get notifications for a user
export async function getUserNotifications(
  userId: string,
  options: {
    limit?: number
    unreadOnly?: boolean
    category?: string
    priority?: string
  } = {}
): Promise<Notification[]> {
  const supabase = createSupabaseServerClient()
  
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (options.unreadOnly) {
      query = query.eq('read', false)
    }
    
    if (options.category) {
      query = query.eq('category', options.category)
    }
    
    if (options.priority) {
      query = query.eq('priority', options.priority)
    }
    
    if (options.limit) {
      query = query.limit(options.limit)
    }
    
    const { data, error } = await query
    
    if (error) {
      throw error
    }
    
    return (data || []).map(record => ({
      id: record.id,
      userId: record.user_id,
      type: record.type,
      title: record.title,
      message: record.message,
      priority: record.priority,
      category: record.category,
      agentId: record.agent_id,
      integrationId: record.integration_id,
      actionId: record.action_id,
      approvalId: record.approval_id,
      metadata: record.metadata || {},
      read: record.read,
      createdAt: new Date(record.created_at),
      readAt: record.read_at ? new Date(record.read_at) : undefined,
      expiresAt: record.expires_at ? new Date(record.expires_at) : undefined,
      actionRequired: record.action_required,
      actionUrl: record.action_url
    }))
  } catch (error) {
    console.error('Error getting user notifications:', error)
    return []
  }
}

// Mark notification as read
export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient()
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', userId)
    
    if (error) {
      throw error
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient()
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('read', false)
    
    if (error) {
      throw error
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Clean up expired notifications
export async function cleanupExpiredNotifications(): Promise<void> {
  const supabase = createSupabaseServerClient()
  
  try {
    await supabase
      .from('notifications')
      .delete()
      .lt('expires_at', new Date().toISOString())
  } catch (error) {
    console.error('Error cleaning up expired notifications:', error)
  }
}

// Helper functions for creating specific notification types
export const NotificationHelpers = {
  approvalRequest: (userId: string, agentName: string, actionDescription: string, approvalId: string) =>
    createNotification(userId, 'approval_request', 'Approval Required', 
      `${agentName} is requesting approval for: ${actionDescription}`, {
        priority: 'high',
        category: 'approval',
        actionRequired: true,
        approvalId,
        actionUrl: `/dashboard/shopify/approvals/${approvalId}`
      }),

  actionCompleted: (userId: string, agentName: string, actionDescription: string, agentId: string) =>
    createNotification(userId, 'action_completed', 'Action Completed', 
      `${agentName} successfully completed: ${actionDescription}`, {
        priority: 'low',
        category: 'agent_action',
        agentId
      }),

  actionFailed: (userId: string, agentName: string, actionDescription: string, error: string, agentId: string) =>
    createNotification(userId, 'action_failed', 'Action Failed', 
      `${agentName} failed to complete: ${actionDescription}. Error: ${error}`, {
        priority: 'high',
        category: 'agent_action',
        agentId,
        actionRequired: true
      }),

  emergencyAlert: (userId: string, reason: string, scope: string) =>
    createNotification(userId, 'emergency_alert', 'Emergency Stop Activated', 
      `Emergency stop has been activated: ${reason}. Scope: ${scope}`, {
        priority: 'critical',
        category: 'security',
        actionRequired: true
      })
}
