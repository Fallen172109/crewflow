#!/usr/bin/env node

/**
 * CrewFlow Domain Update Script
 * 
 * This script helps you quickly update your domain configuration
 * after setting up a custom domain in Vercel.
 * 
 * Usage: node scripts/update-domain.js yourdomain.com
 */

const fs = require('fs');
const path = require('path');

function updateDomain(domain) {
  if (!domain) {
    console.error('❌ Please provide a domain name');
    console.log('Usage: node scripts/update-domain.js yourdomain.com');
    process.exit(1);
  }

  console.log(`🚢 Updating CrewFlow configuration for domain: ${domain}`);

  // Update next.config.ts
  updateNextConfig(domain);
  
  // Show manual steps
  showManualSteps(domain);
  
  console.log('✅ Domain configuration updated!');
  console.log('🔄 Don\'t forget to redeploy your application after these changes.');
}

function updateNextConfig(domain) {
  const configPath = path.join(process.cwd(), 'next.config.ts');
  
  try {
    let content = fs.readFileSync(configPath, 'utf8');
    
    // Update allowedOrigins
    content = content.replace(
      /allowedOrigins: \[\s*'localhost:3000',[\s\S]*?\]/,
      `allowedOrigins: [
        'localhost:3000',
        '${domain}',
        'www.${domain}'
      ]`
    );
    
    // Update domains
    content = content.replace(
      /domains: \[\s*'localhost',[\s\S]*?\]/,
      `domains: [
      'localhost',
      '${domain}'
    ]`
    );
    
    fs.writeFileSync(configPath, content);
    console.log('✅ Updated next.config.ts');
  } catch (error) {
    console.error('❌ Error updating next.config.ts:', error.message);
  }
}

function showManualSteps(domain) {
  console.log('\n📋 Manual steps required:');
  console.log('\n1. Update Vercel Environment Variables:');
  console.log(`   NEXTAUTH_URL=https://${domain}`);
  console.log(`   NEXT_PUBLIC_SITE_URL=https://${domain}`);
  
  console.log('\n2. Update Supabase Authentication Settings:');
  console.log(`   Site URL: https://${domain}`);
  console.log(`   Redirect URLs:`);
  console.log(`   - https://${domain}/auth/callback`);
  console.log(`   - https://www.${domain}/auth/callback`);
  
  console.log('\n3. DNS Records to add at your registrar:');
  console.log('   Root domain (A record):');
  console.log('   Type: A, Name: @, Value: 76.76.19.61');
  console.log('\n   WWW subdomain (CNAME record):');
  console.log('   Type: CNAME, Name: www, Value: cname.vercel-dns.com');
  
  console.log('\n4. After DNS propagation, test:');
  console.log(`   - Visit https://${domain}`);
  console.log('   - Test authentication flow');
  console.log('   - Verify all functionality works');
}

// Get domain from command line arguments
const domain = process.argv[2];
updateDomain(domain);
