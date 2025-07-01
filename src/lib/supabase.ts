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
          task_type: string
          thread_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          agent_name: string
          message_type: 'user' | 'agent'
          content: string
          timestamp?: string
          archived?: boolean
          task_type?: string
          thread_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          agent_name?: string
          message_type?: 'user' | 'agent'
          content?: string
          timestamp?: string
          archived?: boolean
          task_type?: string
          thread_id?: string | null
        }
      }
      chat_threads: {
        Row: {
          id: string
          user_id: string
          agent_name: string
          task_type: string
          title: string
          context: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agent_name: string
          task_type?: string
          title: string
          context?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agent_name?: string
          task_type?: string
          title?: string
          context?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      chat_attachments: {
        Row: {
          id: string
          user_id: string
          thread_id: string | null
          message_id: string | null
          file_name: string
          file_type: string
          file_size: number
          storage_path: string
          public_url: string | null
          upload_status: 'uploading' | 'completed' | 'failed'
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          thread_id?: string | null
          message_id?: string | null
          file_name: string
          file_type: string
          file_size: number
          storage_path: string
          public_url?: string | null
          upload_status?: 'uploading' | 'completed' | 'failed'
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          thread_id?: string | null
          message_id?: string | null
          file_name?: string
          file_type?: string
          file_size?: number
          storage_path?: string
          public_url?: string | null
          upload_status?: 'uploading' | 'completed' | 'failed'
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
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
      user_meal_profiles: {
        Row: {
          id: string
          user_id: string
          height_value: number | null
          height_unit: 'cm' | 'ft_in' | 'inches' | 'm'
          weight_value: number | null
          weight_unit: 'kg' | 'lbs' | 'g' | 'oz' | 'stone'
          primary_goal: 'weight_loss' | 'weight_gain' | 'muscle_building' | 'maintenance' | 'athletic_performance' | 'health_improvement'
          target_date: string | null
          target_weight: number | null
          timeline_duration_days: number | null
          activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
          household_size: number
          preferred_meal_count: number
          max_cooking_time_minutes: number
          budget_range: 'budget' | 'moderate' | 'premium' | 'no_limit'
          food_likes: string | null
          food_dislikes: string | null
          preferred_diet_type: string | null
          age: number | null
          gender: 'male' | 'female' | 'other' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          height_value?: number | null
          height_unit?: 'cm' | 'ft_in' | 'inches' | 'm'
          weight_value?: number | null
          weight_unit?: 'kg' | 'lbs' | 'g' | 'oz' | 'stone'
          primary_goal: 'weight_loss' | 'weight_gain' | 'muscle_building' | 'maintenance' | 'athletic_performance' | 'health_improvement'
          target_date?: string | null
          target_weight?: number | null
          timeline_duration_days?: number | null
          activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
          household_size?: number
          preferred_meal_count?: number
          max_cooking_time_minutes?: number
          budget_range?: 'budget' | 'moderate' | 'premium' | 'no_limit'
          food_likes?: string | null
          food_dislikes?: string | null
          preferred_diet_type?: string | null
          age?: number | null
          gender?: 'male' | 'female' | 'other' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          height_value?: number | null
          height_unit?: 'cm' | 'ft_in' | 'inches' | 'm'
          weight_value?: number | null
          weight_unit?: 'kg' | 'lbs' | 'g' | 'oz' | 'stone'
          primary_goal?: 'weight_loss' | 'weight_gain' | 'muscle_building' | 'maintenance' | 'athletic_performance' | 'health_improvement'
          target_date?: string | null
          target_weight?: number | null
          timeline_duration_days?: number | null
          activity_level?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
          household_size?: number
          preferred_meal_count?: number
          max_cooking_time_minutes?: number
          budget_range?: 'budget' | 'moderate' | 'premium' | 'no_limit'
          food_likes?: string | null
          food_dislikes?: string | null
          preferred_diet_type?: string | null
          age?: number | null
          gender?: 'male' | 'female' | 'other' | null
          created_at?: string
          updated_at?: string
        }
      }
      user_dietary_restrictions: {
        Row: {
          id: string
          user_id: string
          restriction_type: 'allergy' | 'dietary_preference' | 'medical_restriction' | 'religious_restriction'
          restriction_value: string
          severity: 'mild' | 'moderate' | 'severe' | 'absolute'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          restriction_type: 'allergy' | 'dietary_preference' | 'medical_restriction' | 'religious_restriction'
          restriction_value: string
          severity?: 'mild' | 'moderate' | 'severe' | 'absolute'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          restriction_type?: 'allergy' | 'dietary_preference' | 'medical_restriction' | 'religious_restriction'
          restriction_value?: string
          severity?: 'mild' | 'moderate' | 'severe' | 'absolute'
          notes?: string | null
          created_at?: string
        }
      }
      user_pantry_items: {
        Row: {
          id: string
          user_id: string
          ingredient_name: string
          quantity: number | null
          unit: string | null
          category: 'protein' | 'vegetables' | 'fruits' | 'grains' | 'dairy' | 'pantry_staples' | 'spices' | 'condiments' | 'frozen' | 'canned'
          expiration_date: string | null
          purchase_date: string | null
          status: 'available' | 'running_low' | 'expired' | 'used_up'
          include_in_meal_plans: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ingredient_name: string
          quantity?: number | null
          unit?: string | null
          category: 'protein' | 'vegetables' | 'fruits' | 'grains' | 'dairy' | 'pantry_staples' | 'spices' | 'condiments' | 'frozen' | 'canned'
          expiration_date?: string | null
          purchase_date?: string | null
          status?: 'available' | 'running_low' | 'expired' | 'used_up'
          include_in_meal_plans?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ingredient_name?: string
          quantity?: number | null
          unit?: string | null
          category?: 'protein' | 'vegetables' | 'fruits' | 'grains' | 'dairy' | 'pantry_staples' | 'spices' | 'condiments' | 'frozen' | 'canned'
          expiration_date?: string | null
          purchase_date?: string | null
          status?: 'available' | 'running_low' | 'expired' | 'used_up'
          include_in_meal_plans?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      user_meal_plans: {
        Row: {
          id: string
          user_id: string
          plan_name: string | null
          plan_duration_days: number
          generated_for_date: string | null
          plan_data: any // JSONB
          preferences_snapshot: any // JSONB
          is_active: boolean
          completion_status: 'active' | 'completed' | 'abandoned' | 'modified'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_name?: string | null
          plan_duration_days: number
          generated_for_date?: string | null
          plan_data: any // JSONB
          preferences_snapshot: any // JSONB
          is_active?: boolean
          completion_status?: 'active' | 'completed' | 'abandoned' | 'modified'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_name?: string | null
          plan_duration_days?: number
          generated_for_date?: string | null
          plan_data?: any // JSONB
          preferences_snapshot?: any // JSONB
          is_active?: boolean
          completion_status?: 'active' | 'completed' | 'abandoned' | 'modified'
          created_at?: string
          updated_at?: string
        }
      }
      user_cuisine_preferences: {
        Row: {
          id: string
          user_id: string
          cuisine_type: string
          preference_level: 'love' | 'like' | 'neutral' | 'dislike' | 'avoid'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cuisine_type: string
          preference_level?: 'love' | 'like' | 'neutral' | 'dislike' | 'avoid'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cuisine_type?: string
          preference_level?: 'love' | 'like' | 'neutral' | 'dislike' | 'avoid'
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
