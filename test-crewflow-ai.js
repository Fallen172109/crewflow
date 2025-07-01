// Test CrewFlow's internal AI framework implementation
require('dotenv').config({ path: '.env.local' });

// Import our AI framework modules
const path = require('path');
const { createPerplexityAgent } = require('./src/lib/ai/perplexity.ts');
const { getAgent } = require('./src/lib/agents.ts');

async function testCrewFlowAI() {
  console.log('🧪 Testing CrewFlow AI Framework Implementation...\n');
  
  try {
    // Test getting the Anchor agent
    console.log('📋 Step 1: Getting Anchor agent configuration...');
    const anchor = getAgent('anchor');
    console.log('✅ Anchor agent:', anchor ? 'Found' : 'Not found');
    if (anchor) {
      console.log('   - Name:', anchor.name);
      console.log('   - ID:', anchor.id);
      console.log('   - Framework:', anchor.framework);
    }
    
    // Test creating Perplexity agent
    console.log('\n📋 Step 2: Creating Perplexity agent...');
    const systemPrompt = `You are Anchor, a Supply Chain Admiral AI assistant specializing in business automation and software integrations. Provide intelligent, specific recommendations.`;
    
    const perplexityAgent = createPerplexityAgent(anchor, systemPrompt);
    console.log('✅ Perplexity agent created:', perplexityAgent ? 'Success' : 'Failed');
    
    // Test processing a message
    console.log('\n📋 Step 3: Processing test message...');
    const testMessage = 'for my crew flow application which software should i connect with so you can automate';
    
    const result = await perplexityAgent.processMessage(testMessage);
    console.log('✅ Message processed');
    console.log('📄 Response length:', result.response?.length || 0);
    console.log('🔢 Tokens used:', result.tokensUsed);
    console.log('⏱️ Latency:', result.latency);
    console.log('🤖 Model:', result.model);
    console.log('✅ Success:', result.success);
    
    if (result.response) {
      console.log('\n💬 Response Preview:');
      console.log(result.response.substring(0, 300) + '...');
    }
    
    if (result.error) {
      console.log('\n❌ Error:', result.error);
    }
    
  } catch (error) {
    console.log('❌ CrewFlow AI Framework Error:');
    console.log('📄 Message:', error.message);
    console.log('🔍 Stack:', error.stack);
  }
}

testCrewFlowAI().catch(console.error);
