import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Debug: Log environment variables (remove in production)
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Anon Key:', supabaseAnonKey ? `Present (${supabaseAnonKey.substring(0, 20)}...)` : 'Missing')

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}
if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Client-side Supabase client (direct instance)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client factory (for use in API routes and server components)
export function createSupabaseServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  })
}

// Admin client for server-side operations (if needed)
export function createSupabaseAdminClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'user' | 'admin'
          subscription_tier: 'starter' | 'professional' | 'enterprise' | null
          subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due' | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role?: 'user' | 'admin'
          subscription_tier?: 'starter' | 'professional' | 'enterprise' | null
          subscription_status?: 'active' | 'inactive' | 'cancelled' | 'past_due' | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          subscription_tier?: 'starter' | 'professional' | 'enterprise' | null
          subscription_status?: 'active' | 'inactive' | 'cancelled' | 'past_due' | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agent_usage: {
        Row: {
          id: string
          user_id: string
          agent_name: string
          requests_used: number
          month_year: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agent_name: string
          requests_used?: number
          month_year: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agent_name?: string
          requests_used?: number
          month_year?: string
          created_at?: string
          updated_at?: string
        }
      }
      chat_history: {
        Row: {
          id: string
          user_id: string
          agent_name: string
          message_type: 'user' | 'agent'
          content: string
          timestamp: string
          archived: boolean
        }
        Insert: {
          id?: string
          user_id: string
          agent_name: string
          message_type: 'user' | 'agent'
          content: string
          timestamp?: string
          archived?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          agent_name?: string
          message_type?: 'user' | 'agent'
          content?: string
          timestamp?: string
          archived?: boolean
        }
      }
      api_connections: {
        Row: {
          id: string
          user_id: string
          integration_id: string
          service_name: string
          access_token?: string
          refresh_token?: string
          expires_at?: string
          token_type?: string
          scope?: string
          api_key_encrypted?: string
          status: 'connected' | 'disconnected' | 'error' | 'expired'
          connected_at?: string
          last_sync?: string
          error?: string
          facebook_user_id?: string
          facebook_pages?: any[] // JSONB array
          facebook_business_id?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          integration_id: string
          service_name: string
          access_token?: string
          refresh_token?: string
          expires_at?: string
          token_type?: string
          scope?: string
          api_key_encrypted?: string
          status?: 'connected' | 'disconnected' | 'error' | 'expired'
          connected_at?: string
          last_sync?: string
          error?: string
          facebook_user_id?: string
          facebook_pages?: any[]
          facebook_business_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          integration_id?: string
          service_name?: string
          access_token?: string
          refresh_token?: string
          expires_at?: string
          token_type?: string
          scope?: string
          api_key_encrypted?: string
          status?: 'connected' | 'disconnected' | 'error' | 'expired'
          connected_at?: string
          last_sync?: string
          error?: string
          facebook_user_id?: string
          facebook_pages?: any[]
          facebook_business_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      subscription_history: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string
          tier: 'starter' | 'professional' | 'enterprise'
          status: string
          period_start: string
          period_end: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id: string
          tier: 'starter' | 'professional' | 'enterprise'
          status: string
          period_start: string
          period_end: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string
          tier?: 'starter' | 'professional' | 'enterprise'
          status?: string
          period_start?: string
          period_end?: string
          created_at?: string
        }
      }
    }
    Functions: {
      increment_agent_usage: {
        Args: {
          p_user_id: string
          p_agent_name: string
        }
        Returns: number
      }
      get_or_create_agent_usage: {
        Args: {
          p_user_id: string
          p_agent_name: string
          p_month_year: string
        }
        Returns: Database['public']['Tables']['agent_usage']['Row']
      }
    }
  }
}
