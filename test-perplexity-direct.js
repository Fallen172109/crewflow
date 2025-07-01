// Direct test of Perplexity API to diagnose issues
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function testPerplexityDirect() {
  console.log('🧪 Testing Perplexity API directly...\n');
  
  const apiKey = process.env.PERPLEXITY_API_KEY;
  const model = process.env.PERPLEXITY_MODEL || 'llama-3.1-sonar-large-128k-online';
  
  console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
  console.log('🤖 Model:', model);
  console.log('─'.repeat(60));
  
  if (!apiKey) {
    console.log('❌ ERROR: PERPLEXITY_API_KEY not found in environment');
    return;
  }
  
  try {
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are Anchor, a Supply Chain Admiral AI assistant. Provide intelligent, specific recommendations for business automation and software integrations.'
        },
        {
          role: 'user',
          content: 'for my crew flow application which software should i connect with so you can automate'
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ Perplexity API Response:');
    console.log('📊 Status:', response.status);
    console.log('🤖 Model Used:', response.data.model);
    console.log('📄 Response:', response.data.choices[0].message.content);
    console.log('🔢 Tokens:', response.data.usage);
    
  } catch (error) {
    console.log('❌ Perplexity API Error:');
    console.log('📊 Status:', error.response?.status);
    console.log('📄 Error:', error.response?.data || error.message);
    console.log('🔍 Full Error:', error.message);
  }
}

async function testOpenAIDirect() {
  console.log('\n🧪 Testing OpenAI API directly...\n');
  
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
  
  console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
  console.log('🤖 Model:', model);
  console.log('─'.repeat(60));
  
  if (!apiKey) {
    console.log('❌ ERROR: OPENAI_API_KEY not found in environment');
    return;
  }
  
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are Anchor, a Supply Chain Admiral AI assistant. Provide intelligent, specific recommendations for business automation and software integrations.'
        },
        {
          role: 'user',
          content: 'for my crew flow application which software should i connect with so you can automate'
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ OpenAI API Response:');
    console.log('📊 Status:', response.status);
    console.log('🤖 Model Used:', response.data.model);
    console.log('📄 Response:', response.data.choices[0].message.content);
    console.log('🔢 Tokens:', response.data.usage);
    
  } catch (error) {
    console.log('❌ OpenAI API Error:');
    console.log('📊 Status:', error.response?.status);
    console.log('📄 Error:', error.response?.data || error.message);
    console.log('🔍 Full Error:', error.message);
  }
}

// Run both tests
async function runTests() {
  await testPerplexityDirect();
  await testOpenAIDirect();
  console.log('\n🏁 Direct API Tests Complete');
}

runTests().catch(console.error);
