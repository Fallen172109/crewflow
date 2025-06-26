#!/usr/bin/env node

/**
 * CrewFlow Real AI Functionality Test Suite
 * Tests all implemented AI features including image generation, meal planning, fitness planning, and productivity tools
 */

const implementedFeatures = [
  {
    name: 'Image Generation (DALL-E)',
    endpoint: '/api/agents/coral',
    action: 'image_generator',
    testParams: {
      prompt: 'A professional maritime office with modern technology',
      style: 'Digital Art',
      aspect_ratio: 'Landscape (4:3)',
      quality: 'standard'
    },
    expectedFeatures: ['real_image_generation', 'dall_e_integration', 'usage_tracking']
  },
  {
    name: 'Meal Planning AI',
    endpoint: '/api/agents/coral',
    action: 'crew_fitness_planner', // This now handles meal planning
    testParams: {
      dietary_preferences: ['vegetarian'],
      days: 3,
      serving_size: 2,
      health_goals: ['weight loss', 'muscle gain']
    },
    expectedFeatures: ['real_meal_planning', 'nutritional_analysis', 'shopping_lists']
  },
  {
    name: 'Fitness Planning AI',
    endpoint: '/api/agents/coral',
    action: 'crew_fitness_planner',
    testParams: {
      fitness_level: 'intermediate',
      goals: ['strength training', 'cardio improvement'],
      days_per_week: 4,
      available_time: '45 minutes',
      equipment: ['dumbbells', 'resistance bands']
    },
    expectedFeatures: ['real_fitness_planning', 'workout_routines', 'progress_tracking']
  },
  {
    name: 'Productivity Planning AI',
    endpoint: '/api/agents/coral',
    action: 'productivity_compass',
    testParams: {
      goals: ['improve time management', 'increase focus'],
      timeframe: '4 weeks',
      available_hours: 8,
      work_style: 'focused',
      challenges: ['procrastination', 'distractions']
    },
    expectedFeatures: ['real_productivity_planning', 'habit_tracking', 'goal_setting']
  },
  {
    name: 'Pearl Content & SEO (Perplexity)',
    endpoint: '/api/agents/pearl',
    action: 'visual_content_creator',
    testParams: {
      prompt: 'A modern SEO-optimized infographic about digital marketing trends',
      style: 'Digital Art',
      aspect_ratio: 'Square (1:1)'
    },
    expectedFeatures: ['perplexity_integration', 'seo_optimization', 'real_time_research']
  },
  {
    name: 'Chat Integration Test',
    endpoint: '/api/agents/coral/chat',
    method: 'POST',
    testParams: {
      message: 'Can you help me create a meal plan for this week?',
      taskType: 'crew_ability',
      userId: 'test-user-id'
    },
    expectedFeatures: ['real_ai_responses', 'chat_integration', 'usage_tracking']
  }
]

