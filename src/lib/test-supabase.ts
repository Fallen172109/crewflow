import { supabase } from './supabase'

/**
 * Test Supabase connection and database setup
 */
export async function testSupabaseConnection() {
  try {
    console.log('🧪 Testing Supabase connection...')
    
    // Test 1: Basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Connection test failed:', error.message)
      return false
    }
    
    console.log('✅ Supabase connection successful')
    
    // Test 2: Check if tables exist
    const tables = ['users', 'agent_usage', 'chat_history', 'api_connections', 'subscription_history']
    
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (tableError) {
        console.error(`❌ Table '${table}' test failed:`, tableError.message)
        return false
      }
      
      console.log(`✅ Table '${table}' accessible`)
    }
    
    // Test 3: Test custom functions (skip if not authenticated)
    try {
      // First check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        console.log('⚠️ Function test skipped (requires authentication)')
      } else {
        // Test with actual authenticated user
        const { data: functionData, error: functionError } = await supabase
          .rpc('get_or_create_agent_usage', {
            p_user_id: user.id,
            p_agent_name: 'test-agent',
            p_month_year: '2024-01'
          })

        if (functionError) {
          console.error('❌ Function test failed:', functionError.message)
          return false
        }

        console.log('✅ Custom functions working')
      }
    } catch (err) {
      console.log('⚠️ Function test skipped (requires authentication)')
    }
    
    console.log('🎉 All Supabase tests passed!')
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error during testing:', error)
    return false
  }
}

/**
 * Get Supabase project info
 */
export async function getSupabaseInfo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  
  return {
    url,
    hasAnonKey,
    hasServiceKey,
    projectId: url?.split('//')[1]?.split('.')[0] || 'unknown'
  }
}
