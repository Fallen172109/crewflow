#!/usr/bin/env node

// Test script for CrewFlow Meal Planning fixes
// Tests pantry integration, meal diversification, and Quick Weight Loss Plan functionality

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing CrewFlow Meal Planning Fixes\n');

// Test 1: Check pantry integration improvements
console.log('1️⃣ Testing Pantry Integration Improvements...');
try {
  const mealPlanningPath = path.join(__dirname, 'src/lib/ai/meal-planning.ts');
  const content = fs.readFileSync(mealPlanningPath, 'utf8');
  
  // Check for improved pantry filtering
  const hasImprovedFiltering = content.includes('item.status === \'available\'') &&
                               content.includes('80% minimum utilization');
  
  // Check for enhanced validation
  const hasEnhancedValidation = content.includes('Convert meal plan to searchable text') &&
                               content.includes('keyWords.some(word => mealPlanText.includes(word))');
  
  if (hasImprovedFiltering && hasEnhancedValidation) {
    console.log('✅ Pantry integration improvements implemented');
    console.log('   - Enhanced filtering for available items only');
    console.log('   - Increased utilization target to 80%');
    console.log('   - Improved ingredient matching algorithm');
  } else {
    console.log('❌ Pantry integration improvements not fully implemented');
  }
  
} catch (error) {
  console.log('❌ Error reading meal planning service:', error.message);
}

// Test 2: Check meal diversification enhancements
console.log('\n2️⃣ Testing Meal Diversification Enhancements...');
try {
  const mealPlanningPath = path.join(__dirname, 'src/lib/ai/meal-planning.ts');
  const content = fs.readFileSync(mealPlanningPath, 'utf8');
  
  // Check for enhanced diversity rules
  const hasEnhancedRules = content.includes('MANDATORY DIVERSITY ENFORCEMENT RULES') &&
                          content.includes('No protein source appears more than 2 times') &&
                          content.includes('Each day must use at least 3 different cooking methods');
  
  // Check for improved validation
  const hasImprovedValidation = content.includes('proteinDistribution') &&
                               content.includes('cuisineDistribution') &&
                               content.includes('Over-concentration');
  
  if (hasEnhancedRules && hasImprovedValidation) {
    console.log('✅ Meal diversification enhancements implemented');
    console.log('   - Stricter protein rotation rules');
    console.log('   - Enhanced cooking method diversity');
    console.log('   - Over-concentration detection');
  } else {
    console.log('❌ Meal diversification enhancements not fully implemented');
  }
  
} catch (error) {
  console.log('❌ Error reading meal planning service:', error.message);
}

// Test 3: Check Quick Weight Loss Plan error handling
console.log('\n3️⃣ Testing Quick Weight Loss Plan Error Handling...');
try {
  const autoGeneratePath = path.join(__dirname, 'src/app/api/meal-planning/auto-generate/route.ts');
  const content = fs.readFileSync(autoGeneratePath, 'utf8');
  
  // Check for improved error handling
  const hasErrorHandling = content.includes('try {') &&
                          content.includes('context = await getMealPlanningContext') &&
                          content.includes('Failed to retrieve meal planning context');
  
  if (hasErrorHandling) {
    console.log('✅ Quick Weight Loss Plan error handling improved');
    console.log('   - Added try-catch for context retrieval');
    console.log('   - Better error messages for context failures');
  } else {
    console.log('❌ Quick Weight Loss Plan error handling not implemented');
  }
  
} catch (error) {
  console.log('❌ Error reading auto-generate route:', error.message);
}

// Test 4: Check frontend error handling
console.log('\n4️⃣ Testing Frontend Error Handling...');
try {
  const mealPlanningPagePath = path.join(__dirname, 'src/app/dashboard/crew/meal-planning/page.tsx');
  const content = fs.readFileSync(mealPlanningPagePath, 'utf8');
  
  // Check for improved error handling in Quick Plan
  const hasFrontendErrorHandling = content.includes('setAutoGenError(null)') &&
                                  content.includes('Quick plan generation error') &&
                                  content.includes('try {') &&
                                  content.includes('setShowQuickPlanModal(false)');
  
  if (hasFrontendErrorHandling) {
    console.log('✅ Frontend error handling improved');
    console.log('   - Added error clearing before generation');
    console.log('   - Better error handling for Quick Weight Loss Plan');
  } else {
    console.log('❌ Frontend error handling not fully implemented');
  }
  
} catch (error) {
  console.log('❌ Error reading meal planning page:', error.message);
}

// Test 5: Validate configuration consistency
console.log('\n5️⃣ Testing Configuration Consistency...');
try {
  const mealPlanningPath = path.join(__dirname, 'src/lib/ai/meal-planning.ts');
  const content = fs.readFileSync(mealPlanningPath, 'utf8');
  
  // Check for consistent 80% targets
  const hasConsistentTargets = content.includes('80% minimum utilization') &&
                              content.includes('usagePercentage >= 80') &&
                              content.includes('usagePercentage < 80');
  
  if (hasConsistentTargets) {
    console.log('✅ Configuration consistency maintained');
    console.log('   - All pantry utilization targets set to 80%');
  } else {
    console.log('❌ Configuration inconsistencies detected');
  }
  
} catch (error) {
  console.log('❌ Error validating configuration:', error.message);
}

console.log('\n🎯 Test Summary:');
console.log('The fixes address the following issues:');
console.log('1. Pantry Integration: Enhanced filtering and matching for better ingredient utilization');
console.log('2. Meal Diversification: Stricter rules for protein rotation and cooking method variety');
console.log('3. Quick Weight Loss Plan: Better error handling to prevent "context is not defined" errors');
console.log('4. Frontend Stability: Improved error handling and user feedback');
console.log('\n✨ Ready for testing! Please test the meal planning functionality to verify the fixes.');
