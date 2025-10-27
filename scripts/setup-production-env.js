#!/usr/bin/env node

/**
 * Production Environment Setup Script for CrewFlow
 * Sets up the correct environment variables for Shopify Partner app approval
 */

const requiredEnvVars = {
  // App URLs - Critical for Shopify OAuth
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://your-production-domain.com',
  NEXT_PUBLIC_PRODUCTION_URL: process.env.NEXT_PUBLIC_PRODUCTION_URL || 'https://your-production-domain.com',
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://your-production-domain.com',

  // Maintenance Mode - Disable for Shopify testing
  MAINTENANCE_MODE_OVERRIDE: process.env.MAINTENANCE_MODE_OVERRIDE ?? 'false',
  AUTO_MAINTENANCE_MODE: process.env.AUTO_MAINTENANCE_MODE ?? 'false',
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE ?? 'false',

  // Node Environment
  NODE_ENV: process.env.NODE_ENV || 'production',
}

const shopifyEnvVars = {
  SHOPIFY_CLIENT_ID: process.env.SHOPIFY_CLIENT_ID || 'your_shopify_client_id',
  SHOPIFY_CLIENT_SECRET: process.env.SHOPIFY_CLIENT_SECRET || 'your_shopify_client_secret',
  SHOPIFY_WEBHOOK_SECRET: process.env.SHOPIFY_WEBHOOK_SECRET || 'your_shopify_webhook_secret',
  CREWFLOW_SHOPIFY_CLIENT_ID: process.env.CREWFLOW_SHOPIFY_CLIENT_ID || process.env.SHOPIFY_CLIENT_ID || 'your_shopify_client_id',
  CREWFLOW_SHOPIFY_CLIENT_SECRET: process.env.CREWFLOW_SHOPIFY_CLIENT_SECRET || process.env.SHOPIFY_CLIENT_SECRET || 'your_shopify_client_secret',
}

console.log('🚀 CrewFlow Production Environment Setup')
console.log('========================================')
console.log('')

console.log('📋 Required Environment Variables for Shopify Partner Approval:')
console.log('')

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  console.log(`${key}=${value}`)
})

console.log('')
console.log('🔐 Shopify Configuration:')
console.log('')

Object.entries(shopifyEnvVars).forEach(([key, value]) => {
  console.log(`${key}=${value}`)
})

console.log('')
console.log('⚠️  IMPORTANT NOTES:')
console.log('1. Set these environment variables in your Vercel dashboard (or preferred secret manager)')
console.log('2. Make sure MAINTENANCE_MODE is disabled for Shopify testing')
console.log('3. Verify that NEXT_PUBLIC_APP_URL points to your production domain')
console.log('4. Ensure Shopify Partner Dashboard redirect URI uses your production callback, e.g. https://your-production-domain.com/api/auth/shopify/callback')
console.log('')

console.log('🔗 Vercel Environment Variables URL:')
console.log('https://vercel.com/your-team/crewflow/settings/environment-variables')
console.log('')

console.log('✅ After setting these variables, redeploy your app for changes to take effect.')
