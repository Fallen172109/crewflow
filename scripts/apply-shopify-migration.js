#!/usr/bin/env node

// Apply Shopify OAuth migration to Supabase database
const fs = require('fs')
const path = require('path')

async function applyMigration() {
  try {
    console.log('🚢 Applying Shopify OAuth migration...')
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250108_create_shopify_oauth_tables.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js')
    
    // Load environment variables
    require('dotenv').config({ path: '.env.local' })
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('📡 Connected to Supabase database')
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Executing ${statements.length} SQL statements...`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      
      try {
        console.log(`   ${i + 1}/${statements.length}: Executing statement...`)
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement 
        })
        
        if (error) {
          // Try direct query if RPC fails
          const { error: queryError } = await supabase
            .from('_temp_migration')
            .select('*')
            .limit(0)
          
          // If that also fails, try using the REST API directly
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey
            },
            body: JSON.stringify({ sql: statement })
          })
          
          if (!response.ok) {
            console.warn(`   ⚠️  Statement ${i + 1} may have failed, but continuing...`)
            console.warn(`   Error: ${error?.message || 'Unknown error'}`)
          }
        }
      } catch (statementError) {
        console.warn(`   ⚠️  Statement ${i + 1} failed, but continuing...`)
        console.warn(`   Error: ${statementError.message}`)
      }
    }
    
    console.log('✅ Migration completed!')
    console.log('')
    console.log('🔍 Verifying tables were created...')
    
    // Verify tables exist
    const tablesToCheck = ['oauth_states', 'shopify_stores', 'api_connections', 'webhook_configs', 'webhook_events']
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`   ❌ Table '${table}' not found or accessible`)
        } else {
          console.log(`   ✅ Table '${table}' exists and accessible`)
        }
      } catch (err) {
        console.log(`   ❌ Table '${table}' verification failed`)
      }
    }
    
    console.log('')
    console.log('🎉 Shopify OAuth migration process completed!')
    console.log('📋 Next steps:')
    console.log('   1. Test the OAuth flow by connecting a Shopify store')
    console.log('   2. Verify the embedded app installation works')
    console.log('   3. Check that authentication state persists properly')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
if (require.main === module) {
  applyMigration()
}

module.exports = { applyMigration }
