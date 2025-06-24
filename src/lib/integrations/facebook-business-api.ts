// Facebook Business API Integration Layer
// Enables AI agents to autonomously manage Facebook pages, posts, ads, and insights

import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface FacebookPage {
  id: string
  name: string
  category: string
  access_token: string
  permissions: string[]
  tasks: string[]
}

export interface FacebookPost {
  id?: string
  message: string
  link?: string
  picture?: string
  scheduled_publish_time?: number
  published?: boolean
}

export interface FacebookComment {
  id: string
  message: string
  from: {
    id: string
    name: string
  }
  created_time: string
  parent?: {
    id: string
  }
}

export interface FacebookInsights {
  page_impressions: number
  page_reach: number
  page_engaged_users: number
  page_post_engagements: number
  page_fans: number
  page_fan_adds: number
}

export class FacebookBusinessAPI {
  private baseUrl = 'https://graph.facebook.com/v19.0'
  private userId: string
  private accessToken: string | null = null

  constructor(userId: string) {
    this.userId = userId
  }

  // Initialize API with user's OAuth token
  async initialize(): Promise<boolean> {
    try {
      const supabase = createSupabaseServerClient()
      
      const { data: tokenData } = await supabase.rpc('get_oauth_tokens', {
        p_user_id: this.userId,
        p_integration_id: 'facebook-business'
      })

      if (!tokenData || tokenData.length === 0 || !tokenData[0].access_token) {
        console.warn('No Facebook Business OAuth token found for user:', this.userId)
        return false
      }

      this.accessToken = tokenData[0].access_token
      return true
    } catch (error) {
      console.error('Failed to initialize Facebook Business API:', error)
      return false
    }
  }

  // Get all pages the user manages
  async getPages(): Promise<FacebookPage[]> {
    if (!this.accessToken) {
      throw new Error('Facebook API not initialized. Call initialize() first.')
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/me/accounts?fields=id,name,category,access_token,tasks,perms&access_token=${this.accessToken}`
      )

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      return data.data.map((page: any) => ({
        id: page.id,
        name: page.name,
        category: page.category,
        access_token: page.access_token,
        permissions: page.perms || [],
        tasks: page.tasks || []
      }))
    } catch (error) {
      console.error('Failed to get Facebook pages:', error)
      throw error
    }
  }

  // Create a post on a specific page (AI agent autonomous action)
  async createPost(pageId: string, post: FacebookPost): Promise<{ id: string; success: boolean }> {
    if (!this.accessToken) {
      throw new Error('Facebook API not initialized. Call initialize() first.')
    }

    try {
      // Get page access token
      const pages = await this.getPages()
      const page = pages.find(p => p.id === pageId)
      
      if (!page) {
        throw new Error(`Page ${pageId} not found or not accessible`)
      }

      const postData: any = {
        message: post.message,
        access_token: page.access_token
      }

      if (post.link) postData.link = post.link
      if (post.picture) postData.picture = post.picture
      if (post.scheduled_publish_time) {
        postData.scheduled_publish_time = post.scheduled_publish_time
        postData.published = false
      }

      const response = await fetch(`${this.baseUrl}/${pageId}/feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`)
      }

      const result = await response.json()
      
      // Log the autonomous action
      await this.logAutonomousAction('create_post', {
        pageId,
        postId: result.id,
        message: post.message,
        scheduled: !!post.scheduled_publish_time
      })

      return {
        id: result.id,
        success: true
      }
    } catch (error) {
      console.error('Failed to create Facebook post:', error)
      throw error
    }
  }

  // Reply to a comment (AI agent autonomous action)
  async replyToComment(commentId: string, message: string): Promise<{ id: string; success: boolean }> {
    if (!this.accessToken) {
      throw new Error('Facebook API not initialized. Call initialize() first.')
    }

    try {
      const response = await fetch(`${this.baseUrl}/${commentId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          access_token: this.accessToken
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`)
      }

      const result = await response.json()
      
      // Log the autonomous action
      await this.logAutonomousAction('reply_comment', {
        commentId,
        replyId: result.id,
        message
      })

      return {
        id: result.id,
        success: true
      }
    } catch (error) {
      console.error('Failed to reply to Facebook comment:', error)
      throw error
    }
  }

  // Get page insights (for AI agent analysis)
  async getPageInsights(pageId: string, period: 'day' | 'week' | 'days_28' = 'day'): Promise<FacebookInsights> {
    if (!this.accessToken) {
      throw new Error('Facebook API not initialized. Call initialize() first.')
    }

    try {
      const pages = await this.getPages()
      const page = pages.find(p => p.id === pageId)
      
      if (!page) {
        throw new Error(`Page ${pageId} not found or not accessible`)
      }

      const metrics = [
        'page_impressions',
        'page_reach', 
        'page_engaged_users',
        'page_post_engagements',
        'page_fans',
        'page_fan_adds'
      ]

      const response = await fetch(
        `${this.baseUrl}/${pageId}/insights?metric=${metrics.join(',')}&period=${period}&access_token=${page.access_token}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      
      // Parse insights data
      const insights: any = {}
      data.data.forEach((metric: any) => {
        const value = metric.values[0]?.value || 0
        insights[metric.name] = value
      })

      return insights as FacebookInsights
    } catch (error) {
      console.error('Failed to get Facebook insights:', error)
      throw error
    }
  }

  // Get comments on page posts (for AI agent monitoring)
  async getPageComments(pageId: string, limit: number = 50): Promise<FacebookComment[]> {
    if (!this.accessToken) {
      throw new Error('Facebook API not initialized. Call initialize() first.')
    }

    try {
      const pages = await this.getPages()
      const page = pages.find(p => p.id === pageId)
      
      if (!page) {
        throw new Error(`Page ${pageId} not found or not accessible`)
      }

      const response = await fetch(
        `${this.baseUrl}/${pageId}/feed?fields=comments{id,message,from,created_time,parent}&limit=${limit}&access_token=${page.access_token}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      
      // Flatten comments from all posts
      const allComments: FacebookComment[] = []
      data.data.forEach((post: any) => {
        if (post.comments?.data) {
          allComments.push(...post.comments.data)
        }
      })

      return allComments
    } catch (error) {
      console.error('Failed to get Facebook comments:', error)
      throw error
    }
  }

  // Log autonomous actions for audit trail
  private async logAutonomousAction(action: string, metadata: any): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      
      await supabase.from('agent_actions').insert({
        user_id: this.userId,
        integration_id: 'facebook-business',
        action_type: action,
        action_description: `AI agent performed ${action} on Facebook`,
        metadata: {
          timestamp: new Date().toISOString(),
          autonomous: true,
          ...metadata
        }
      })
    } catch (error) {
      console.error('Failed to log autonomous action:', error)
    }
  }

  // Check if token is still valid
  async validateToken(): Promise<boolean> {
    if (!this.accessToken) return false

    try {
      const response = await fetch(`${this.baseUrl}/me?access_token=${this.accessToken}`)
      return response.ok
    } catch {
      return false
    }
  }
}

// Helper function to create Facebook API instance for a user
export async function createFacebookAPI(userId: string): Promise<FacebookBusinessAPI | null> {
  const api = new FacebookBusinessAPI(userId)
  const initialized = await api.initialize()
  
  if (!initialized) {
    return null
  }
  
  return api
}
