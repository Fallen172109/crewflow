#!/usr/bin/env node

/**
 * Automated Shopify Development Setup
 * Starts ngrok and shows you the URLs to update in Partner Dashboard
 */

const { spawn, exec } = require('child_process')

console.log('🚀 Starting CrewFlow Shopify Development Environment...\n')

// Start Next.js dev server
console.log('📦 Starting Next.js development server...')
const nextProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
})

// Wait for Next.js to start
setTimeout(() => {
  console.log('\n🌐 Starting ngrok tunnel...')

  // Start ngrok with JSON output for easier parsing
  const ngrokProcess = spawn('ngrok', ['http', '3000', '--log=stdout'], {
    stdio: 'pipe',
    shell: true
  })

  let ngrokUrl = ''
  let urlFound = false

  ngrokProcess.stdout.on('data', (data) => {
    const output = data.toString()
    console.log('ngrok output:', output) // Debug output

    // Look for the public URL in different formats
    const urlPatterns = [
      /url=https:\/\/[a-z0-9-]+\.ngrok\.io/,
      /https:\/\/[a-z0-9-]+\.ngrok\.io/,
      /Forwarding\s+https:\/\/[a-z0-9-]+\.ngrok\.io/
    ]

    for (const pattern of urlPatterns) {
      const urlMatch = output.match(pattern)
      if (urlMatch && !urlFound) {
        ngrokUrl = urlMatch[0].replace(/^(url=|Forwarding\s+)/, '')
        urlFound = true

        console.log('\n✅ ngrok tunnel established!')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('📋 UPDATE YOUR SHOPIFY PARTNER DASHBOARD:')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`🔗 App URL: ${ngrokUrl}`)
        console.log(`🔗 Redirect URL: ${ngrokUrl}/api/auth/shopify/callback`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('\n🧪 Test URLs:')
        console.log(`   Local: http://localhost:3000`)
        console.log(`   Public: ${ngrokUrl}`)
        console.log(`   Install Test: ${ngrokUrl}/api/auth/shopify/install?shop=test.myshopify.com`)
        console.log(`   Debug: ${ngrokUrl}/api/debug/environment`)
        console.log('\n⏹️  Press Ctrl+C to stop both servers')
        break
      }
    }
  })

  // Also try to get URL from ngrok API after a delay
  setTimeout(() => {
    if (!urlFound) {
      console.log('\n🔍 Trying to get ngrok URL from API...')
      exec('curl -s http://localhost:4040/api/tunnels', (error, stdout) => {
        if (!error && stdout) {
          try {
            const tunnels = JSON.parse(stdout)
            if (tunnels.tunnels && tunnels.tunnels.length > 0) {
              const publicUrl = tunnels.tunnels[0].public_url
              if (publicUrl && publicUrl.includes('ngrok.io')) {
                console.log('\n✅ Found ngrok URL via API!')
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
                console.log('📋 UPDATE YOUR SHOPIFY PARTNER DASHBOARD:')
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
                console.log(`🔗 App URL: ${publicUrl}`)
                console.log(`🔗 Redirect URL: ${publicUrl}/api/auth/shopify/callback`)
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
                console.log('\n🧪 Test URLs:')
                console.log(`   Local: http://localhost:3000`)
                console.log(`   Public: ${publicUrl}`)
                console.log(`   Install Test: ${publicUrl}/api/auth/shopify/install?shop=test.myshopify.com`)
                console.log(`   Debug: ${publicUrl}/api/debug/environment`)
                console.log('\n⏹️  Press Ctrl+C to stop both servers')
              }
            }
          } catch (e) {
            console.log('❌ Could not parse ngrok API response')
          }
        }

        if (!urlFound) {
          console.log('\n❌ Could not automatically detect ngrok URL')
          console.log('📋 Manual steps:')
          console.log('1. Open http://localhost:4040 in your browser')
          console.log('2. Copy the https://....ngrok.io URL')
          console.log('3. Use that URL in Shopify Partner Dashboard')
        }
      })
    }
  }, 5000)

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development environment...')
    nextProcess.kill()
    ngrokProcess.kill()
    
    console.log('\n📋 REMEMBER TO UPDATE SHOPIFY PARTNER DASHBOARD BACK TO:')
    console.log('🔗 App URL: https://crewflow.ai')
    console.log('🔗 Redirect URL: https://crewflow.ai/api/auth/shopify/callback')
    
    process.exit()
  })

}, 3000)
