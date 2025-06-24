#!/usr/bin/env node

/**
 * Coral Agent Test Suite
 * Tests the customer support capabilities of the Coral AI agent
 */

const testScenarios = [
  {
    name: 'Positive Customer Feedback',
    message: 'Thank you so much for the excellent support! Your team has been incredibly helpful.',
    expectedSentiment: 'positive',
    expectedUrgency: 'low'
  },
  {
    name: 'Frustrated Customer',
    message: 'I am extremely frustrated with your service. This is the third time I\'ve had this issue and nothing gets resolved!',
    expectedSentiment: 'negative',
    expectedUrgency: 'high'
  },
  {
    name: 'Urgent Technical Issue',
    message: 'URGENT: Our system is completely down and we need immediate assistance. This is critical for our business operations.',
    expectedSentiment: 'negative',
    expectedUrgency: 'high'
  },
  {
    name: 'General Inquiry',
    message: 'Hi, I have a question about my billing. Can you help me understand the charges on my account?',
    expectedSentiment: 'neutral',
    expectedUrgency: 'medium'
  },
  {
    name: 'Escalation Request',
    message: 'I want to speak to your manager immediately. This is unacceptable and I\'m considering legal action.',
    expectedSentiment: 'negative',
    expectedUrgency: 'high',
    expectedEscalation: true
  }
]

const presetActionTests = [
  {
    action: 'generate_response',
    params: {
      issue: 'Login problems',
      tone: 'frustrated',
      priority: 'high',
      category: 'technical'
    }
  },
  {
    action: 'analyze_sentiment',
    params: {
      message: 'Your service is terrible and I want my money back!',
      context: 'Customer has had multiple issues'
    }
  },
  {
    action: 'escalate_ticket',
    params: {
      issue: 'Billing dispute over $500 charge',
      customer: 'Premium customer, 3 years with company',
      actions: 'Reviewed account, explained charges, customer still unsatisfied',
      reason: 'Customer demands manager involvement'
    }
  },
  {
    action: 'create_knowledge',
    params: {
      issueType: 'Login Issues',
      problem: 'Users unable to access account after password reset',
      solution: 'Clear browser cache and cookies, then retry login',
      category: 'Authentication'
    }
  }
]

async function testCoralAgent() {
  console.log('🚢 CrewFlow - Coral Agent Test Suite')
  console.log('=====================================\n')

  const baseUrl = process.env.CREWFLOW_URL || 'http://localhost:3000'
  const apiUrl = `${baseUrl}/api/agents/coral`

  console.log(`Testing Coral Agent at: ${apiUrl}\n`)

  // Test 1: Health Check
  console.log('1. Health Check')
  console.log('---------------')
  try {
    const response = await fetch(apiUrl, { method: 'GET' })
    const data = await response.json()
    console.log('✅ Health check passed')
    console.log(`   Agent: ${data.agent}`)
    console.log(`   Status: ${data.status}`)
    console.log(`   Capabilities: ${data.capabilities.join(', ')}`)
    console.log(`   Integrations: ${data.integrations.join(', ')}\n`)
  } catch (error) {
    console.log('❌ Health check failed:', error.message)
    return
  }

  // Test 2: Message Processing
  console.log('2. Message Processing Tests')
  console.log('---------------------------')
  
  for (const scenario of testScenarios) {
    console.log(`Testing: ${scenario.name}`)
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: scenario.message
        })
      })

      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Response received')
        console.log(`   Sentiment: ${data.metadata?.sentiment || 'not detected'}`)
        console.log(`   Urgency: ${data.metadata?.urgency || 'not detected'}`)
        console.log(`   Escalation: ${data.metadata?.escalationRequired ? 'Required' : 'Not required'}`)
        console.log(`   Tokens: ${data.usage?.tokensUsed || 0}`)
        console.log(`   Latency: ${data.usage?.latency || 0}ms`)
        
        // Validate expectations
        if (scenario.expectedSentiment && data.metadata?.sentiment !== scenario.expectedSentiment) {
          console.log(`   ⚠️  Expected sentiment: ${scenario.expectedSentiment}, got: ${data.metadata?.sentiment}`)
        }
        if (scenario.expectedUrgency && data.metadata?.urgency !== scenario.expectedUrgency) {
          console.log(`   ⚠️  Expected urgency: ${scenario.expectedUrgency}, got: ${data.metadata?.urgency}`)
        }
        if (scenario.expectedEscalation && !data.metadata?.escalationRequired) {
          console.log(`   ⚠️  Expected escalation to be required`)
        }
      } else {
        console.log('❌ Request failed:', data.error)
      }
    } catch (error) {
      console.log('❌ Test failed:', error.message)
    }
    console.log('')
  }

  // Test 3: Preset Actions
  console.log('3. Preset Action Tests')
  console.log('----------------------')
  
  for (const test of presetActionTests) {
    console.log(`Testing action: ${test.action}`)
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: test.action,
          params: test.params
        })
      })

      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Action executed successfully')
        console.log(`   Response length: ${data.response.length} characters`)
        console.log(`   Tokens: ${data.usage?.tokensUsed || 0}`)
        console.log(`   Latency: ${data.usage?.latency || 0}ms`)
        
        // Show first 100 characters of response
        const preview = data.response.substring(0, 100) + (data.response.length > 100 ? '...' : '')
        console.log(`   Preview: "${preview}"`)
      } else {
        console.log('❌ Action failed:', data.error)
      }
    } catch (error) {
      console.log('❌ Test failed:', error.message)
    }
    console.log('')
  }

  console.log('🎉 Coral Agent testing complete!')
  console.log('\nNext steps:')
  console.log('- Visit /test-coral to try the interactive interface')
  console.log('- Check the dashboard for usage analytics')
  console.log('- Configure integrations (Zendesk, Intercom, etc.)')
}

// Run tests if this script is executed directly
if (require.main === module) {
  testCoralAgent().catch(console.error)
}

module.exports = { testCoralAgent, testScenarios, presetActionTests }
