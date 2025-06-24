// Quick API Key Test Script
require('dotenv').config({ path: '.env.local' })

console.log('🔍 Testing CrewFlow AI Framework Setup...\n')

// Check environment variables
console.log('📋 Environment Variables:')
console.log('OpenAI Key:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing')
console.log('Perplexity Key:', process.env.PERPLEXITY_API_KEY ? '✅ Set' : '❌ Missing')
console.log('Anthropic Key:', process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing')
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
console.log('')

// Test OpenAI API
async function testOpenAI() {
  try {
    const OpenAI = require('openai')
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    
    console.log('🤖 Testing OpenAI API...')
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "OpenAI API working!" in exactly those words.' }],
      max_tokens: 10
    })
    
    console.log('✅ OpenAI Response:', response.choices[0].message.content)
    return true
  } catch (error) {
    console.log('❌ OpenAI Error:', error.message)
    return false
  }
}

// Test Perplexity API
async function testPerplexity() {
  try {
    const axios = require('axios')
    
    console.log('🔍 Testing Perplexity API...')
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: process.env.PERPLEXITY_MODEL || 'llama-3.1-sonar-large-128k-online',
      messages: [{ role: 'user', content: 'Say "Perplexity API working!" in exactly those words.' }],
      max_tokens: 10
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('✅ Perplexity Response:', response.data.choices[0].message.content)
    return true
  } catch (error) {
    console.log('❌ Perplexity Error:', error.response?.data?.error?.message || error.message)
    return false
  }
}

// Test Anthropic API
async function testAnthropic() {
  try {
    const Anthropic = require('@anthropic-ai/sdk')
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
    
    console.log('🧠 Testing Anthropic API...')
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say "Anthropic API working!" in exactly those words.' }]
    })
    
    console.log('✅ Anthropic Response:', response.content[0].text)
    return true
  } catch (error) {
    console.log('❌ Anthropic Error:', error.message)
    return false
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Running API Tests...\n')
  
  const results = {
    openai: await testOpenAI(),
    perplexity: await testPerplexity(),
    anthropic: await testAnthropic()
  }
  
  console.log('\n📊 Test Results Summary:')
  console.log('OpenAI:', results.openai ? '✅ Working' : '❌ Failed')
  console.log('Perplexity:', results.perplexity ? '✅ Working' : '❌ Failed')
  console.log('Anthropic:', results.anthropic ? '✅ Working' : '❌ Failed')
  
  const workingCount = Object.values(results).filter(Boolean).length
  console.log(`\n🎯 ${workingCount}/3 APIs working successfully!`)
  
  if (workingCount === 3) {
    console.log('🎉 All APIs are working! CrewFlow is ready to go!')
  } else if (workingCount >= 1) {
    console.log('⚠️  Some APIs working. You can start testing with working APIs.')
  } else {
    console.log('❌ No APIs working. Check your API keys and internet connection.')
  }
}

runTests().catch(console.error)
