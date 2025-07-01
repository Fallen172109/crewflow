// Calorie and Macro Calculator for Meal Planning
// Uses Mifflin-St Jeor equation for BMR and activity multipliers for TDEE

export interface PhysicalStats {
  weight_value: number
  weight_unit: 'kg' | 'lbs' | 'g' | 'oz' | 'stone'
  height_value: number
  height_unit: 'cm' | 'ft_in' | 'inches' | 'm'
  age?: number // Optional, can be calculated from birth date
  gender?: 'male' | 'female' | 'other'
}

export interface ActivityLevel {
  level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
  multiplier: number
  description: string
}

export interface Goal {
  type: 'weight_loss' | 'weight_gain' | 'muscle_building' | 'maintenance' | 'athletic_performance' | 'health_improvement'
  calorieAdjustment: number // Daily calorie adjustment from maintenance
  description: string
}

export interface WeightLossTimeline {
  targetWeightLoss: number // kg
  timelineWeeks: number
  weeklyWeightLoss: number // kg per week
  dailyCalorieDeficit: number
  isHealthy: boolean
  recommendations: string[]
  alternativeOptions?: {
    conservative: { weeks: number, weeklyLoss: number, deficit: number }
    moderate: { weeks: number, weeklyLoss: number, deficit: number }
    aggressive: { weeks: number, weeklyLoss: number, deficit: number }
  }
}

export interface MacroTargets {
  calories: number
  protein: number // grams
  carbs: number // grams
  fat: number // grams
  fiber: number // grams
}

export interface DietType {
  type: string
  proteinRatio: number // percentage of calories
  carbRatio: number // percentage of calories
  fatRatio: number // percentage of calories
  description: string
}

// Activity level definitions
export const ACTIVITY_LEVELS: Record<string, ActivityLevel> = {
  sedentary: {
    level: 'sedentary',
    multiplier: 1.2,
    description: 'Little or no exercise, desk job'
  },
  lightly_active: {
    level: 'lightly_active',
    multiplier: 1.375,
    description: 'Light exercise 1-3 days/week'
  },
  moderately_active: {
    level: 'moderately_active',
    multiplier: 1.55,
    description: 'Moderate exercise 3-5 days/week'
  },
  very_active: {
    level: 'very_active',
    multiplier: 1.725,
    description: 'Hard exercise 6-7 days/week'
  },
  extremely_active: {
    level: 'extremely_active',
    multiplier: 1.9,
    description: 'Very hard exercise, physical job'
  }
}

// Goal-based calorie adjustments
export const GOAL_ADJUSTMENTS: Record<string, Goal> = {
  weight_loss: {
    type: 'weight_loss',
    calorieAdjustment: -500, // 1 lb per week (0.45 kg per week)
    description: 'Moderate weight loss (0.5-1 kg/week)'
  },
  weight_gain: {
    type: 'weight_gain',
    calorieAdjustment: 300, // Lean weight gain
    description: 'Healthy weight gain (0.25-0.5 kg/week)'
  },
  muscle_building: {
    type: 'muscle_building',
    calorieAdjustment: 200, // Slight surplus for muscle growth
    description: 'Muscle building with minimal fat gain'
  },
  maintenance: {
    type: 'maintenance',
    calorieAdjustment: 0,
    description: 'Maintain current weight'
  },
  athletic_performance: {
    type: 'athletic_performance',
    calorieAdjustment: 100, // Slight surplus for performance
    description: 'Optimize for athletic performance'
  },
  health_improvement: {
    type: 'health_improvement',
    calorieAdjustment: -200, // Moderate deficit for health
    description: 'General health improvement'
  }
}

