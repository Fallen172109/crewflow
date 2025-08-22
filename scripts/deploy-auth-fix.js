#!/usr/bin/env node

/**
 * CrewFlow Authentication Fix Deployment Script
 * 
 * This script helps deploy the authentication fixes and verify they work correctly.
 * It handles the deployment process and provides verification steps.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 CrewFlow Authentication Fix Deployment');
console.log('==========================================\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: Please run this script from the project root directory');
  process.exit(1);
}

// Check git status
console.log('📋 Step 1: Checking git status...');
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (gitStatus.trim()) {
    console.log('📝 Found changes to commit:');
    console.log(gitStatus);
  } else {
    console.log('✅ No uncommitted changes found');
  }
} catch (error) {
  console.error('❌ Error checking git status:', error.message);
  process.exit(1);
}

// Commit and push changes
console.log('\n📤 Step 2: Committing and pushing changes...');
try {
  // Add all changes
  execSync('git add .', { stdio: 'inherit' });
  
  // Commit with descriptive message
  const commitMessage = 'fix: resolve authentication session mismatch between client and server\n\n- Remove custom storageKey from client auth config\n- Update environment detection for www domain\n- Add cookie cleanup utility\n- Update API routes to use proper SSR client\n- Enhance middleware logging and auth checks';
  
  execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
  
  // Push to main branch
  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('✅ Changes committed and pushed successfully');
} catch (error) {
  console.log('ℹ️  No changes to commit or push failed');
  console.log('   This is normal if changes were already committed');
}

// Wait for Vercel deployment
console.log('\n⏳ Step 3: Waiting for Vercel deployment...');
console.log('   Please wait 2-3 minutes for Vercel to deploy the changes');
console.log('   You can monitor deployment at: https://vercel.com/dashboard');

// Provide verification steps
console.log('\n🔍 Step 4: Verification Steps');
console.log('=============================');
console.log('After deployment completes, please verify the fix:');
console.log('');
console.log('1. 🧹 Clear cookies (for affected users):');
console.log('   POST https://crewflow.ai/api/auth/cleanup-cookies');
console.log('   Or manually clear browser cookies for *.crewflow.ai');
console.log('');
console.log('2. 🔍 Check debug endpoint:');
console.log('   GET https://crewflow.ai/api/debug/session-cookies');
console.log('   Should show: host="crewflow.ai", isProduction=true');
console.log('');
console.log('3. 🔐 Test authentication flow:');
console.log('   - Visit https://crewflow.ai (should not redirect to www)');
console.log('   - Log in with test account');
console.log('   - Access /dashboard (should work without "Auth session missing!")');
console.log('   - Check that session persists across page reloads');
console.log('');
console.log('4. 📊 Monitor session cookies:');
console.log('   - Should see sb-access-token and sb-refresh-token');
console.log('   - Should NOT see sb-crewflow-auth-token (legacy)');
console.log('   - Server session should match client session');
console.log('');

// Domain configuration check
console.log('🌐 Step 5: Domain Configuration');
console.log('===============================');
console.log('If users are still being redirected to www.crewflow.ai:');
console.log('');
console.log('1. Check Vercel domain settings:');
console.log('   - Go to Project Settings → Domains');
console.log('   - Ensure crewflow.ai is the primary domain');
console.log('   - Remove any apex → www redirects');
console.log('');
console.log('2. Check DNS configuration:');
console.log('   - Verify A/CNAME records point to Vercel');
console.log('   - Ensure no external redirects are configured');
console.log('');
console.log('3. The middleware will handle www → apex redirects');
console.log('');

// Success message
console.log('✅ Deployment script completed!');
console.log('');
console.log('📖 For detailed troubleshooting, see:');
console.log('   docs/auth-fix-guide.md');
console.log('');
console.log('🆘 If issues persist:');
console.log('   1. Check the debug endpoint output');
console.log('   2. Clear all cookies and try fresh login');
console.log('   3. Verify domain is crewflow.ai (not www)');
console.log('   4. Check browser network tab for auth requests');
