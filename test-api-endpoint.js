// Test the actual API endpoint to see detailed error logs
const axios = require('axios');

async function testAPIEndpoint() {
  console.log('🧪 Testing CrewFlow API Endpoint...\n');
  
  const testMessage = 'for my crew flow application which software should i connect with so you can automate';
  
  try {
    console.log('📝 Sending message:', testMessage);
    console.log('🌐 URL: http://localhost:3005/api/agents/anchor');
    console.log('─'.repeat(60));

    const response = await axios.post('http://localhost:3005/api/agents/anchor', {
      message: testMessage,
      taskType: 'general',
      userId: 'test-user-123',
      threadId: null
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ API Response:');
    console.log('📊 Status:', response.status);
    console.log('🤖 Framework:', response.data.agent?.framework);
    console.log('📄 Response Length:', response.data.response?.length);
    console.log('🔢 Usage:', response.data.usage);
    console.log('⏱️ Latency:', response.data.latency);
    
    console.log('\n💬 Full Response:');
    console.log(response.data.response);
    
  } catch (error) {
    console.log('❌ API Error:');
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📄 Response Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('🔍 Error Message:', error.message);
    }
  }
}

testAPIEndpoint().catch(console.error);