async function testRealAIFunctionality() {
  console.log('🚢 CrewFlow Real AI Functionality Test Suite')
  console.log('==============================================\n')

  const baseUrl = process.env.CREWFLOW_URL || 'http://localhost:3000'
  let totalTests = 0
  let passedTests = 0
  let failedTests = 0

  console.log(`Testing against: ${baseUrl}\n`)

  // Test each implemented AI feature
  for (const feature of implementedFeatures) {
    console.log(`\n🤖 Testing ${feature.name}`)
    console.log('─'.repeat(50))
    
    const apiUrl = `${baseUrl}${feature.endpoint}`
    totalTests++

    try {
      const method = feature.method || 'POST'
      const requestBody = feature.action ? 
        { action: feature.action, params: feature.testParams } :
        feature.testParams

      console.log(`📡 ${method} ${apiUrl}`)
      console.log(`📋 Request:`, JSON.stringify(requestBody, null, 2))

      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // You may need to adjust this
        },
        body: JSON.stringify(requestBody)
      })

      const responseData = await response.json()
      
      console.log(`📊 Status: ${response.status}`)
      console.log(`📄 Response:`, JSON.stringify(responseData, null, 2))

      // Validate response
      if (response.ok && responseData.success !== false) {
        console.log('✅ Request successful')
        
        // Check for expected features
        let featuresPassed = 0
        for (const expectedFeature of feature.expectedFeatures) {
          if (validateFeature(responseData, expectedFeature)) {
            console.log(`  ✅ ${expectedFeature}: PASSED`)
            featuresPassed++
          } else {
            console.log(`  ❌ ${expectedFeature}: FAILED`)
          }
        }
        
        if (featuresPassed === feature.expectedFeatures.length) {
          console.log('🎉 All features validated successfully')
          passedTests++
        } else {
          console.log(`⚠️  ${featuresPassed}/${feature.expectedFeatures.length} features passed`)
          failedTests++
        }
      } else {
        console.log('❌ Request failed')
        console.log(`Error: ${responseData.error || 'Unknown error'}`)
        failedTests++
      }

    } catch (error) {
      console.log('❌ Test failed with exception')
      console.error(`Error: ${error.message}`)
      failedTests++
    }

    console.log('') // Add spacing between tests
  }

  // Test Summary
  console.log('\n🎯 Test Summary')
  console.log('================')
  console.log(`Total Tests: ${totalTests}`)
  console.log(`✅ Passed: ${passedTests}`)
  console.log(`❌ Failed: ${failedTests}`)
  console.log(`📊 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`)

  if (passedTests === totalTests) {
    console.log('\n🎉 All AI functionality tests passed! CrewFlow is ready for real AI operations.')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation and fix any issues.')
  }

  return {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    successRate: Math.round((passedTests / totalTests) * 100)
  }
}

function validateFeature(responseData, feature) {
  switch (feature) {
    case 'real_image_generation':
      return responseData.response && 
             (responseData.response.includes('Image Generated Successfully') || 
              responseData.response.includes('imageUrl') ||
              responseData.metadata?.imageGeneration === true)
    
    case 'dall_e_integration':
      return responseData.response && 
             (responseData.response.includes('DALL-E') || 
              responseData.metadata?.imageUrl)
    
    case 'real_meal_planning':
      return responseData.response && 
             (responseData.response.includes('Meal Plan Generated') || 
              responseData.response.includes('nutritional') ||
              responseData.metadata?.mealPlanning === true)
    
    case 'nutritional_analysis':
      return responseData.response && 
             (responseData.response.includes('calories') || 
              responseData.response.includes('protein') ||
              responseData.response.includes('nutrition'))
    
    case 'real_fitness_planning':
      return responseData.response && 
             (responseData.response.includes('Fitness Plan Generated') || 
              responseData.response.includes('workout') ||
              responseData.metadata?.fitnessPlanning === true)
    
    case 'workout_routines':
      return responseData.response && 
             (responseData.response.includes('exercise') || 
              responseData.response.includes('sets') ||
              responseData.response.includes('reps'))
    
    case 'real_productivity_planning':
      return responseData.response && 
             (responseData.response.includes('Productivity Plan Generated') || 
              responseData.response.includes('time block') ||
              responseData.metadata?.productivityPlanning === true)
    
    case 'habit_tracking':
      return responseData.response && 
             (responseData.response.includes('habit') || 
              responseData.response.includes('routine') ||
              responseData.response.includes('tracking'))
    
    case 'perplexity_integration':
      return responseData.framework === 'perplexity' || 
             responseData.sources || 
             responseData.response.includes('research')
    
    case 'seo_optimization':
      return responseData.response && 
             (responseData.response.includes('SEO') || 
              responseData.response.includes('optimization'))
    
    case 'real_ai_responses':
      return responseData.response && 
             responseData.response.length > 50 && 
             !responseData.response.includes('simulated response')
    
    case 'chat_integration':
      return responseData.response && responseData.agent
    
    case 'usage_tracking':
      return responseData.usage || responseData.tokensUsed !== undefined
    
    default:
      console.log(`Unknown feature: ${feature}`)
      return false
  }
}

// Run the tests
if (require.main === module) {
  testRealAIFunctionality()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0)
    })
    .catch(error => {
      console.error('Test suite failed:', error)
      process.exit(1)
    })
}

module.exports = { testRealAIFunctionality, validateFeature }
