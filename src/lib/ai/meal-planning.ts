// Real AI Meal Planning Implementation
// Uses OpenAI/LangChain for intelligent meal planning with nutritional analysis

import { ChatOpenAI } from '@langchain/openai'
import { getAIConfig } from './config'

export interface MealPlanRequest {
  dietaryPreferences?: string[]
  allergies?: string[]
  cuisinePreferences?: string[]
  mealCount?: number
  days?: number
  budgetRange?: string
  cookingTime?: string
  servingSize?: number
  healthGoals?: string[]
  excludeIngredients?: string[]
  // Enhanced profile data
  userProfile?: UserMealProfile
  pantryItems?: PantryItem[]
  activityLevel?: string
  primaryGoal?: string
  targetCalories?: number
  macroTargets?: MacroTargets
  // Meal diversity support
  recentMealHistory?: {
    mealNames: string[]
    proteinSources: string[]
    cuisineStyles: string[]
    cookingMethods: string[]
    lastGeneratedDate?: string
  }
  // Auto-generation support
  enhancedPrompt?: string
}

export interface UserMealProfile {
  height_value?: number
  height_unit?: string
  weight_value?: number
  weight_unit?: string
  primary_goal: string
  activity_level: string
  household_size: number
  preferred_meal_count: number
  max_cooking_time_minutes: number
  budget_range: string
  target_date?: string
  timeline_duration_days?: number
}

export interface PantryItem {
  ingredient_name: string
  quantity?: number
  unit?: string
  category: string
  expiration_date?: string
  status: string
  include_in_meal_plans?: boolean
}

export interface MacroTargets {
  calories: number
  protein: number // grams
  carbs: number // grams
  fat: number // grams
  fiber?: number // grams
}

export interface MealPlanResponse {
  success: boolean
  mealPlan?: {
    overview: string
    dailyPlans: DailyMealPlan[]
    shoppingList: ShoppingList
    nutritionalSummary: NutritionalSummary
    cookingTips: string[]
  }
  tokensUsed: number
  latency: number
  model: string
  error?: string
}

export interface DailyMealPlan {
  day: string
  meals: {
    breakfast: Meal
    lunch: Meal
    dinner: Meal
    snacks?: Meal[]
  }
  dailyNutrition: NutritionalInfo
}

export interface Meal {
  name: string
  description: string
  ingredients: string[]
  instructions: string[]
  prepTime: string
  cookTime: string
  servings: number
  nutrition: NutritionalInfo
  tags: string[]
}

export interface NutritionalInfo {
  calories: number
  protein: string
  carbs: string
  fat: string
  fiber: string
  sugar: string
}

export interface ShoppingList {
  categories: {
    [category: string]: string[]
  }
  estimatedCost: string
  tips: string[]
}

export interface NutritionalSummary {
  dailyAverages: NutritionalInfo
  weeklyTotals: NutritionalInfo
  healthInsights: string[]
  recommendations: string[]
}

export class MealPlanningService {
  private llm: ChatOpenAI

