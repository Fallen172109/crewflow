import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export function createSupabaseServerClient() {
  // ⚠️ DEPRECATED: Use createSupabaseServerClientWithCookies for proper session handling
  // This client doesn't persist sessions and should only be used for non-auth operations
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  )
}

// Alternative function for when we need cookie-based auth
export async function createSupabaseServerClientWithCookies() {
  try {
    // Dynamically import cookies only when needed to avoid client-side bundling issues
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()

    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Ignore cookie setting errors in API routes
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Ignore cookie removal errors in API routes
            }
          },
        },
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      }
    )
  } catch (error) {
    console.error('Error creating Supabase server client with cookies:', error)
    // Fallback to basic client
    return createSupabaseServerClient()
  }
}

// Service role client for admin operations like storage uploads
export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
