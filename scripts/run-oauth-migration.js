#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runOAuthMigration() {
  console.log('🔄 Running OAuth migration to add missing columns...')
  
  try {
    // Add missing columns to api_connections table
    const alterStatements = [
      "ALTER TABLE public.api_connections ADD COLUMN IF NOT EXISTS access_token TEXT;",
      "ALTER TABLE public.api_connections ADD COLUMN IF NOT EXISTS refresh_token TEXT;",
      "ALTER TABLE public.api_connections ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;",
      "ALTER TABLE public.api_connections ADD COLUMN IF NOT EXISTS token_type TEXT DEFAULT 'Bearer';",
      "ALTER TABLE public.api_connections ADD COLUMN IF NOT EXISTS scope TEXT;",
      "ALTER TABLE public.api_connections ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disconnected';",
      "ALTER TABLE public.api_connections ADD COLUMN IF NOT EXISTS connected_at TIMESTAMP WITH TIME ZONE;",
      "ALTER TABLE public.api_connections ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP WITH TIME ZONE;",
      "ALTER TABLE public.api_connections ADD COLUMN IF NOT EXISTS error TEXT;",
      "ALTER TABLE public.api_connections ADD COLUMN IF NOT EXISTS shop_domain TEXT;"
    ]
    
    for (let i = 0; i < alterStatements.length; i++) {
      const statement = alterStatements[i]
      console.log(`Executing statement ${i + 1}/${alterStatements.length}...`)
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          console.warn(`⚠️ Statement ${i + 1} warning: ${error.message}`)
        } else {
          console.log(`✅ Statement ${i + 1} completed`)
        }
      } catch (err) {
        console.warn(`⚠️ Statement ${i + 1} failed: ${err.message}`)
      }
    }
    
    console.log('✅ OAuth migration completed')
    
    // Test the columns exist now
    console.log('\n🧪 Testing column access...')
    const { data, error } = await supabase
      .from('api_connections')
      .select('id, access_token, shop_domain')
      .limit(1)
    
    if (error) {
      console.log(`❌ Column test failed: ${error.message}`)
    } else {
      console.log('✅ Columns accessible')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
  }
}

runOAuthMigration()
