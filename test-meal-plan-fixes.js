// Test script to verify meal planning fixes
// Tests both the HTML error fix and ingredient list improvements

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Meal Planning Fixes\n');

// Test 1: Check for invalid HTML tags
console.log('1️⃣ Testing HTML Tag Fixes...');
try {
  const mealPlanDisplayPath = path.join(__dirname, 'src/components/meal-planning/MealPlanDisplay.tsx');
  const content = fs.readFileSync(mealPlanDisplayPath, 'utf8');
  
  // Check for invalid h7 tags
  const h7Matches = content.match(/<h7[^>]*>/g);
  if (h7Matches) {
    console.log('❌ Found invalid h7 tags:', h7Matches.length);
    h7Matches.forEach(match => console.log('   ', match));
  } else {
    console.log('✅ No invalid h7 tags found');
  }
  
  // Check for valid h6 tags (should be present)
  const h6Matches = content.match(/<h6[^>]*>/g);
  if (h6Matches && h6Matches.length >= 3) {
    console.log('✅ Found valid h6 tags:', h6Matches.length);
  } else {
    console.log('⚠️ Expected h6 tags not found or insufficient count');
  }
  
} catch (error) {
  console.log('❌ Error reading MealPlanDisplay component:', error.message);
}

// Test 2: Check meal planning service improvements
console.log('\n2️⃣ Testing Meal Planning Service...');
try {
  const mealPlanningServicePath = path.join(__dirname, 'src/lib/ai/meal-planning.ts');
  const content = fs.readFileSync(mealPlanningServicePath, 'utf8');
  
  // Check for improved ingredient lists
  const hasRealisticIngredients = content.includes('Greek yogurt') && 
                                  content.includes('Avocado Toast') && 
                                  content.includes('Quinoa Salad');
  
  if (hasRealisticIngredients) {
    console.log('✅ Found realistic ingredient examples in fallback meals');
  } else {
    console.log('❌ Realistic ingredients not found in fallback meals');
  }
  
  // Check for proper parameter passing
  const hasParameterPassing = content.includes('parseMealPlanResponse(responseText, request)') &&
                              content.includes('createStructuredMealPlan(responseText, request)');
  
  if (hasParameterPassing) {
    console.log('✅ Proper parameter passing implemented');
  } else {
    console.log('❌ Parameter passing not properly implemented');
  }
  
  // Check for days loop in structured meal plan
  const hasDaysLoop = content.includes('for (let i = 1; i <= days; i++)');
  
  if (hasDaysLoop) {
    console.log('✅ Days loop implemented for generating all requested days');
  } else {
    console.log('❌ Days loop not found - may only generate single day');
  }
  
} catch (error) {
  console.log('❌ Error reading meal planning service:', error.message);
}

// Test 3: Check generate route fix
console.log('\n3️⃣ Testing Generate Route Fix...');
try {
  const generateRoutePath = path.join(__dirname, 'src/app/api/meal-planning/generate/route.ts');
  const content = fs.readFileSync(generateRoutePath, 'utf8');
  
  // Check for corrected days parameter
  const hasCorrectDaysParam = content.includes('days: plan_duration_days || 7') &&
                              !content.includes('userProfile?.preferred_meal_count || 7');
  
  if (hasCorrectDaysParam) {
    console.log('✅ Days parameter correctly fixed (no longer uses preferred_meal_count)');
  } else {
    console.log('❌ Days parameter still incorrect or not fixed');
  }
  
} catch (error) {
  console.log('❌ Error reading generate route:', error.message);
}

// Test 4: Check quick plan enhancement
console.log('\n4️⃣ Testing Quick Plan Enhancement...');
try {
  const mealPlanningPagePath = path.join(__dirname, 'src/app/dashboard/crew/meal-planning/page.tsx');
  const content = fs.readFileSync(mealPlanningPagePath, 'utf8');
  
  // Check for dietary restrictions integration
  const hasDietaryIntegration = content.includes('dietaryRestrictions') &&
                                content.includes('ALLERGIES (must avoid)') &&
                                content.includes('Foods to avoid (dislikes)');
  
  if (hasDietaryIntegration) {
    console.log('✅ Quick plan now includes dietary restrictions and allergies');
  } else {
    console.log('❌ Dietary restrictions integration not found in quick plan');
  }
  
} catch (error) {
  console.log('❌ Error reading meal planning page:', error.message);
}

console.log('\n🎯 Test Summary:');
console.log('- HTML h7 tag errors should be fixed');
console.log('- Ingredient lists should show specific items instead of generic text');
console.log('- All 7 days should be generated in meal plans');
console.log('- Quick weight loss plans should respect user allergies and dislikes');
console.log('\n✨ Please test the application in the browser to verify these fixes work correctly!');