// Diet type macro distributions
export const DIET_TYPES: Record<string, DietType> = {
  balanced: {
    type: 'balanced',
    proteinRatio: 0.25, // 25% protein
    carbRatio: 0.45, // 45% carbs
    fatRatio: 0.30, // 30% fat
    description: 'Balanced macronutrient distribution'
  },
  high_protein: {
    type: 'high_protein',
    proteinRatio: 0.35,
    carbRatio: 0.35,
    fatRatio: 0.30,
    description: 'High protein for muscle building'
  },
  low_carb: {
    type: 'low_carb',
    proteinRatio: 0.30,
    carbRatio: 0.20,
    fatRatio: 0.50,
    description: 'Low carbohydrate diet'
  },
  keto: {
    type: 'keto',
    proteinRatio: 0.25,
    carbRatio: 0.05,
    fatRatio: 0.70,
    description: 'Ketogenic diet (very low carb)'
  },
  mediterranean: {
    type: 'mediterranean',
    proteinRatio: 0.20,
    carbRatio: 0.45,
    fatRatio: 0.35,
    description: 'Mediterranean diet pattern'
  },
  vegetarian: {
    type: 'vegetarian',
    proteinRatio: 0.20,
    carbRatio: 0.50,
    fatRatio: 0.30,
    description: 'Plant-based with dairy/eggs'
  },
  vegan: {
    type: 'vegan',
    proteinRatio: 0.18,
    carbRatio: 0.55,
    fatRatio: 0.27,
    description: 'Fully plant-based diet'
  }
}

// Convert weight to kg for calculations
export function convertWeightToKg(weight: number, unit: string): number {
  switch (unit) {
    case 'kg': return weight
    case 'lbs': return weight * 0.453592
    case 'g': return weight / 1000
    case 'oz': return weight * 0.0283495
    case 'stone': return weight * 6.35029
    default: return weight
  }
}

// Convert height to cm for calculations
export function convertHeightToCm(height: number, unit: string): number {
  switch (unit) {
    case 'cm': return height
    case 'm': return height * 100
    case 'inches': return height * 2.54
    case 'ft_in': 
      // Assume height is in format like 5.75 (5 feet 9 inches)
      const feet = Math.floor(height)
      const inches = (height - feet) * 12
      return (feet * 12 + inches) * 2.54
    default: return height
  }
}

// Calculate BMR using Mifflin-St Jeor equation
export function calculateBMR(stats: PhysicalStats, age: number = 30, gender: string = 'other'): number {
  const weightKg = convertWeightToKg(stats.weight_value, stats.weight_unit)
  const heightCm = convertHeightToCm(stats.height_value, stats.height_unit)
  
  // Mifflin-St Jeor equation
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age)
  
  // Gender adjustment
  if (gender === 'male') {
    bmr += 5
  } else if (gender === 'female') {
    bmr -= 161
  } else {
    // Use average for non-binary/other
    bmr -= 78
  }
  
  return Math.round(bmr)
}

// Calculate TDEE (Total Daily Energy Expenditure)
export function calculateTDEE(bmr: number, activityLevel: string): number {
  const activity = ACTIVITY_LEVELS[activityLevel]
  if (!activity) {
    throw new Error(`Invalid activity level: ${activityLevel}`)
  }
  
  return Math.round(bmr * activity.multiplier)
}

// Calculate goal-adjusted calories
export function calculateGoalCalories(tdee: number, goalType: string): number {
  const goal = GOAL_ADJUSTMENTS[goalType]
  if (!goal) {
    throw new Error(`Invalid goal type: ${goalType}`)
  }
  
  return Math.max(1200, tdee + goal.calorieAdjustment) // Minimum 1200 calories
}

// Calculate macro targets based on calories and diet type
export function calculateMacroTargets(calories: number, dietType: string = 'balanced'): MacroTargets {
  const diet = DIET_TYPES[dietType] || DIET_TYPES.balanced
  
  const proteinCalories = calories * diet.proteinRatio
  const carbCalories = calories * diet.carbRatio
  const fatCalories = calories * diet.fatRatio
  
  return {
    calories,
    protein: Math.round(proteinCalories / 4), // 4 calories per gram
    carbs: Math.round(carbCalories / 4), // 4 calories per gram
    fat: Math.round(fatCalories / 9), // 9 calories per gram
    fiber: Math.round(calories / 1000 * 14) // 14g per 1000 calories (recommended)
  }
}

