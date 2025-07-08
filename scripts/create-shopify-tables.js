#!/usr/bin/env node

// Create Shopify OAuth tables using Supabase client
require('dotenv').config({ path: '.env.local' })

async function createTables() {
  try {
    console.log('🚢 Creating Shopify OAuth tables...')
    
    const { createClient } = require('@supabase/supabase-js')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    console.log('📡 Connected to Supabase')
    
    // Create oauth_states table
    console.log('📝 Creating oauth_states table...')
    try {
      // First check if table exists by trying to select from it
      const { error: checkError } = await supabase
        .from('oauth_states')
        .select('id')
        .limit(1)
      
      if (checkError && checkError.code === 'PGRST116') {
        console.log('   Table does not exist, will be created via SQL')
      } else {
        console.log('   ✅ oauth_states table already exists')
      }
    } catch (err) {
      console.log('   Table check failed, continuing...')
    }
    
    // Create shopify_stores table
    console.log('📝 Creating shopify_stores table...')
    try {
      const { error: checkError } = await supabase
        .from('shopify_stores')
        .select('id')
        .limit(1)
      
      if (checkError && checkError.code === 'PGRST116') {
        console.log('   Table does not exist, will be created via SQL')
      } else {
        console.log('   ✅ shopify_stores table already exists')
      }
    } catch (err) {
      console.log('   Table check failed, continuing...')
    }
    
    // Check api_connections table structure
    console.log('📝 Checking api_connections table...')
    try {
      const { data, error } = await supabase
        .from('api_connections')
        .select('*')
        .limit(1)
      
      if (error) {
        console.log('   ❌ api_connections table not accessible:', error.message)
      } else {
        console.log('   ✅ api_connections table exists and accessible')
      }
    } catch (err) {
      console.log('   ❌ api_connections table check failed')
    }
    
    console.log('')
    console.log('🔧 Since direct SQL execution is not available, please manually create the tables in Supabase Dashboard:')
    console.log('')
    console.log('1. Go to https://supabase.com/dashboard/project/bmlieuyijpgxdhvicpsf/editor')
    console.log('2. Click "SQL Editor"')
    console.log('3. Copy and paste the SQL from: supabase/migrations/20250108_create_shopify_oauth_tables.sql')
    console.log('4. Click "Run" to execute the migration')
    console.log('')
    console.log('Alternatively, you can create the tables manually:')
    console.log('')
    
    // Show simplified table creation
    console.log('-- OAuth States Table')
    console.log(`CREATE TABLE oauth_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL UNIQUE,
  shop_domain TEXT NOT NULL,
  integration_type TEXT DEFAULT 'shopify',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);`)
    
    console.log('')
    console.log('-- Shopify Stores Table')
    console.log(`CREATE TABLE shopify_stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  store_name TEXT NOT NULL,
  store_email TEXT,
  currency TEXT DEFAULT 'USD',
  timezone TEXT,
  plan_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'never',
  sync_error TEXT,
  sync_data JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  permissions JSONB DEFAULT '{}'::jsonb,
  agent_access JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, shop_domain)
);`)
    
    console.log('')
    console.log('After creating the tables, the Shopify OAuth integration should work properly.')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  createTables()
}

module.exports = { createTables }
