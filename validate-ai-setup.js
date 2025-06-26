#!/usr/bin/env node

/**
 * CrewFlow AI Setup Validation
 * Validates that all AI services are properly configured and accessible
 */

require('dotenv').config({ path: '.env.local' })

async function validateAISetup() {
  console.log('🔍 CrewFlow AI Setup Validation')
  console.log('================================\n')

  let allValid = true
  const results = []

  // Check environment variables
  console.log('📋 Checking Environment Variables...')
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'PERPLEXITY_API_KEY', 
    'ANTHROPIC_API_KEY',
    'OPENAI_MODEL',
    'PERPLEXITY_MODEL',
    'ANTHROPIC_MODEL'
  ]

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar]
    if (value && value !== 'your_key_here') {
      console.log(`  ✅ ${envVar}: Configured`)
      results.push({ check: envVar, status: 'pass', message: 'Configured' })
    } else {
      console.log(`  ❌ ${envVar}: Missing or placeholder`)
      results.push({ check: envVar, status: 'fail', message: 'Missing or placeholder' })
      allValid = false
    }
  }

  // Test OpenAI Connection
  console.log('\n🤖 Testing OpenAI Connection...')
  try {
    const { ChatOpenAI } = await import('@langchain/openai')
    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      maxTokens: 50,
      temperature: 0.1
    })

    const response = await llm.invoke('Say "OpenAI connection successful" in exactly those words.')
    if (response.content.includes('OpenAI connection successful')) {
      console.log('  ✅ OpenAI: Connection successful')
      results.push({ check: 'OpenAI Connection', status: 'pass', message: 'Connection successful' })
    } else {
      console.log('  ⚠️  OpenAI: Connected but unexpected response')
      results.push({ check: 'OpenAI Connection', status: 'warning', message: 'Connected but unexpected response' })
    }
  } catch (error) {
    console.log(`  ❌ OpenAI: Connection failed - ${error.message}`)
    results.push({ check: 'OpenAI Connection', status: 'fail', message: error.message })
    allValid = false
  }

  // Test Perplexity Connection
  console.log('\n🔍 Testing Perplexity Connection...')
  try {
    const axios = (await import('axios')).default
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: process.env.PERPLEXITY_MODEL || 'llama-3.1-sonar-large-128k-online',
      messages: [
        { role: 'user', content: 'Say "Perplexity connection successful" in exactly those words.' }
      ],
      max_tokens: 50,
      temperature: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })

    if (response.data.choices?.[0]?.message?.content?.includes('Perplexity connection successful')) {
      console.log('  ✅ Perplexity: Connection successful')
      results.push({ check: 'Perplexity Connection', status: 'pass', message: 'Connection successful' })
    } else {
      console.log('  ⚠️  Perplexity: Connected but unexpected response')
      results.push({ check: 'Perplexity Connection', status: 'warning', message: 'Connected but unexpected response' })
    }
  } catch (error) {
    console.log(`  ❌ Perplexity: Connection failed - ${error.message}`)
    results.push({ check: 'Perplexity Connection', status: 'fail', message: error.message })
    allValid = false
  }

  // Test Image Generation
  console.log('\n🎨 Testing Image Generation Setup...')
  try {
    const { createImageGenerationService } = await import('./src/lib/ai/image-generation.js')
    console.log('  ✅ Image Generation: Service module loaded')
    results.push({ check: 'Image Generation Module', status: 'pass', message: 'Module loaded successfully' })
  } catch (error) {
    console.log(`  ❌ Image Generation: Module load failed - ${error.message}`)
    results.push({ check: 'Image Generation Module', status: 'fail', message: error.message })
    allValid = false
  }

  // Test Meal Planning
  console.log('\n🍽️ Testing Meal Planning Setup...')
  try {
    const { createMealPlanningService } = await import('./src/lib/ai/meal-planning.js')
    console.log('  ✅ Meal Planning: Service module loaded')
    results.push({ check: 'Meal Planning Module', status: 'pass', message: 'Module loaded successfully' })
  } catch (error) {
    console.log(`  ❌ Meal Planning: Module load failed - ${error.message}`)
    results.push({ check: 'Meal Planning Module', status: 'fail', message: error.message })
    allValid = false
  }

  // Test Fitness Planning
  console.log('\n💪 Testing Fitness Planning Setup...')
  try {
    const { createFitnessPlanningService } = await import('./src/lib/ai/fitness-planning.js')
    console.log('  ✅ Fitness Planning: Service module loaded')
    results.push({ check: 'Fitness Planning Module', status: 'pass', message: 'Module loaded successfully' })
  } catch (error) {
    console.log(`  ❌ Fitness Planning: Module load failed - ${error.message}`)
    results.push({ check: 'Fitness Planning Module', status: 'fail', message: error.message })
    allValid = false
  }

  // Test Productivity Planning
  console.log('\n⚡ Testing Productivity Planning Setup...')
  try {
    const { createProductivityPlanningService } = await import('./src/lib/ai/productivity-planning.js')
    console.log('  ✅ Productivity Planning: Service module loaded')
    results.push({ check: 'Productivity Planning Module', status: 'pass', message: 'Module loaded successfully' })
  } catch (error) {
    console.log(`  ❌ Productivity Planning: Module load failed - ${error.message}`)
    results.push({ check: 'Productivity Planning Module', status: 'fail', message: error.message })
    allValid = false
  }

  // Test Usage Tracking
  console.log('\n📊 Testing Usage Tracking Setup...')
  try {
    const { trackRealUsage } = await import('./src/lib/ai-usage-tracker.js')
    console.log('  ✅ Usage Tracking: Module loaded')
    results.push({ check: 'Usage Tracking Module', status: 'pass', message: 'Module loaded successfully' })
  } catch (error) {
    console.log(`  ❌ Usage Tracking: Module load failed - ${error.message}`)
    results.push({ check: 'Usage Tracking Module', status: 'fail', message: error.message })
    allValid = false
  }

  // Summary
  console.log('\n📋 Validation Summary')
  console.log('=====================')
  
  const passed = results.filter(r => r.status === 'pass').length
  const warnings = results.filter(r => r.status === 'warning').length
  const failed = results.filter(r => r.status === 'fail').length
  
  console.log(`✅ Passed: ${passed}`)
  console.log(`⚠️  Warnings: ${warnings}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📊 Success Rate: ${Math.round((passed / results.length) * 100)}%`)

  if (allValid && failed === 0) {
    console.log('\n🎉 All AI services are properly configured and ready!')
    console.log('🚢 CrewFlow is ready to sail with real AI functionality.')
  } else {
    console.log('\n⚠️  Some issues were found. Please fix the following:')
    results.filter(r => r.status === 'fail').forEach(result => {
      console.log(`  - ${result.check}: ${result.message}`)
    })
  }

  return {
    allValid: allValid && failed === 0,
    results,
    summary: { passed, warnings, failed, total: results.length }
  }
}

// Run validation if called directly
if (require.main === module) {
  validateAISetup()
    .then(results => {
      process.exit(results.allValid ? 0 : 1)
    })
    .catch(error => {
      console.error('Validation failed:', error)
      process.exit(1)
    })
}

module.exports = { validateAISetup }
