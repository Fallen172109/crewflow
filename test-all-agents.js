#!/usr/bin/env node

/**
 * CrewFlow AI Agent Suite Test Runner
 * Comprehensive testing for all implemented AI agents
 */

const implementedAgents = [
  {
    id: 'coral',
    name: 'Coral - Customer Support',
    framework: 'langchain',
    endpoint: '/api/agents/coral',
    testMessage: 'I am extremely frustrated with your service and want a refund immediately!',
    expectedFeatures: ['sentiment_analysis', 'escalation_detection', 'policy_compliance']
  },
  {
    id: 'mariner',
    name: 'Mariner - Marketing Automation',
    framework: 'hybrid',
    endpoint: '/api/agents/mariner',
    testMessage: 'Research the latest digital marketing trends for 2024',
    expectedFeatures: ['campaign_management', 'market_research', 'hybrid_intelligence']
  },
  {
    id: 'tide',
    name: 'Tide - Data Analysis',
    framework: 'autogen',
    endpoint: '/api/agents/tide',
    testMessage: 'Analyze our sales performance and identify growth opportunities',
    expectedFeatures: ['multi_agent_workflow', 'statistical_analysis', 'business_intelligence']
  },
  {
    id: 'morgan',
    name: 'Morgan - E-commerce Management',
    framework: 'langchain',
    endpoint: '/api/agents/morgan',
    testMessage: 'Optimize our product listings for better conversion rates',
    expectedFeatures: ['product_optimization', 'inventory_management', 'sales_analysis']
  }
]

const presetActionTests = {
  coral: [
    { action: 'generate_response', params: { issue: 'Login problems', tone: 'frustrated' } },
    { action: 'analyze_sentiment', params: { message: 'Your service is terrible!' } }
  ],
  mariner: [
    { action: 'create_campaign', params: { campaignType: 'Social media', audience: 'Tech startups' } },
    { action: 'analyze_competitors', params: { company: 'TechCorp', industry: 'SaaS' } }
  ],
  tide: [
    { action: 'generate_report', params: { dataSource: 'Sales data', reportType: 'Performance' } },
    { action: 'identify_trends', params: { dataset: 'Customer behavior', period: '6 months' } }
  ],
  morgan: [
    { action: 'setup_store', params: { storeType: 'Fashion retail', industry: 'Apparel' } },
    { action: 'optimize_pricing', params: { productType: 'Electronics', competition: 'High' } }
  ]
}

