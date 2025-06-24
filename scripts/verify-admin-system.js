#!/usr/bin/env node

/**
 * CrewFlow Admin System Verification Script
 * 
 * This script verifies that all admin system components are properly installed
 * and configured. Run this after setting up the admin system.
 */

const fs = require('fs');
const path = require('path');

console.log('🚢 CrewFlow Admin System Verification\n');

const checks = [];

// File existence checks
const requiredFiles = [
  // Database files
  'database/migrations/add_admin_system.sql',
  
  // Admin authentication
  'src/lib/admin-auth.ts',
  
  // Admin pages
  'src/app/admin/layout.tsx',
  'src/app/admin/page.tsx',
  'src/app/admin/users/page.tsx',
  'src/app/admin/users/[userId]/page.tsx',
  'src/app/admin/analytics/page.tsx',
  'src/app/admin-setup/page.tsx',
  
  // Admin components
  'src/components/admin/AdminSidebar.tsx',
  'src/components/admin/AdminHeader.tsx',
  'src/components/admin/AdminOverviewCards.tsx',
  'src/components/admin/AdminRecentActivity.tsx',
  'src/components/admin/AdminSystemHealth.tsx',
  'src/components/admin/AdminUsersTable.tsx',
  'src/components/admin/AdminUsersFilters.tsx',
  'src/components/admin/AdminUserProfile.tsx',
  'src/components/admin/AdminUserSubscription.tsx',
  'src/components/admin/AdminUserActivity.tsx',
  'src/components/admin/AdminAnalyticsMetrics.tsx',
  'src/components/admin/AdminAnalyticsCharts.tsx',
  'src/components/admin/AdminAnalyticsAgents.tsx',
  
  // API routes
  'src/app/api/admin/promote/route.ts',
  
  // Documentation
  'ADMIN_SETUP_GUIDE.md',
  'ADMIN_SECURITY_TEST_PLAN.md'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${file}`);
  checks.push({ type: 'file', name: file, passed: exists });
});

// Check for updated schema files
console.log('\n🗄️  Checking database schema updates...');
const schemaFile = 'database/schema.sql';
if (fs.existsSync(schemaFile)) {
  const schemaContent = fs.readFileSync(schemaFile, 'utf8');
  
  const schemaChecks = [
    { name: 'user_role enum type', pattern: /CREATE TYPE user_role AS ENUM/ },
    { name: 'role column in users table', pattern: /role user_role DEFAULT 'user'/ },
    { name: 'is_admin function', pattern: /CREATE OR REPLACE FUNCTION public\.is_admin/ },
    { name: 'admin_audit_log table', pattern: /CREATE TABLE public\.admin_audit_log/ },
    { name: 'admin RLS policies', pattern: /CREATE POLICY "Admins can view all users"/ }
  ];
  
  schemaChecks.forEach(check => {
    const found = check.pattern.test(schemaContent);
    const status = found ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    checks.push({ type: 'schema', name: check.name, passed: found });
  });
} else {
  console.log('❌ database/schema.sql not found');
  checks.push({ type: 'schema', name: 'schema.sql', passed: false });
}

// Check TypeScript types
console.log('\n🔧 Checking TypeScript type updates...');
const supabaseTypesFile = 'src/lib/supabase.ts';
if (fs.existsSync(supabaseTypesFile)) {
  const typesContent = fs.readFileSync(supabaseTypesFile, 'utf8');
  
  const typeChecks = [
    { name: 'role field in user types', pattern: /role: 'user' \| 'admin'/ },
    { name: 'admin client function', pattern: /createSupabaseAdminClient/ }
  ];
  
  typeChecks.forEach(check => {
    const found = check.pattern.test(typesContent);
    const status = found ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    checks.push({ type: 'types', name: check.name, passed: found });
  });
} else {
  console.log('❌ src/lib/supabase.ts not found');
  checks.push({ type: 'types', name: 'supabase.ts', passed: false });
}

// Check auth updates
console.log('\n🔐 Checking authentication updates...');
const authFile = 'src/lib/auth.ts';
if (fs.existsSync(authFile)) {
  const authContent = fs.readFileSync(authFile, 'utf8');
  
  const authChecks = [
    { name: 'role field in UserProfile', pattern: /role: 'user' \| 'admin'/ },
    { name: 'requireAdmin function', pattern: /export async function requireAdmin/ },
    { name: 'isAdmin function', pattern: /export async function isAdmin/ },
    { name: 'hasAdminAccess function', pattern: /export function hasAdminAccess/ }
  ];
  
  authChecks.forEach(check => {
    const found = check.pattern.test(authContent);
    const status = found ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    checks.push({ type: 'auth', name: check.name, passed: found });
  });
} else {
  console.log('❌ src/lib/auth.ts not found');
  checks.push({ type: 'auth', name: 'auth.ts', passed: false });
}

// Check middleware updates
console.log('\n🛡️  Checking middleware protection...');
const middlewareFile = 'middleware.ts';
if (fs.existsSync(middlewareFile)) {
  const middlewareContent = fs.readFileSync(middlewareFile, 'utf8');
  
  const middlewareChecks = [
    { name: 'admin route protection', pattern: /pathname\.startsWith\('\/admin'\)/ }
  ];
  
  middlewareChecks.forEach(check => {
    const found = check.pattern.test(middlewareContent);
    const status = found ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    checks.push({ type: 'middleware', name: check.name, passed: found });
  });
} else {
  console.log('❌ middleware.ts not found');
  checks.push({ type: 'middleware', name: 'middleware.ts', passed: false });
}

// Environment variables check
console.log('\n🌍 Checking environment configuration...');
const envExample = '.env.example';
const envLocal = '.env.local';

if (fs.existsSync(envLocal)) {
  const envContent = fs.readFileSync(envLocal, 'utf8');
  const hasAdminKey = /ADMIN_PROMOTION_KEY/.test(envContent);
  const status = hasAdminKey ? '✅' : '⚠️';
  console.log(`${status} ADMIN_PROMOTION_KEY in .env.local ${hasAdminKey ? '' : '(not found - you need to add this)'}`);
  checks.push({ type: 'env', name: 'ADMIN_PROMOTION_KEY', passed: hasAdminKey });
} else {
  console.log('⚠️  .env.local not found - create it with ADMIN_PROMOTION_KEY');
  checks.push({ type: 'env', name: '.env.local', passed: false });
}

// Summary
console.log('\n📊 Verification Summary');
console.log('========================');

const totalChecks = checks.length;
const passedChecks = checks.filter(c => c.passed).length;
const failedChecks = totalChecks - passedChecks;

console.log(`Total checks: ${totalChecks}`);
console.log(`✅ Passed: ${passedChecks}`);
console.log(`❌ Failed: ${failedChecks}`);

if (failedChecks > 0) {
  console.log('\n❌ Failed Checks:');
  checks.filter(c => !c.passed).forEach(check => {
    console.log(`   - ${check.type}: ${check.name}`);
  });
}

console.log('\n🚀 Next Steps:');
if (failedChecks === 0) {
  console.log('✅ All checks passed! Your admin system is ready.');
  console.log('📋 Follow the ADMIN_SETUP_GUIDE.md to:');
  console.log('   1. Run database migrations');
  console.log('   2. Set environment variables');
  console.log('   3. Promote your account to admin');
  console.log('   4. Access the admin dashboard at /admin');
} else {
  console.log('❌ Some checks failed. Please:');
  console.log('   1. Review the failed checks above');
  console.log('   2. Ensure all files are created correctly');
  console.log('   3. Run this script again to verify fixes');
}

console.log('\n📚 Documentation:');
console.log('   - Setup Guide: ADMIN_SETUP_GUIDE.md');
console.log('   - Security Testing: ADMIN_SECURITY_TEST_PLAN.md');
console.log('   - Admin Dashboard: /admin (after setup)');

process.exit(failedChecks > 0 ? 1 : 0);
