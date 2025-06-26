// Test script to compare real vs estimated AI costs
// Run with: node test-real-vs-estimated-costs.js

require('dotenv').config()

async function testRealVsEstimatedCosts() {
  console.log('🧪 Testing Real vs Estimated AI Costs\n')

  // Test OpenAI API call to get real token usage
  console.log('📡 Making real OpenAI API call...')
  try {
    const OpenAI = require('openai')
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const testMessage = "Hello, I need help with customer support best practices."
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are Coral, a customer support specialist. Provide helpful advice.'
        },
        {
          role: 'user',
          content: testMessage
        }
      ],
      max_tokens: 150
    })

    console.log('✅ Real API Response:')
    console.log(`   Model: ${response.model}`)
    console.log(`   Input Tokens: ${response.usage.prompt_tokens}`)
    console.log(`   Output Tokens: ${response.usage.completion_tokens}`)
    console.log(`   Total Tokens: ${response.usage.total_tokens}`)
    
    // Calculate real cost based on actual token usage
    const inputCost = (response.usage.prompt_tokens / 1000) * 0.01  // $0.01 per 1K input tokens
    const outputCost = (response.usage.completion_tokens / 1000) * 0.03  // $0.03 per 1K output tokens
    const realCost = inputCost + outputCost
    
    console.log(`   Real Cost: $${realCost.toFixed(6)}`)
    console.log(`   Response: ${response.choices[0].message.content.substring(0, 100)}...`)

    // Compare with estimated cost (what CrewFlow currently uses)
    console.log('\n📊 Estimated vs Real Comparison:')
    
    // Estimated cost (fixed cost per request)
    const estimatedCost = 0.02  // Example fixed cost
    const estimatedTokens = 100  // Example estimated tokens
    
    console.log(`   Estimated Cost: $${estimatedCost.toFixed(6)} (fixed)`)
    console.log(`   Estimated Tokens: ${estimatedTokens} (estimated)`)
    console.log(`   Real Cost: $${realCost.toFixed(6)} (actual)`)
    console.log(`   Real Tokens: ${response.usage.total_tokens} (actual)`)
    
    const costDifference = Math.abs(realCost - estimatedCost)
    const tokenDifference = Math.abs(response.usage.total_tokens - estimatedTokens)
    
    console.log(`\n📈 Accuracy Analysis:`)
    console.log(`   Cost Difference: $${costDifference.toFixed(6)} (${((costDifference / realCost) * 100).toFixed(1)}%)`)
    console.log(`   Token Difference: ${tokenDifference} tokens (${((tokenDifference / response.usage.total_tokens) * 100).toFixed(1)}%)`)
    
    if (costDifference > realCost * 0.1) {
      console.log(`   ⚠️  Cost estimate is off by more than 10%`)
    } else {
      console.log(`   ✅ Cost estimate is reasonably accurate`)
    }

  } catch (error) {
    console.log('❌ OpenAI API Error:', error.message)
  }

  // Test Perplexity API call
  console.log('\n📡 Making real Perplexity API call...')
  try {
    const axios = require('axios')
    
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: process.env.PERPLEXITY_MODEL || 'llama-3.1-sonar-large-128k-online',
      messages: [
        {
          role: 'system',
          content: 'You are Pearl, a content and SEO specialist. Provide helpful advice.'
        },
        {
          role: 'user',
          content: 'What are the latest SEO trends for 2024?'
        }
      ],
      max_tokens: 150
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('✅ Real Perplexity Response:')
    console.log(`   Model: ${response.data.model}`)
    if (response.data.usage) {
      console.log(`   Input Tokens: ${response.data.usage.prompt_tokens || 'N/A'}`)
      console.log(`   Output Tokens: ${response.data.usage.completion_tokens || 'N/A'}`)
      console.log(`   Total Tokens: ${response.data.usage.total_tokens || 'N/A'}`)
      
      // Calculate real cost for Perplexity
      const inputTokens = response.data.usage.prompt_tokens || 0
      const outputTokens = response.data.usage.completion_tokens || 0
      const perplexityInputCost = (inputTokens / 1000) * 0.001  // $0.001 per 1K tokens
      const perplexityOutputCost = (outputTokens / 1000) * 0.001  // $0.001 per 1K tokens
      const perplexityRealCost = perplexityInputCost + perplexityOutputCost
      
      console.log(`   Real Cost: $${perplexityRealCost.toFixed(6)}`)
    } else {
      console.log('   Usage data not available in response')
    }
    
    console.log(`   Response: ${response.data.choices[0].message.content.substring(0, 100)}...`)

  } catch (error) {
    console.log('❌ Perplexity API Error:', error.response?.data?.error?.message || error.message)
  }

  console.log('\n🎯 Summary:')
  console.log('   Current CrewFlow system uses ESTIMATED costs and tokens')
  console.log('   Real API responses provide ACTUAL usage data')
  console.log('   Updated system will track real usage for accurate billing')
  console.log('\n   Next steps:')
  console.log('   1. ✅ Updated Coral agent to use real tracking')
  console.log('   2. ⏳ Update remaining agents (Pearl, Mariner, etc.)')
  console.log('   3. ⏳ Implement provider API usage sync')
  console.log('   4. ⏳ Add real vs estimated comparison dashboard')
}

// Run the test
testRealVsEstimatedCosts().catch(console.error)