async function testAllAgents() {
  console.log('🚢 CrewFlow AI Agent Suite - Comprehensive Test')
  console.log('================================================\n')

  const baseUrl = process.env.CREWFLOW_URL || 'http://localhost:3000'
  let totalTests = 0
  let passedTests = 0
  let failedTests = 0

  console.log(`Testing against: ${baseUrl}\n`)

  // Test each implemented agent
  for (const agent of implementedAgents) {
    console.log(`\n🤖 Testing ${agent.name}`)
    console.log('─'.repeat(50))
    
    const apiUrl = `${baseUrl}${agent.endpoint}`
    
    // Test 1: Health Check
    console.log('1. Health Check')
    totalTests++
    try {
      const response = await fetch(apiUrl, { method: 'GET' })
      const data = await response.json()
      
      if (data.agent === agent.id && data.status === 'active') {
        console.log('   ✅ Health check passed')
        console.log(`   Framework: ${data.framework || 'Not specified'}`)
        console.log(`   Capabilities: ${data.capabilities?.join(', ') || 'Not listed'}`)
        passedTests++
      } else {
        console.log('   ❌ Health check failed - Invalid response')
        failedTests++
      }
    } catch (error) {
      console.log(`   ❌ Health check failed: ${error.message}`)
      failedTests++
    }

    // Test 2: Message Processing
    console.log('\n2. Message Processing')
    totalTests++
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: agent.testMessage
        })
      })

      const data = await response.json()
      
      if (data.success && data.response) {
        console.log('   ✅ Message processing successful')
        console.log(`   Response length: ${data.response.length} characters`)
        console.log(`   Framework: ${data.framework || agent.framework}`)
        
        if (data.usage) {
          console.log(`   Tokens: ${data.usage.tokensUsed} | Latency: ${data.usage.latency}ms`)
        }
        
        // Check for agent-specific features
        if (agent.id === 'coral' && data.metadata) {
          console.log(`   Sentiment: ${data.metadata.sentiment || 'Not detected'}`)
          console.log(`   Escalation: ${data.metadata.escalationRequired ? 'Required' : 'Not required'}`)
        }
        
        if (agent.id === 'tide' && data.agentSteps) {
          console.log(`   Multi-agent steps: ${data.agentSteps.length}`)
        }
        
        passedTests++
      } else {
        console.log(`   ❌ Message processing failed: ${data.error || 'Unknown error'}`)
        failedTests++
      }
    } catch (error) {
      console.log(`   ❌ Message processing failed: ${error.message}`)
      failedTests++
    }

    // Test 3: Preset Actions
    const actions = presetActionTests[agent.id] || []
    if (actions.length > 0) {
      console.log('\n3. Preset Actions')
      
      for (const actionTest of actions) {
        totalTests++
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: actionTest.action,
              params: actionTest.params
            })
          })

          const data = await response.json()
          
          if (data.success && data.response) {
            console.log(`   ✅ Action "${actionTest.action}" executed successfully`)
            console.log(`   Response preview: "${data.response.substring(0, 80)}..."`)
            passedTests++
          } else {
            console.log(`   ❌ Action "${actionTest.action}" failed: ${data.error || 'Unknown error'}`)
            failedTests++
          }
        } catch (error) {
          console.log(`   ❌ Action "${actionTest.action}" failed: ${error.message}`)
          failedTests++
        }
      }
    }
  }

  // Test Summary
  console.log('\n\n📊 Test Summary')
  console.log('================')
  console.log(`Total Tests: ${totalTests}`)
  console.log(`Passed: ${passedTests} ✅`)
  console.log(`Failed: ${failedTests} ❌`)
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

  // Implementation Status
  console.log('\n🚀 Implementation Status')
  console.log('========================')
  implementedAgents.forEach(agent => {
    console.log(`✅ ${agent.name} (${agent.framework})`)
  })

  console.log('\n📋 Next Steps')
  console.log('=============')
  console.log('1. Visit individual test pages:')
  implementedAgents.forEach(agent => {
    console.log(`   - /test-${agent.id} - Test ${agent.name}`)
  })
  console.log('2. Configure API keys in environment variables')
  console.log('3. Set up integrations (Shopify, Google Analytics, etc.)')
  console.log('4. Deploy to production environment')
  console.log('5. Monitor usage and performance metrics')

  console.log('\n🎉 CrewFlow AI Agent Suite testing complete!')
  
  return {
    totalTests,
    passedTests,
    failedTests,
    successRate: (passedTests / totalTests) * 100,
    implementedAgents: implementedAgents.length
  }
}

// Performance benchmark test
async function benchmarkAgents() {
  console.log('\n⚡ Performance Benchmark')
  console.log('========================')
  
  const baseUrl = process.env.CREWFLOW_URL || 'http://localhost:3000'
  const benchmarkMessage = 'Quick performance test message'
  
  for (const agent of implementedAgents) {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`${baseUrl}${agent.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: benchmarkMessage })
      })
      
      const data = await response.json()
      const totalTime = Date.now() - startTime
      
      if (data.success) {
        console.log(`${agent.name}: ${totalTime}ms (${data.usage?.tokensUsed || 0} tokens)`)
      } else {
        console.log(`${agent.name}: Failed`)
      }
    } catch (error) {
      console.log(`${agent.name}: Error - ${error.message}`)
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testAllAgents()
    .then(results => {
      if (process.argv.includes('--benchmark')) {
        return benchmarkAgents()
      }
    })
    .catch(console.error)
}

module.exports = { 
  testAllAgents, 
  benchmarkAgents, 
  implementedAgents, 
  presetActionTests 
}
