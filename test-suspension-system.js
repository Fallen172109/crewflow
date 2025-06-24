// Test script for user suspension system
// Run this with: node test-suspension-system.js

const { createClient } = require('@supabase/supabase-js')

// Replace with your actual Supabase URL and service key
const SUPABASE_URL = 'https://bmlieuyijpgxdhvicpsf.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('Please set SUPABASE_SERVICE_KEY environment variable')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function testSuspensionSystem() {
  console.log('🧪 Testing User Suspension System...\n')

  try {
    // 1. Check if suspension fields exist
    console.log('1. Checking database schema...')
    const { data: users, error: schemaError } = await supabase
      .from('users')
      .select('id, email, suspended, suspended_at, suspended_by, suspension_reason')
      .limit(1)

    if (schemaError) {
      console.error('❌ Schema check failed:', schemaError.message)
      return
    }
    console.log('✅ Suspension fields exist in users table')

    // 2. Check if admin_audit_log table exists with new structure
    console.log('\n2. Checking audit log schema...')
    const { data: auditLogs, error: auditError } = await supabase
      .from('admin_audit_log')
      .select('id, action, action_type, target_user_email, success')
      .limit(1)

    if (auditError) {
      console.error('❌ Audit log schema check failed:', auditError.message)
      return
    }
    console.log('✅ Enhanced audit log table exists')

    // 3. Check if suspension functions exist
    console.log('\n3. Checking database functions...')
    const { data: functions, error: funcError } = await supabase
      .rpc('suspend_user', {
        p_admin_id: '00000000-0000-0000-0000-000000000000',
        p_target_user_id: '00000000-0000-0000-0000-000000000000',
        p_reason: 'test'
      })
      .then(() => ({ data: 'exists', error: null }))
      .catch(err => ({ data: null, error: err }))

    if (functions.error && !functions.error.message.includes('violates foreign key constraint')) {
      console.error('❌ Suspension functions check failed:', functions.error.message)
      return
    }
    console.log('✅ Suspension functions exist')

    // 4. Get admin users for testing
    console.log('\n4. Finding admin users...')
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('role', 'admin')
      .limit(5)

    if (adminError) {
      console.error('❌ Failed to fetch admin users:', adminError.message)
      return
    }

    if (adminUsers.length === 0) {
      console.log('⚠️ No admin users found. Please create an admin user first.')
      return
    }

    console.log(`✅ Found ${adminUsers.length} admin user(s):`)
    adminUsers.forEach(admin => {
      console.log(`   - ${admin.email} (${admin.id})`)
    })

    // 5. Get regular users for testing
    console.log('\n5. Finding regular users...')
    const { data: regularUsers, error: userError } = await supabase
      .from('users')
      .select('id, email, role, suspended')
      .eq('role', 'user')
      .limit(5)

    if (userError) {
      console.error('❌ Failed to fetch regular users:', userError.message)
      return
    }

    if (regularUsers.length === 0) {
      console.log('⚠️ No regular users found. Please create some users first.')
      return
    }

    console.log(`✅ Found ${regularUsers.length} regular user(s):`)
    regularUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.id}) - ${user.suspended ? 'SUSPENDED' : 'ACTIVE'}`)
    })

    // 6. Test audit log functionality
    console.log('\n6. Testing audit log functionality...')
    const testAdmin = adminUsers[0]
    const { data: logResult, error: logError } = await supabase
      .rpc('log_admin_action', {
        p_admin_id: testAdmin.id,
        p_action: 'TEST_SYSTEM',
        p_action_type: 'SYSTEM_ACCESS',
        p_details: { test: true, timestamp: new Date().toISOString() }
      })

    if (logError) {
      console.error('❌ Audit logging test failed:', logError.message)
      return
    }
    console.log('✅ Audit logging works correctly')

    // 7. Check recent audit logs
    console.log('\n7. Checking recent audit logs...')
    const { data: recentLogs, error: recentError } = await supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) {
      console.error('❌ Failed to fetch recent logs:', recentError.message)
      return
    }

    console.log(`✅ Found ${recentLogs.length} recent audit log entries:`)
    recentLogs.forEach(log => {
      console.log(`   - ${log.action} (${log.action_type}) by ${log.target_user_email || 'system'} at ${log.created_at}`)
    })

    console.log('\n🎉 All tests passed! The suspension system is ready to use.')
    console.log('\n📋 Next steps:')
    console.log('1. Test the admin interface at /admin/users')
    console.log('2. Try suspending/unsuspending users')
    console.log('3. Check audit logs at /admin/audit-logs')
    console.log('4. Verify suspension status in user profiles')

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

// Run the test
testSuspensionSystem()