// Main function to calculate complete nutritional targets
export function calculateNutritionalTargets(
  stats: PhysicalStats,
  activityLevel: string,
  goalType: string,
  dietType: string = 'balanced',
  age: number = 30,
  gender: string = 'other'
): MacroTargets {
  const bmr = calculateBMR(stats, age, gender)
  const tdee = calculateTDEE(bmr, activityLevel)
  const goalCalories = calculateGoalCalories(tdee, goalType)
  const macroTargets = calculateMacroTargets(goalCalories, dietType)
  
  return macroTargets
}

// Helper function to get readable descriptions
export function getActivityDescription(activityLevel: string): string {
  return ACTIVITY_LEVELS[activityLevel]?.description || 'Unknown activity level'
}

export function getGoalDescription(goalType: string): string {
  return GOAL_ADJUSTMENTS[goalType]?.description || 'Unknown goal'
}

export function getDietDescription(dietType: string): string {
  return DIET_TYPES[dietType]?.description || 'Unknown diet type'
}

// Validation functions
export function validatePhysicalStats(stats: PhysicalStats): string[] {
  const errors: string[] = []
  
  if (!stats.weight_value || stats.weight_value <= 0) {
    errors.push('Weight must be a positive number')
  }
  
  if (!stats.height_value || stats.height_value <= 0) {
    errors.push('Height must be a positive number')
  }
  
  // Reasonable ranges (converted to metric for validation)
  const weightKg = convertWeightToKg(stats.weight_value, stats.weight_unit)
  const heightCm = convertHeightToCm(stats.height_value, stats.height_unit)
  
  if (weightKg < 30 || weightKg > 300) {
    errors.push('Weight seems unrealistic (30-300 kg range)')
  }
  
  if (heightCm < 100 || heightCm > 250) {
    errors.push('Height seems unrealistic (100-250 cm range)')
  }
  
  return errors
}

// Weight Loss Timeline Calculator
export function calculateWeightLossTimeline(
  currentWeight: number, // kg
  targetWeight: number, // kg
  desiredTimelineWeeks: number,
  tdee: number
): WeightLossTimeline {
  const targetWeightLoss = currentWeight - targetWeight
  const weeklyWeightLoss = targetWeightLoss / desiredTimelineWeeks

  // 1 kg of fat = approximately 7700 calories
  const dailyCalorieDeficit = (weeklyWeightLoss * 7700) / 7

  // Health guidelines: 0.5-1 kg per week is safe, max 1.5 kg for very obese individuals
  const maxSafeWeeklyLoss = currentWeight > 100 ? 1.5 : 1.0
  const minSafeWeeklyLoss = 0.25

  const isHealthy = weeklyWeightLoss >= minSafeWeeklyLoss && weeklyWeightLoss <= maxSafeWeeklyLoss

  const recommendations: string[] = []

  if (weeklyWeightLoss > maxSafeWeeklyLoss) {
    recommendations.push('⚠️ This rate of weight loss may be too aggressive and could be unhealthy')
    recommendations.push('Consider extending your timeline for safer, more sustainable results')
  } else if (weeklyWeightLoss < minSafeWeeklyLoss) {
    recommendations.push('💡 This is a very gradual approach - consider a slightly faster rate for better motivation')
  } else {
    recommendations.push('✅ This is a healthy and sustainable rate of weight loss')
  }

  if (dailyCalorieDeficit > 1000) {
    recommendations.push('⚠️ Large calorie deficit may lead to muscle loss and metabolic slowdown')
    recommendations.push('Consider combining diet with exercise for better results')
  }

  // Calculate alternative options
  const alternativeOptions = {
    conservative: {
      weeks: Math.ceil(targetWeightLoss / 0.5),
      weeklyLoss: 0.5,
      deficit: (0.5 * 7700) / 7
    },
    moderate: {
      weeks: Math.ceil(targetWeightLoss / 0.75),
      weeklyLoss: 0.75,
      deficit: (0.75 * 7700) / 7
    },
    aggressive: {
      weeks: Math.ceil(targetWeightLoss / 1.0),
      weeklyLoss: 1.0,
      deficit: (1.0 * 7700) / 7
    }
  }

  return {
    targetWeightLoss,
    timelineWeeks: desiredTimelineWeeks,
    weeklyWeightLoss,
    dailyCalorieDeficit,
    isHealthy,
    recommendations,
    alternativeOptions
  }
}
