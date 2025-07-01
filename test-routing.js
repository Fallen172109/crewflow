/**
 * Simple test script to verify the agent routing system
 * Run with: node test-routing.js
 */

// Import the routing functions (adjust path as needed)
const { analyzeDomain, shouldReferToSpecialist, generateReferralResponse } = require('./src/lib/ai/agent-routing.ts')
const { AGENTS } = require('./src/lib/agents.ts')

// Test cases
const testCases = [
  {
    message: "I need help creating a comprehensive Instagram marketing strategy with content calendar",
    currentAgent: 'coral',
    expectedDomain: 'social',
    expectedReferral: 'splash'
  },
  {
    message: "Can you help me analyze our quarterly budget and create financial forecasts?",
    currentAgent: 'coral',
    expectedDomain: 'finance',
    expectedReferral: 'ledger'
  },
  {
    message: "I'm having API integration issues with our database connectivity",
    currentAgent: 'splash',
    expectedDomain: 'technical',
    expectedReferral: 'patch'
  },
  {
    message: "Hello, how are you today?",
    currentAgent: 'coral',
    expectedDomain: 'general',
    expectedReferral: null // Should not refer basic questions
  },
  {
    message: "I need help with customer support workflows and ticket management",
    currentAgent: 'coral',
    expectedDomain: 'support',
    expectedReferral: null // Should not refer within domain
  }
]

console.log('🚢 Testing CrewFlow Agent Routing System\n')

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.message.substring(0, 50)}...`)
  
  try {
    // Step 1: Analyze domain
    const domainAnalysis = analyzeDomain(testCase.message)
    console.log(`  Domain: ${domainAnalysis.primaryDomain} (confidence: ${Math.round(domainAnalysis.confidence * 100)}%)`)
    console.log(`  Complexity: ${domainAnalysis.complexity}`)
    
    // Step 2: Check referral decision
    const currentAgent = AGENTS[testCase.currentAgent]
    const availableAgents = Object.values(AGENTS)
    const referralDecision = shouldReferToSpecialist(currentAgent, domainAnalysis, availableAgents)
    
    if (referralDecision.shouldRefer) {
      console.log(`  ✅ Should refer to: ${referralDecision.targetAgent?.name} (${referralDecision.targetAgent?.id})`)
      console.log(`  Reason: ${referralDecision.reason}`)
      
      // Step 3: Generate referral response
      const referralResponse = generateReferralResponse(currentAgent, referralDecision, testCase.message)
      console.log(`  Response: ${referralResponse.response.substring(0, 100)}...`)
      
      // Check if matches expected
      if (testCase.expectedReferral === referralDecision.targetAgent?.id) {
        console.log(`  ✅ PASS: Correctly referred to ${testCase.expectedReferral}`)
      } else {
        console.log(`  ❌ FAIL: Expected ${testCase.expectedReferral}, got ${referralDecision.targetAgent?.id}`)
      }
    } else {
      console.log(`  ⏭️  No referral needed`)
      
      // Check if matches expected
      if (testCase.expectedReferral === null) {
        console.log(`  ✅ PASS: Correctly did not refer`)
      } else {
        console.log(`  ❌ FAIL: Expected referral to ${testCase.expectedReferral}, but no referral made`)
      }
    }
    
    // Check domain detection
    if (testCase.expectedDomain === domainAnalysis.primaryDomain) {
      console.log(`  ✅ PASS: Correctly detected ${testCase.expectedDomain} domain`)
    } else {
      console.log(`  ❌ FAIL: Expected ${testCase.expectedDomain} domain, got ${domainAnalysis.primaryDomain}`)
    }
    
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`)
  }
  
  console.log('')
})

console.log('🎯 Agent Routing Test Complete!')

// Test maritime response templates
console.log('\n🚢 Testing Maritime Response Templates:')

const maritimeTestCases = [
  {
    source: 'coral',
    target: 'splash',
    message: "social media strategy"
  },
  {
    source: 'anchor',
    target: 'ledger',
    message: "financial analysis"
  }
]

maritimeTestCases.forEach((testCase, index) => {
  console.log(`\nMaritime Template ${index + 1}:`)
  try {
    const sourceAgent = AGENTS[testCase.source]
    const targetAgent = AGENTS[testCase.target]
    
    const mockReferralDecision = {
      shouldRefer: true,
      targetAgent: targetAgent,
      reason: `specialized ${testCase.target} expertise and tools`,
      confidence: 0.8
    }
    
    const referralResponse = generateReferralResponse(sourceAgent, mockReferralDecision, testCase.message)
    console.log(`Response: ${referralResponse.response}`)
    
    // Check for maritime terms
    const maritimeTerms = ['ahoy', 'navigator', 'crew', 'maritime', 'chart', 'course', 'sail', 'anchor']
    const hasMaritimeTerms = maritimeTerms.some(term => 
      referralResponse.response.toLowerCase().includes(term)
    )
    
    if (hasMaritimeTerms) {
      console.log('✅ PASS: Contains maritime terminology')
    } else {
      console.log('❌ FAIL: Missing maritime terminology')
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`)
  }
})

console.log('\n🎉 All tests completed!')
