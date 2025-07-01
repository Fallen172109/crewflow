// Test script for CrewFlow Meal Planning Improvements
// Tests both pantry integration and meal diversity enhancements

const { createMealPlanningService } = require('./src/lib/ai/meal-planning.ts')

// Mock data for testing
const mockUserProfile = {
  weight_value: 70,
  height_value: 175,
  primary_goal: 'weight_loss',
  activity_level: 'moderately_active',
  preferred_meal_count: 3,
  household_size: 2,
  max_cooking_time_minutes: 45,
  budget_range: 'moderate'
}

const mockPantryItems = [
  {
    ingredient_name: 'chicken breast',
    quantity: 1,
    unit: 'kg',
    category: 'protein',
    include_in_meal_plans: true,
    expiration_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 5 days from now
  },
  {
    ingredient_name: 'brown rice',
    quantity: 2,
    unit: 'cups',
    category: 'grains',
    include_in_meal_plans: true
  },
  {
    ingredient_name: 'spinach',
    quantity: 200,
    unit: 'g',
    category: 'vegetables',
    include_in_meal_plans: true,
    expiration_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 2 days from now (urgent)
  },
  {
    ingredient_name: 'olive oil',
    quantity: 1,
    unit: 'bottle',
    category: 'pantry_staples',
    include_in_meal_plans: true
  },
  {
    ingredient_name: 'eggs',
    quantity: 12,
    unit: 'pieces',
    category: 'protein',
    include_in_meal_plans: true
  },
  {
    ingredient_name: 'tomatoes',
    quantity: 500,
    unit: 'g',
    category: 'vegetables',
    include_in_meal_plans: false // This should NOT be used
  }
]

const mockRecentMealHistory = {
  mealNames: ['grilled chicken salad', 'beef stir fry', 'chicken pasta'],
  proteinSources: ['chicken', 'beef'],
  cuisineStyles: ['italian', 'asian'],
  cookingMethods: ['grilled', 'stir-fried'],
  lastGeneratedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week ago
}

const mockMacroTargets = {
  protein: 120,
  carbs: 150,
  fat: 60,
  fiber: 25
}

