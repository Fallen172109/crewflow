// Test script to diagnose AI framework issues
const axios = require('axios');

async function testChatAPI() {
  console.log('🧪 Testing CrewFlow AI Frameworks...\n');
  
  const testCases = [
    {
      name: 'Research Question (should use Perplexity)',
      message: 'which is best to automate',
      expectedFramework: 'perplexity'
    },
    {
      name: 'Workflow Question (should use AutoGen)', 
      message: 'for my crew flow application which software should i connect with so you can automate',
      expectedFramework: 'perplexity' // This should actually trigger research since it has "which" + "best"
    },
    {
      name: 'Simple Automation Question',
      message: 'how do I automate my business processes',
      expectedFramework: 'autogen'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log(`📝 Message: "${testCase.message}"`);
    console.log(`🎯 Expected Framework: ${testCase.expectedFramework}`);
    console.log('─'.repeat(60));
    
    try {
      const response = await axios.post('http://localhost:3005/api/agents/anchor/chat', {
        message: testCase.message,
        taskType: 'general',
        userId: 'test-user',
        threadId: null
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log(`✅ Status: ${response.status}`);
      console.log(`🤖 Framework Used: ${response.data.agent?.framework || 'unknown'}`);
      console.log(`📊 Tokens: ${response.data.usage || 'unknown'}`);
      console.log(`⏱️ Latency: ${response.data.latency || 'unknown'}ms`);
      console.log(`📄 Response Length: ${response.data.response?.length || 0} characters`);
      
      // Show first 200 characters of response
      const preview = response.data.response?.substring(0, 200) + '...';
      console.log(`💬 Response Preview: ${preview}`);
      
      // Check if it's using the expected framework
      const actualFramework = response.data.agent?.framework;
      if (actualFramework === testCase.expectedFramework) {
        console.log('🎉 Framework match: CORRECT');
      } else {
        console.log(`⚠️ Framework mismatch: Expected ${testCase.expectedFramework}, got ${actualFramework}`);
      }
      
    } catch (error) {
      console.log('❌ ERROR:', error.message);
      if (error.response) {
        console.log('📊 Status:', error.response.status);
        console.log('📄 Response:', error.response.data);
      }
    }
  }
  
  console.log('\n🏁 Test Complete');
}

// Run the test
testChatAPI().catch(console.error);