  constructor() {
    const aiConfig = getAIConfig()
    this.llm = new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: aiConfig.openai.model,
      maxTokens: 4000,
      temperature: 0.7
    })
  }

  async generateMealPlan(request: MealPlanRequest): Promise<MealPlanResponse> {
    const startTime = Date.now()

    try {
      // Calculate personalized nutrition targets if profile data is available
      const enhancedRequest = this.enhanceRequestWithProfileData(request)

      const prompt = this.buildMealPlanPrompt(enhancedRequest)
      console.log('Generating meal plan with enhanced prompt')

      const response = await this.llm.invoke(prompt)
      const responseText = response.content as string

      // Parse the structured response
      const mealPlan = this.parseMealPlanResponse(responseText, enhancedRequest)

      // Validate pantry usage and meal diversity
      const pantryValidation = this.validatePantryUsage(mealPlan, enhancedRequest.pantryItems || [])
      const diversityValidation = this.validateMealDiversity(mealPlan, enhancedRequest.recentMealHistory)

      // Add validation results to meal plan
      mealPlan.validation = {
        pantryUsage: pantryValidation,
        diversity: diversityValidation,
        overallScore: Math.round((pantryValidation.score + diversityValidation.diversityScore) / 2),
        recommendations: this.generateRecommendations(pantryValidation, diversityValidation)
      }

      return {
        success: true,
        mealPlan,
        tokensUsed: response.usage?.totalTokens || 0,
        latency: Date.now() - startTime,
        model: this.llm.model,
        validation: mealPlan.validation
      }
    } catch (error) {
      console.error('Meal planning error:', error)
      return {
        success: false,
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: this.llm.model,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private enhanceRequestWithProfileData(request: MealPlanRequest): MealPlanRequest {
    const enhanced = { ...request }

    // Calculate nutrition targets if profile data is available
    if (request.userProfile) {
      const profile = request.userProfile

      // Calculate BMR and TDEE if height/weight are available
      if (profile.height_value && profile.weight_value) {
        const bmr = this.calculateBMR(profile)
        const tdee = this.calculateTDEE(bmr, profile.activity_level)

        // Adjust calories based on goal
        enhanced.targetCalories = this.adjustCaloriesForGoal(tdee, profile.primary_goal)

        // Calculate macro targets
        enhanced.macroTargets = this.calculateMacroTargets(enhanced.targetCalories, profile.primary_goal)
      }

      // Set cooking time preference from profile
      if (profile.max_cooking_time_minutes) {
        enhanced.cookingTime = `${profile.max_cooking_time_minutes} minutes maximum`
      }

      // Set serving size from household size
      enhanced.servingSize = profile.household_size

      // Set meal count from preferences
      enhanced.mealCount = profile.preferred_meal_count

      // Set budget range
      enhanced.budgetRange = profile.budget_range

      // Add primary goal to health goals
      if (profile.primary_goal && !enhanced.healthGoals?.includes(profile.primary_goal)) {
        enhanced.healthGoals = [...(enhanced.healthGoals || []), profile.primary_goal]
      }
    }

    return enhanced
  }

  private calculateBMR(profile: UserMealProfile): number {
    if (!profile.height_value || !profile.weight_value) return 0

    // Convert to metric if needed
    let heightCm = profile.height_value
    let weightKg = profile.weight_value

    // Height conversions to cm
    switch (profile.height_unit) {
      case 'm':
        heightCm = profile.height_value * 100
        break
      case 'ft_in':
        heightCm = profile.height_value * 30.48 // Assuming height_value is in feet
        break
      case 'inches':
        heightCm = profile.height_value * 2.54
        break
      case 'cm':
      default:
        heightCm = profile.height_value
        break
    }

    // Weight conversions to kg
    switch (profile.weight_unit) {
      case 'g':
        weightKg = profile.weight_value / 1000
        break
      case 'lbs':
        weightKg = profile.weight_value * 0.453592
        break
      case 'oz':
        weightKg = profile.weight_value * 0.0283495
        break
      case 'stone':
        weightKg = profile.weight_value * 6.35029
        break
      case 'kg':
      default:
        weightKg = profile.weight_value
        break
    }

    // Using Mifflin-St Jeor Equation (assuming average between male/female)
    // Male: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
    // Female: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
    // Using average age of 35 and gender-neutral calculation
    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * 35 - 78 // Average of male/female constants

    return Math.max(bmr, 1200) // Minimum safe BMR
  }

  private calculateTDEE(bmr: number, activityLevel: string): number {
    const activityMultipliers: Record<string, number> = {
      'sedentary': 1.2,
      'lightly_active': 1.375,
      'moderately_active': 1.55,
      'very_active': 1.725,
      'extremely_active': 1.9
    }

    return bmr * (activityMultipliers[activityLevel] || 1.375)
  }

  private adjustCaloriesForGoal(tdee: number, goal: string): number {
    switch (goal) {
      case 'weight_loss':
        return Math.max(tdee - 500, 1200) // 1 lb/week loss, minimum 1200 calories
      case 'weight_gain':
        return tdee + 300 // Moderate weight gain
      case 'muscle_building':
        return tdee + 200 // Slight surplus for muscle building
      case 'athletic_performance':
        return tdee + 100 // Small surplus for performance
      case 'maintenance':
      case 'health_improvement':
      default:
        return tdee
    }
  }

  private calculateMacroTargets(calories: number, goal: string): MacroTargets {
    let proteinPercent = 0.25 // Default 25%
    let fatPercent = 0.30 // Default 30%
    let carbPercent = 0.45 // Default 45%

    // Adjust macros based on goal
    switch (goal) {
      case 'muscle_building':
        proteinPercent = 0.30
        fatPercent = 0.25
        carbPercent = 0.45
        break
      case 'weight_loss':
        proteinPercent = 0.30
        fatPercent = 0.25
        carbPercent = 0.45
        break
      case 'athletic_performance':
        proteinPercent = 0.20
        fatPercent = 0.25
        carbPercent = 0.55
        break
    }

    return {
      calories,
      protein: Math.round((calories * proteinPercent) / 4), // 4 calories per gram
      carbs: Math.round((calories * carbPercent) / 4), // 4 calories per gram
      fat: Math.round((calories * fatPercent) / 9), // 9 calories per gram
      fiber: Math.round(calories / 1000 * 14) // 14g per 1000 calories (recommended)
    }
  }

  private buildMealPlanPrompt(request: MealPlanRequest): string {
    // If enhanced prompt is provided (for auto-generation), use it directly
    if (request.enhancedPrompt) {
      return request.enhancedPrompt
    }

    const days = request.days || 7
    const mealCount = request.mealCount || 3
    const servingSize = request.servingSize || 2

    let prompt = `You are a professional nutritionist and meal planning expert. Create a comprehensive ${days}-day meal plan with the following requirements:

**DIETARY REQUIREMENTS:**
- Dietary Preferences: ${request.dietaryPreferences?.join(', ') || 'None specified'}
- Allergies/Restrictions: ${request.allergies?.join(', ') || 'None'}
- Cuisine Preferences: ${request.cuisinePreferences?.join(', ') || 'Varied'}
- Exclude Ingredients: ${request.excludeIngredients?.join(', ') || 'None'}

**MEAL SPECIFICATIONS:**
- Number of days: ${days}
- Meals per day: ${mealCount} (breakfast, lunch, dinner${mealCount > 3 ? ', snacks' : ''})
- Serving size: ${servingSize} people
- Cooking time preference: ${request.cookingTime || 'Varied (15-60 minutes)'}
- Budget range: ${request.budgetRange || 'Moderate'}

**HEALTH GOALS:**
${request.healthGoals?.join(', ') || 'Balanced nutrition and variety'}`

    // Add personalized nutrition targets if available
    if (request.targetCalories && request.macroTargets) {
      prompt += `

**PERSONALIZED NUTRITION TARGETS (Daily):**
- Target Calories: ${request.targetCalories}
- Protein: ${request.macroTargets.protein}g
- Carbohydrates: ${request.macroTargets.carbs}g
- Fat: ${request.macroTargets.fat}g
- Fiber: ${request.macroTargets.fiber}g (minimum)

Please ensure each day's meals collectively meet these nutritional targets while maintaining variety and taste.`
    }

    // Add user profile context if available
    if (request.userProfile) {
      const profile = request.userProfile
      prompt += `

**USER PROFILE CONTEXT:**
- Primary Goal: ${profile.primary_goal}
- Activity Level: ${profile.activity_level}
- Household Size: ${profile.household_size} people
- Max Cooking Time: ${profile.max_cooking_time_minutes} minutes per meal
- Budget Preference: ${profile.budget_range}`

      if (profile.timeline_duration_days) {
        prompt += `
- Timeline: ${profile.timeline_duration_days} days to achieve goal`
      }
    }

    // Add intelligent pantry integration if available
    if (request.pantryItems && request.pantryItems.length > 0) {
      // Filter only items included in meal plans (default to true if not specified)
      const includedItems = request.pantryItems.filter(item => item.include_in_meal_plans !== false && item.status === 'available')

      if (includedItems.length > 0) {
        // Categorize items by expiration urgency
        const now = new Date()
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        const expiringUrgent = includedItems.filter(item => {
          if (!item.expiration_date) return false
          const expDate = new Date(item.expiration_date)
          return expDate <= threeDaysFromNow && expDate > now
        })

        const expiringSoon = includedItems.filter(item => {
          if (!item.expiration_date) return false
          const expDate = new Date(item.expiration_date)
          return expDate <= weekFromNow && expDate > threeDaysFromNow
        })

        const stableItems = includedItems.filter(item => {
          if (!item.expiration_date) return true
          const expDate = new Date(item.expiration_date)
          return expDate > weekFromNow
        })

        const pantryByCategory = includedItems.reduce((acc: any, item) => {
          if (!acc[item.category]) acc[item.category] = []
          acc[item.category].push(`${item.ingredient_name}${item.quantity ? ` (${item.quantity}${item.unit || ''})` : ''}`)
          return acc
        }, {})

        // Calculate pantry utilization target - be more aggressive
        const totalPantryItems = includedItems.length
        const targetUtilization = Math.max(Math.ceil(totalPantryItems * 0.8), Math.min(totalPantryItems, 3)) // Use at least 80% or minimum 3 items

        prompt += `

**🎯 CRITICAL PANTRY INTEGRATION REQUIREMENT:**
You MUST prioritize using these ${totalPantryItems} available ingredients to minimize waste and maximize existing inventory utilization.

**MANDATORY UTILIZATION TARGET: Use at least ${targetUtilization} out of ${totalPantryItems} pantry items (80% minimum utilization)**

**PANTRY INTEGRATION RULES:**
1. EVERY MEAL must incorporate at least 1-2 pantry ingredients where possible
2. Prioritize recipes that use MULTIPLE pantry ingredients in a single dish
3. When suggesting substitutions, always check pantry first
4. Clearly mark which pantry items are used in each recipe`

        // Urgent expiring items get highest priority
        if (expiringUrgent.length > 0) {
          prompt += `

🚨 **CRITICAL - MUST USE FIRST (expires within 3 days):**
${expiringUrgent.map(item => `- ${item.ingredient_name}${item.quantity ? ` (${item.quantity}${item.unit || ''})` : ''} - expires ${new Date(item.expiration_date!).toLocaleDateString()}`).join('\n')}
**MANDATORY: These ingredients MUST be incorporated in Days 1-2 of the meal plan. Failure to use expiring items is unacceptable.**`
        }

        // Soon expiring items get medium priority
        if (expiringSoon.length > 0) {
          prompt += `

⚠️ **HIGH PRIORITY - USE EARLY (within 1 week):**
${expiringSoon.map(item => `- ${item.ingredient_name}${item.quantity ? ` (${item.quantity}${item.unit || ''})` : ''} - expires ${new Date(item.expiration_date!).toLocaleDateString()}`).join('\n')}
**REQUIRED: These ingredients must be used in the first 3-4 days of the meal plan**`
        }

        // Show all available ingredients by category
        prompt += `

📦 **AVAILABLE PANTRY INVENTORY BY CATEGORY:**`
        Object.entries(pantryByCategory).forEach(([category, items]: [string, any]) => {
          prompt += `
- ${category.replace('_', ' ').toUpperCase()}: ${items.join(', ')}`
        })

        prompt += `

**🔥 MANDATORY PANTRY OPTIMIZATION REQUIREMENTS:**
1. **MUST USE AT LEAST ${targetUtilization} PANTRY ITEMS** - This is not optional
2. **PRIORITIZE MULTI-INGREDIENT PANTRY RECIPES** - Create meals that use 3+ pantry ingredients together
3. **MANDATORY SUBSTITUTION RULE** - Replace shopping list items with pantry equivalents whenever possible
4. **QUANTITY OPTIMIZATION** - Use up partial quantities and opened packages first
5. **BATCH COOKING REQUIREMENT** - Use pantry staples for meal prep efficiency across multiple days
6. **WASTE PREVENTION** - Every expiring item must be used before its expiration date

**PANTRY USAGE VALIDATION:**
At the end of your meal plan, you MUST include a "Pantry Usage Summary" section that lists:
- Total pantry items used: X out of ${totalPantryItems} (X% utilization)
- Specific pantry items incorporated and in which meals
- Any pantry items not used and why
- Confirmation that all expiring items are used within their timeframe`
      }

      prompt += `

**CRITICAL PANTRY INTEGRATION REQUIREMENT:**
Every meal plan MUST maximize pantry ingredient usage. For each recipe, clearly indicate which pantry items are being used and prioritize recipes that incorporate multiple pantry ingredients. This is mandatory, not optional.`
    }

    // Add meal diversity requirements based on recent meal history
    if (request.recentMealHistory) {
      const history = request.recentMealHistory
      const hasRecentHistory = history.mealNames.length > 0 || history.proteinSources.length > 0

      prompt += `

**🎯 MANDATORY MEAL DIVERSITY & ANTI-REPETITION REQUIREMENTS:**`

      if (hasRecentHistory) {
        prompt += `

**RECENT MEAL HISTORY TO AVOID:**
You MUST NOT repeat any of these recently used elements:`

        if (history.mealNames.length > 0) {
          prompt += `
- **Recent Meal Names**: ${history.mealNames.slice(0, 15).join(', ')}
  **RULE**: Do not create meals with identical or very similar names`
        }

        if (history.proteinSources.length > 0) {
          prompt += `
- **Recent Protein Sources**: ${history.proteinSources.join(', ')}
  **RULE**: Prioritize different protein sources and limit repetition`
        }

        if (history.cuisineStyles.length > 0) {
          prompt += `
- **Recent Cuisine Styles**: ${history.cuisineStyles.join(', ')}
  **RULE**: Explore different cuisine styles to avoid monotony`
        }

        if (history.cookingMethods.length > 0) {
          prompt += `
- **Recent Cooking Methods**: ${history.cookingMethods.join(', ')}
  **RULE**: Vary cooking techniques across the meal plan`
        }

        if (history.lastGeneratedDate) {
          prompt += `
- **Last Generated**: ${new Date(history.lastGeneratedDate).toLocaleDateString()}
  **RULE**: Ensure this new plan feels fresh and different`
        }
      }

      prompt += `

**MANDATORY DIVERSITY ENFORCEMENT RULES:**
1. **ZERO REPEATED MAIN DISHES** - Each meal must be completely unique within the ${days}-day period
2. **STRICT PROTEIN ROTATION** - Use different protein sources across days:
   - Day 1-2: Primary protein (e.g., chicken, fish)
   - Day 3-4: Secondary protein (e.g., beef, pork, plant-based)
   - Day 5-7: Tertiary proteins (eggs, legumes, seafood, etc.)
   - RULE: No protein source appears more than 2 times in the entire plan
3. **COOKING METHOD DIVERSITY** - Mandatory rotation of cooking techniques:
   - Required methods: baked, grilled, stir-fried, steamed, pan-seared, slow-cooked, roasted, sautéed
   - RULE: No cooking method used more than 2 times per day
   - RULE: Each day must use at least 3 different cooking methods
4. **CUISINE STYLE ROTATION** - Mandatory cultural diversity:
   - Required styles: Mediterranean, Asian, Mexican, Italian, American, Middle Eastern, Indian
   - RULE: No cuisine style repeated on consecutive days
   - RULE: Each cuisine style used maximum 2 times in the entire plan
   - Rule: No more than 2 consecutive days with the same cuisine style
5. **MEAL PATTERN PREVENTION** - Avoid repetitive breakfast/lunch/dinner patterns
6. **INGREDIENT DIVERSITY** - Use different vegetables, grains, and seasonings daily

**DIVERSITY VALIDATION REQUIREMENT:**
Include a "Meal Diversity Analysis" section showing:
- Protein sources used per day
- Cooking methods distribution
- Cuisine styles represented
- Confirmation of no repeated main dishes
- Variety score (aim for 90%+ diversity)`
    }

    prompt += `

Please provide a detailed response in the following JSON-like structure:

{
  "overview": "Brief overview of the meal plan approach and nutritional philosophy",
  "dailyPlans": [
    {
      "day": "Day 1",
      "meals": {
        "breakfast": {
          "name": "Meal name",
          "description": "Brief description",
          "ingredients": ["ingredient 1", "ingredient 2"],
          "instructions": ["step 1", "step 2"],
          "prepTime": "10 minutes",
          "cookTime": "15 minutes",
          "servings": ${servingSize},
          "nutrition": {
            "calories": 400,
            "protein": "20g",
            "carbs": "45g",
            "fat": "15g",
            "fiber": "8g",
            "sugar": "10g"
          },
          "tags": ["healthy", "quick", "vegetarian"]
        },
        "lunch": { /* same structure */ },
        "dinner": { /* same structure */ }
      },
      "dailyNutrition": {
        "calories": 1800,
        "protein": "90g",
        "carbs": "200g",
        "fat": "70g",
        "fiber": "30g",
        "sugar": "50g"
      }
    }
    // ... repeat for all days
  ],
  "shoppingList": {
    "categories": {
      "Proteins": ["chicken breast", "eggs"],
      "Vegetables": ["spinach", "tomatoes"],
      "Grains": ["quinoa", "brown rice"],
      "Dairy": ["Greek yogurt", "cheese"],
      "Pantry": ["olive oil", "spices"]
    },
    "estimatedCost": "$80-120 for ${days} days",
    "tips": ["Buy organic when possible", "Shop seasonal produce"]
  },
  "nutritionalSummary": {
    "dailyAverages": {
      "calories": 1800,
      "protein": "90g",
      "carbs": "200g",
      "fat": "70g",
      "fiber": "30g",
      "sugar": "50g"
    },
    "weeklyTotals": {
      "calories": 12600,
      "protein": "630g",
      "carbs": "1400g",
      "fat": "490g",
      "fiber": "210g",
      "sugar": "350g"
    },
    "healthInsights": ["High in fiber for digestive health", "Balanced macronutrients"],
    "recommendations": ["Stay hydrated", "Consider meal prep on Sundays"]
  },
  "cookingTips": ["Prep vegetables in advance", "Use herbs for flavor without calories"]
}

CRITICAL REQUIREMENTS:
1. Generate exactly ${days} days of meal plans (Day 1 through Day ${days})
2. Each day must include ${mealCount} complete meals with full details
3. **MANDATORY DIVERSITY**: No repeated main dishes, varied proteins, cooking methods, and cuisines
4. **MANDATORY PANTRY USAGE**: Achieve minimum 70% utilization of available pantry items
5. Nutritionally balanced and aligned with specified targets
6. Realistic and achievable for home cooking within time constraints
7. Cost-effective within the specified budget range
8. Strictly aligned with dietary preferences and restrictions
9. Include accurate nutritional information for each meal and daily totals
10. Provide clear, step-by-step cooking instructions
11. **ANTI-REPETITION**: Avoid recently used meal names, proteins, and cooking styles
12. Include required validation sections (Pantry Usage Summary + Meal Diversity Analysis)

Focus on creating delicious, healthy meals that promote the specified health goals while being practical for everyday cooking. The response must include all ${days} days - incomplete meal plans are not acceptable.`

    return prompt
  }

  private parseMealPlanResponse(responseText: string, request: MealPlanRequest): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        let jsonText = jsonMatch[0]

        // Clean up common JSON formatting issues from AI responses
        // Remove comments (// style)
        jsonText = jsonText.replace(/\/\/.*$/gm, '')

        // Remove trailing commas before closing braces/brackets
        jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1')

        // Try to parse the cleaned JSON
        return JSON.parse(jsonText)
      }

      // If no JSON found, create a structured response from the text
      return this.createStructuredMealPlan(responseText, request)
    } catch (error) {
      console.error('Error parsing meal plan response:', error)
      return this.createFallbackMealPlan(responseText, request)
    }
  }

  // Validate pantry usage in generated meal plan
  private validatePantryUsage(mealPlan: any, pantryItems: PantryItem[]): {
    usagePercentage: number
    itemsUsed: string[]
    itemsUnused: string[]
    score: number
  } {
    if (!pantryItems || pantryItems.length === 0) {
      return { usagePercentage: 0, itemsUsed: [], itemsUnused: [], score: 100 }
    }

    // Filter only items that should be included in meal plans and are available
    const availableItems = pantryItems.filter(item =>
      item.include_in_meal_plans !== false && item.status === 'available'
    )

    if (availableItems.length === 0) {
      return { usagePercentage: 0, itemsUsed: [], itemsUnused: [], score: 100 }
    }

    const availableItemNames = availableItems.map(item => item.ingredient_name.toLowerCase())
    const itemsUsed: string[] = []
    const itemsUnused: string[] = [...availableItemNames]

    // Convert meal plan to searchable text for better matching
    const mealPlanText = JSON.stringify(mealPlan).toLowerCase()

    // Check each pantry item for usage with improved matching
    availableItemNames.forEach(pantryItem => {
      const itemWords = pantryItem.split(' ')
      let isUsed = false

      // Check for exact match first
      if (mealPlanText.includes(pantryItem)) {
        isUsed = true
      } else {
        // Check for partial matches with key words (for compound ingredients)
        const keyWords = itemWords.filter(word => word.length > 3) // Only significant words
        if (keyWords.length > 0 && keyWords.some(word => mealPlanText.includes(word))) {
          isUsed = true
        }
      }

      if (isUsed && !itemsUsed.includes(pantryItem)) {
        itemsUsed.push(pantryItem)
        const index = itemsUnused.indexOf(pantryItem)
        if (index > -1) itemsUnused.splice(index, 1)
      }
    })

    const usagePercentage = availableItems.length > 0 ? (itemsUsed.length / availableItems.length) * 100 : 0
    const score = usagePercentage >= 80 ? 100 : Math.max(0, usagePercentage * 1.25) // Scale to 100 at 80%

    return {
      usagePercentage: Math.round(usagePercentage),
      itemsUsed,
      itemsUnused,
      score: Math.round(score)
    }
  }

  // Validate meal diversity in generated meal plan
  private validateMealDiversity(mealPlan: any, recentMealHistory?: any): {
    diversityScore: number
    proteinVariety: string[]
    cuisineVariety: string[]
    cookingMethodVariety: string[]
    repeatedMeals: string[]
    issues: string[]
    proteinDistribution: { [key: string]: number }
    cuisineDistribution: { [key: string]: number }
    cookingMethodDistribution: { [key: string]: number }
  } {
    const proteinVariety: string[] = []
    const cuisineVariety: string[] = []
    const cookingMethodVariety: string[] = []
    const mealNames: string[] = []
    const repeatedMeals: string[] = []
    const issues: string[] = []
    const proteinDistribution: { [key: string]: number } = {}
    const cuisineDistribution: { [key: string]: number } = {}
    const cookingMethodDistribution: { [key: string]: number } = {}

    // Extract diversity metrics from meal plan
    if (mealPlan.dailyPlans) {
      mealPlan.dailyPlans.forEach((day: any) => {
        if (day.meals) {
          Object.values(day.meals).forEach((meal: any) => {
            if (meal && typeof meal === 'object') {
              // Track meal names for repetition detection
              if (meal.name) {
                const mealName = meal.name.toLowerCase()
                if (mealNames.includes(mealName)) {
                  repeatedMeals.push(meal.name)
                } else {
                  mealNames.push(mealName)
                }
              }

              // Extract protein sources with distribution tracking
              if (meal.ingredients && Array.isArray(meal.ingredients)) {
                meal.ingredients.forEach((ingredient: string) => {
                  const lowerIngredient = ingredient.toLowerCase()
                  let proteinType = ''

                  if (lowerIngredient.includes('chicken')) proteinType = 'chicken'
                  else if (lowerIngredient.includes('beef')) proteinType = 'beef'
                  else if (lowerIngredient.includes('pork')) proteinType = 'pork'
                  else if (lowerIngredient.includes('fish') || lowerIngredient.includes('salmon') || lowerIngredient.includes('tuna')) proteinType = 'fish'
                  else if (lowerIngredient.includes('shrimp') || lowerIngredient.includes('seafood')) proteinType = 'seafood'
                  else if (lowerIngredient.includes('egg')) proteinType = 'eggs'
                  else if (lowerIngredient.includes('tofu') || lowerIngredient.includes('tempeh')) proteinType = 'plant-based'
                  else if (lowerIngredient.includes('beans') || lowerIngredient.includes('lentils') || lowerIngredient.includes('chickpeas')) proteinType = 'legumes'
                  else if (lowerIngredient.includes('turkey')) proteinType = 'turkey'

                  if (proteinType) {
                    if (!proteinVariety.includes(proteinType)) proteinVariety.push(proteinType)
                    proteinDistribution[proteinType] = (proteinDistribution[proteinType] || 0) + 1
                  }
                })
              }

              // Extract cuisine styles from tags and meal names with distribution tracking
              const mealText = `${meal.name || ''} ${meal.tags?.join(' ') || ''}`.toLowerCase()
              let cuisineType = ''

              if (mealText.includes('italian') || mealText.includes('pasta') || mealText.includes('pizza')) cuisineType = 'italian'
              else if (mealText.includes('mexican') || mealText.includes('taco') || mealText.includes('burrito')) cuisineType = 'mexican'
              else if (mealText.includes('asian') || mealText.includes('stir') || mealText.includes('soy')) cuisineType = 'asian'
              else if (mealText.includes('mediterranean') || mealText.includes('greek') || mealText.includes('olive')) cuisineType = 'mediterranean'
              else if (mealText.includes('indian') || mealText.includes('curry') || mealText.includes('masala')) cuisineType = 'indian'
              else if (mealText.includes('thai') || mealText.includes('pad')) cuisineType = 'thai'
              else if (mealText.includes('american') || mealText.includes('bbq') || mealText.includes('burger')) cuisineType = 'american'
              else if (mealText.includes('middle eastern') || mealText.includes('hummus') || mealText.includes('falafel')) cuisineType = 'middle-eastern'

              if (cuisineType) {
                if (!cuisineVariety.includes(cuisineType)) cuisineVariety.push(cuisineType)
                cuisineDistribution[cuisineType] = (cuisineDistribution[cuisineType] || 0) + 1
              }

              // Extract cooking methods from instructions and meal names with distribution tracking
              const cookingText = `${meal.instructions?.join(' ') || ''} ${meal.name || ''}`.toLowerCase()
              let cookingMethod = ''

              if (cookingText.includes('bake') || cookingText.includes('baked')) cookingMethod = 'baked'
              else if (cookingText.includes('grill') || cookingText.includes('grilled')) cookingMethod = 'grilled'
              else if (cookingText.includes('stir') || cookingText.includes('stir-fry')) cookingMethod = 'stir-fried'
              else if (cookingText.includes('steam') || cookingText.includes('steamed')) cookingMethod = 'steamed'
              else if (cookingText.includes('roast') || cookingText.includes('roasted')) cookingMethod = 'roasted'
              else if (cookingText.includes('sauté') || cookingText.includes('pan-seared')) cookingMethod = 'sautéed'
              else if (cookingText.includes('slow cook') || cookingText.includes('braised')) cookingMethod = 'slow-cooked'
              else if (cookingText.includes('fried') || cookingText.includes('frying')) cookingMethod = 'fried'

              if (cookingMethod) {
                if (!cookingMethodVariety.includes(cookingMethod)) cookingMethodVariety.push(cookingMethod)
                cookingMethodDistribution[cookingMethod] = (cookingMethodDistribution[cookingMethod] || 0) + 1
              }
            }
          })
        }
      })
    }

    // Check for issues with enhanced criteria
    if (repeatedMeals.length > 0) {
      issues.push(`Repeated meals detected: ${repeatedMeals.join(', ')}`)
    }
    if (proteinVariety.length < 4) {
      issues.push(`Limited protein variety (${proteinVariety.length}/4+ types needed)`)
    }
    if (cuisineVariety.length < 3) {
      issues.push(`Limited cuisine variety (${cuisineVariety.length}/3+ styles needed)`)
    }
    if (cookingMethodVariety.length < 4) {
      issues.push(`Limited cooking method variety (${cookingMethodVariety.length}/4+ methods needed)`)
    }

    // Check for over-concentration of any single element
    Object.entries(proteinDistribution).forEach(([protein, count]) => {
      if (count > 3) {
        issues.push(`Over-concentration of ${protein} protein (${count} times)`)
      }
    })

    Object.entries(cuisineDistribution).forEach(([cuisine, count]) => {
      if (count > 2) {
        issues.push(`Over-concentration of ${cuisine} cuisine (${count} times)`)
      }
    })

    // Check against recent meal history
    if (recentMealHistory) {
      const recentMealNames = recentMealHistory.mealNames || []
      const conflictingMeals = mealNames.filter(meal => recentMealNames.includes(meal))
      if (conflictingMeals.length > 0) {
        issues.push(`Meals conflict with recent history: ${conflictingMeals.join(', ')}`)
      }
    }

    // Calculate enhanced diversity score
    let diversityScore = 100
    diversityScore -= repeatedMeals.length * 25 // -25 per repeated meal (more severe)
    diversityScore -= Math.max(0, (4 - proteinVariety.length) * 8) // -8 per missing protein type (need 4+)
    diversityScore -= Math.max(0, (3 - cuisineVariety.length) * 12) // -12 per missing cuisine (need 3+)
    diversityScore -= Math.max(0, (4 - cookingMethodVariety.length) * 8) // -8 per missing cooking method (need 4+)

    // Penalize over-concentration
    Object.values(proteinDistribution).forEach(count => {
      if (count > 3) diversityScore -= (count - 3) * 10
    })
    Object.values(cuisineDistribution).forEach(count => {
      if (count > 2) diversityScore -= (count - 2) * 15
    })

    diversityScore = Math.max(0, diversityScore)

    return {
      diversityScore: Math.round(diversityScore),
      proteinVariety,
      cuisineVariety,
      cookingMethodVariety,
      repeatedMeals,
      issues,
      proteinDistribution,
      cuisineDistribution,
      cookingMethodDistribution
    }
  }

  // Generate recommendations based on validation results
  private generateRecommendations(pantryValidation: any, diversityValidation: any): string[] {
    const recommendations: string[] = []

    // Pantry usage recommendations
    if (pantryValidation.usagePercentage < 80) {
      recommendations.push(`Increase pantry usage: Currently using ${pantryValidation.usagePercentage}% of available items. Target: 80%+`)
      if (pantryValidation.itemsUnused.length > 0) {
        recommendations.push(`Consider incorporating: ${pantryValidation.itemsUnused.slice(0, 5).join(', ')}`)
      }
    }

    // Diversity recommendations
    if (diversityValidation.diversityScore < 80) {
      recommendations.push(`Improve meal diversity: Current score ${diversityValidation.diversityScore}/100`)
    }

    if (diversityValidation.repeatedMeals.length > 0) {
      recommendations.push(`Avoid repeated meals: ${diversityValidation.repeatedMeals.join(', ')}`)
    }

    if (diversityValidation.proteinVariety.length < 3) {
      recommendations.push(`Add more protein variety: Currently using ${diversityValidation.proteinVariety.join(', ')}`)
    }

    if (diversityValidation.cuisineVariety.length < 2) {
      recommendations.push(`Explore different cuisines: Currently ${diversityValidation.cuisineVariety.join(', ')}`)
    }

    if (diversityValidation.issues.length > 0) {
      recommendations.push(...diversityValidation.issues.map(issue => `Address: ${issue}`))
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Excellent meal plan! Good pantry usage and diversity.')
    }

    return recommendations
  }

  private createStructuredMealPlan(responseText: string, request: MealPlanRequest): any {
    // Create a basic structured meal plan from unstructured text
    const days = request.days || 7
    const servingSize = request.servingSize || 2

    // Generate daily plans for the requested number of days
    const dailyPlans = []

    // Sample meal variations for different days
    const breakfastOptions = [
      {
        name: "Greek Yogurt Parfait",
        ingredients: ["1 cup Greek yogurt", "1/2 cup mixed berries", "2 tbsp granola", "1 tbsp honey", "1 tbsp chopped almonds"],
        instructions: ["Layer yogurt in bowl", "Add berries and granola", "Drizzle with honey", "Top with almonds"]
      },
      {
        name: "Avocado Toast",
        ingredients: ["2 slices whole grain bread", "1 ripe avocado", "2 eggs", "1 tbsp olive oil", "Salt and pepper to taste"],
        instructions: ["Toast bread", "Mash avocado with salt and pepper", "Fry eggs in olive oil", "Spread avocado on toast", "Top with eggs"]
      },
      {
        name: "Oatmeal Bowl",
        ingredients: ["1/2 cup rolled oats", "1 cup milk", "1 banana sliced", "2 tbsp peanut butter", "1 tsp cinnamon"],
        instructions: ["Cook oats with milk", "Stir in peanut butter", "Top with banana slices", "Sprinkle with cinnamon"]
      }
    ]

    const lunchOptions = [
      {
        name: "Quinoa Salad",
        ingredients: ["1 cup cooked quinoa", "1/2 cup chickpeas", "1 cucumber diced", "1/4 cup feta cheese", "2 tbsp olive oil", "1 tbsp lemon juice"],
        instructions: ["Mix quinoa and chickpeas", "Add diced cucumber", "Crumble feta on top", "Whisk oil and lemon", "Dress salad and toss"]
      },
      {
        name: "Chicken Wrap",
        ingredients: ["1 large tortilla", "4 oz grilled chicken breast", "2 cups mixed greens", "1/4 avocado", "2 tbsp hummus"],
        instructions: ["Warm tortilla", "Spread hummus", "Add chicken and greens", "Slice avocado and add", "Roll tightly and slice"]
      },
      {
        name: "Vegetable Soup",
        ingredients: ["2 cups vegetable broth", "1/2 cup diced tomatoes", "1/2 cup mixed vegetables", "1/4 cup white beans", "1 tsp herbs"],
        instructions: ["Heat broth in pot", "Add tomatoes and vegetables", "Simmer 15 minutes", "Add beans and herbs", "Season to taste"]
      }
    ]

    const dinnerOptions = [
      {
        name: "Baked Salmon",
        ingredients: ["6 oz salmon fillet", "1 cup broccoli", "1/2 cup brown rice", "1 tbsp olive oil", "1 lemon", "Garlic and herbs"],
        instructions: ["Preheat oven to 400°F", "Season salmon with herbs", "Steam broccoli", "Cook rice", "Bake salmon 15 minutes", "Serve with lemon"]
      },
      {
        name: "Stir-Fry",
        ingredients: ["4 oz chicken breast", "2 cups mixed vegetables", "1/2 cup brown rice", "2 tbsp soy sauce", "1 tbsp sesame oil", "1 tsp ginger"],
        instructions: ["Cook rice", "Heat oil in wok", "Stir-fry chicken", "Add vegetables", "Season with soy sauce and ginger", "Serve over rice"]
      },
      {
        name: "Pasta Primavera",
        ingredients: ["2 oz whole wheat pasta", "1 cup mixed vegetables", "2 tbsp olive oil", "1/4 cup parmesan", "2 cloves garlic", "Fresh basil"],
        instructions: ["Cook pasta", "Sauté garlic in oil", "Add vegetables", "Toss with pasta", "Add parmesan and basil", "Serve hot"]
      }
    ]

    for (let i = 1; i <= days; i++) {
      const breakfastIndex = (i - 1) % breakfastOptions.length
      const lunchIndex = (i - 1) % lunchOptions.length
      const dinnerIndex = (i - 1) % dinnerOptions.length

      dailyPlans.push({
        day: `Day ${i}`,
        meals: {
          breakfast: {
            name: breakfastOptions[breakfastIndex].name,
            description: "A balanced start to your day",
            ingredients: breakfastOptions[breakfastIndex].ingredients,
            instructions: breakfastOptions[breakfastIndex].instructions,
            prepTime: "15 minutes",
            cookTime: "10 minutes",
            servings: servingSize,
            nutrition: {
              calories: 400,
              protein: "20g",
              carbs: "45g",
              fat: "15g",
              fiber: "8g",
              sugar: "10g"
            },
            tags: ["healthy", "balanced"]
          },
          lunch: {
            name: lunchOptions[lunchIndex].name,
            description: "Midday nutrition",
            ingredients: lunchOptions[lunchIndex].ingredients,
            instructions: lunchOptions[lunchIndex].instructions,
            prepTime: "20 minutes",
            cookTime: "15 minutes",
            servings: servingSize,
            nutrition: {
              calories: 500,
              protein: "25g",
              carbs: "55g",
              fat: "18g",
              fiber: "10g",
              sugar: "12g"
            },
            tags: ["nutritious", "filling"]
          },
          dinner: {
            name: dinnerOptions[dinnerIndex].name,
            description: "Evening meal",
            ingredients: dinnerOptions[dinnerIndex].ingredients,
            instructions: dinnerOptions[dinnerIndex].instructions,
            prepTime: "25 minutes",
            cookTime: "30 minutes",
            servings: servingSize,
            nutrition: {
              calories: 600,
              protein: "30g",
              carbs: "60g",
              fat: "20g",
              fiber: "12g",
              sugar: "15g"
            },
            tags: ["satisfying", "complete"]
          }
        },
        dailyNutrition: {
          calories: 1500,
          protein: "75g",
          carbs: "160g",
          fat: "53g",
          fiber: "30g",
          sugar: "37g"
        }
      })
    }

    return {
      overview: "Custom meal plan generated based on your preferences",
      dailyPlans,
      shoppingList: {
        categories: {
          "Proteins": ["Lean meats", "Legumes"],
          "Vegetables": ["Fresh seasonal produce"],
          "Grains": ["Whole grains"],
          "Dairy": ["Low-fat options"],
          "Pantry": ["Healthy oils", "Spices"]
        },
        estimatedCost: "$60-100",
        tips: ["Shop fresh", "Plan ahead"]
      },
      nutritionalSummary: {
        dailyAverages: {
          calories: 1500,
          protein: "75g",
          carbs: "160g",
          fat: "53g",
          fiber: "30g",
          sugar: "37g"
        },
        weeklyTotals: {
          calories: 1500 * days,
          protein: `${75 * days}g`,
          carbs: `${160 * days}g`,
          fat: `${53 * days}g`,
          fiber: `${30 * days}g`,
          sugar: `${37 * days}g`
        },
        healthInsights: ["Balanced nutrition", "Adequate fiber"],
        recommendations: ["Stay hydrated", "Regular meal times"]
      },
      cookingTips: ["Meal prep helps", "Use fresh herbs"],
      detailedPlan: responseText
    }
  }

  private createFallbackMealPlan(responseText: string, request: MealPlanRequest): any {
    const days = request.days || 7
    return {
      overview: "Meal plan generated successfully",
      dailyPlans: [],
      shoppingList: { categories: {}, estimatedCost: "Variable", tips: [] },
      nutritionalSummary: {
        dailyAverages: { calories: 0, protein: "0g", carbs: "0g", fat: "0g", fiber: "0g", sugar: "0g" },
        weeklyTotals: { calories: 0, protein: "0g", carbs: "0g", fat: "0g", fiber: "0g", sugar: "0g" },
        healthInsights: [],
        recommendations: []
      },
      cookingTips: [],
      rawResponse: responseText,
      requestedDays: days
    }
  }
}

// Factory function
export function createMealPlanningService(): MealPlanningService {
  return new MealPlanningService()
}

// Validation function
export function validateMealPlanRequest(request: MealPlanRequest): { isValid: boolean; error?: string } {
  if (request.days && (request.days < 1 || request.days > 30)) {
    return { isValid: false, error: 'Days must be between 1 and 30' }
  }
  
  if (request.servingSize && (request.servingSize < 1 || request.servingSize > 12)) {
    return { isValid: false, error: 'Serving size must be between 1 and 12' }
  }
  
  return { isValid: true }
}