async function testPantryIntegration() {
  console.log('\n🧪 Testing Pantry Integration...')
  
  const mealPlanningService = createMealPlanningService()
  
  const request = {
    days: 7,
    mealCount: 3,
    servingSize: 2,
    userProfile: mockUserProfile,
    pantryItems: mockPantryItems,
    targetCalories: 1800,
    macroTargets: mockMacroTargets,
    dietaryPreferences: ['healthy', 'balanced'],
    allergies: [],
    cuisinePreferences: ['mediterranean', 'asian', 'american']
  }

  try {
    console.log('Generating meal plan with pantry integration...')
    const result = await mealPlanningService.generateMealPlan(request)
    
    if (result.success) {
      console.log('✅ Meal plan generated successfully')
      
      // Check pantry validation
      if (result.validation && result.validation.pantryUsage) {
        const pantryUsage = result.validation.pantryUsage
        console.log(`📊 Pantry Usage: ${pantryUsage.usagePercentage}% (Target: 70%+)`)
        console.log(`📦 Items Used: ${pantryUsage.itemsUsed.length}/${mockPantryItems.filter(i => i.include_in_meal_plans).length}`)
        console.log(`✅ Used Items: ${pantryUsage.itemsUsed.join(', ')}`)
        
        if (pantryUsage.itemsUnused.length > 0) {
          console.log(`⚠️ Unused Items: ${pantryUsage.itemsUnused.join(', ')}`)
        }
        
        // Test that excluded items are not used
        const excludedItem = mockPantryItems.find(item => !item.include_in_meal_plans)
        if (excludedItem && pantryUsage.itemsUsed.includes(excludedItem.ingredient_name.toLowerCase())) {
          console.log('❌ ERROR: Excluded pantry item was used!')
        } else {
          console.log('✅ Excluded pantry items correctly ignored')
        }
        
        // Test pantry usage score
        if (pantryUsage.usagePercentage >= 70) {
          console.log('✅ Pantry usage target achieved!')
        } else {
          console.log('⚠️ Pantry usage below target')
        }
      }
      
      console.log(`🎯 Overall Score: ${result.validation?.overallScore || 'N/A'}/100`)
      
    } else {
      console.log('❌ Meal plan generation failed:', result.error)
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

async function testMealDiversity() {
  console.log('\n🎨 Testing Meal Diversity...')
  
  const mealPlanningService = createMealPlanningService()
  
  const request = {
    days: 7,
    mealCount: 3,
    servingSize: 2,
    userProfile: mockUserProfile,
    pantryItems: mockPantryItems,
    recentMealHistory: mockRecentMealHistory,
    targetCalories: 1800,
    macroTargets: mockMacroTargets,
    dietaryPreferences: ['healthy', 'varied'],
    allergies: [],
    cuisinePreferences: ['mediterranean', 'asian', 'mexican', 'american']
  }

  try {
    console.log('Generating meal plan with diversity requirements...')
    const result = await mealPlanningService.generateMealPlan(request)
    
    if (result.success) {
      console.log('✅ Meal plan generated successfully')
      
      // Check diversity validation
      if (result.validation && result.validation.diversity) {
        const diversity = result.validation.diversity
        console.log(`🎨 Diversity Score: ${diversity.diversityScore}/100`)
        console.log(`🥩 Protein Variety: ${diversity.proteinVariety.join(', ')} (${diversity.proteinVariety.length} types)`)
        console.log(`🌍 Cuisine Variety: ${diversity.cuisineVariety.join(', ')} (${diversity.cuisineVariety.length} styles)`)
        console.log(`👨‍🍳 Cooking Methods: ${diversity.cookingMethodVariety.join(', ')} (${diversity.cookingMethodVariety.length} methods)`)
        
        // Check for repeated meals
        if (diversity.repeatedMeals.length > 0) {
          console.log(`❌ Repeated Meals Found: ${diversity.repeatedMeals.join(', ')}`)
        } else {
          console.log('✅ No repeated meals detected')
        }
        
        // Check diversity issues
        if (diversity.issues.length > 0) {
          console.log('⚠️ Diversity Issues:')
          diversity.issues.forEach(issue => console.log(`   - ${issue}`))
        } else {
          console.log('✅ No diversity issues detected')
        }
        
        // Test diversity score
        if (diversity.diversityScore >= 80) {
          console.log('✅ Diversity target achieved!')
        } else {
          console.log('⚠️ Diversity below target')
        }
      }
      
      // Check recommendations
      if (result.validation && result.validation.recommendations) {
        console.log('\n💡 Recommendations:')
        result.validation.recommendations.forEach(rec => console.log(`   - ${rec}`))
      }
      
    } else {
      console.log('❌ Meal plan generation failed:', result.error)
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

async function testCombinedFeatures() {
  console.log('\n🔄 Testing Combined Pantry + Diversity Features...')
  
  const mealPlanningService = createMealPlanningService()
  
  const request = {
    days: 7,
    mealCount: 3,
    servingSize: 2,
    userProfile: mockUserProfile,
    pantryItems: mockPantryItems,
    recentMealHistory: mockRecentMealHistory,
    targetCalories: 1800,
    macroTargets: mockMacroTargets,
    dietaryPreferences: ['healthy', 'varied'],
    allergies: ['nuts'],
    cuisinePreferences: ['mediterranean', 'asian', 'mexican', 'american', 'italian']
  }

  try {
    console.log('Generating comprehensive meal plan...')
    const result = await mealPlanningService.generateMealPlan(request)
    
    if (result.success) {
      console.log('✅ Comprehensive meal plan generated successfully')
      
      if (result.validation) {
        const { pantryUsage, diversity, overallScore, recommendations } = result.validation
        
        console.log('\n📊 VALIDATION SUMMARY:')
        console.log(`🎯 Overall Score: ${overallScore}/100`)
        console.log(`📦 Pantry Usage: ${pantryUsage.usagePercentage}%`)
        console.log(`🎨 Diversity Score: ${diversity.diversityScore}/100`)
        
        // Success criteria
        const pantrySuccess = pantryUsage.usagePercentage >= 70
        const diversitySuccess = diversity.diversityScore >= 80
        const noRepeatedMeals = diversity.repeatedMeals.length === 0
        
        console.log('\n✅ SUCCESS CRITERIA:')
        console.log(`   Pantry Usage ≥70%: ${pantrySuccess ? '✅' : '❌'} (${pantryUsage.usagePercentage}%)`)
        console.log(`   Diversity Score ≥80: ${diversitySuccess ? '✅' : '❌'} (${diversity.diversityScore}/100)`)
        console.log(`   No Repeated Meals: ${noRepeatedMeals ? '✅' : '❌'}`)
        console.log(`   Overall Score ≥75: ${overallScore >= 75 ? '✅' : '❌'} (${overallScore}/100)`)
        
        if (pantrySuccess && diversitySuccess && noRepeatedMeals && overallScore >= 75) {
          console.log('\n🎉 ALL TESTS PASSED! Meal planning improvements are working correctly.')
        } else {
          console.log('\n⚠️ Some criteria not met. Review recommendations for improvements.')
        }
        
        if (recommendations.length > 0) {
          console.log('\n💡 RECOMMENDATIONS:')
          recommendations.forEach(rec => console.log(`   - ${rec}`))
        }
      }
      
    } else {
      console.log('❌ Comprehensive meal plan generation failed:', result.error)
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting CrewFlow Meal Planning Improvements Tests...')
  console.log('=' .repeat(60))
  
  await testPantryIntegration()
  await testMealDiversity()
  await testCombinedFeatures()
  
  console.log('\n' + '='.repeat(60))
  console.log('🏁 All tests completed!')
}

// Export for use in other test files
module.exports = {
  testPantryIntegration,
  testMealDiversity,
  testCombinedFeatures,
  runAllTests
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}
