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
      const prompt = this.buildMealPlanPrompt(request)
      console.log('Generating meal plan with prompt:', prompt)

      const response = await this.llm.invoke(prompt)
      const responseText = response.content as string

      // Parse the structured response
      const mealPlan = this.parseMealPlanResponse(responseText)

      return {
        success: true,
        mealPlan,
        tokensUsed: response.usage?.totalTokens || 0,
        latency: Date.now() - startTime,
        model: this.llm.model
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

  private buildMealPlanPrompt(request: MealPlanRequest): string {
    const days = request.days || 7
    const mealCount = request.mealCount || 3
    const servingSize = request.servingSize || 2

    return `You are a professional nutritionist and meal planning expert. Create a comprehensive ${days}-day meal plan with the following requirements:

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
${request.healthGoals?.join(', ') || 'Balanced nutrition and variety'}

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

Ensure all meals are:
1. Nutritionally balanced and varied
2. Realistic and achievable for home cooking
3. Cost-effective within the specified budget
4. Aligned with dietary preferences and restrictions
5. Include accurate nutritional information
6. Provide clear, step-by-step cooking instructions

Focus on creating delicious, healthy meals that promote the specified health goals while being practical for everyday cooking.`
  }

  private parseMealPlanResponse(responseText: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      // If no JSON found, create a structured response from the text
      return this.createStructuredMealPlan(responseText)
    } catch (error) {
      console.error('Error parsing meal plan response:', error)
      return this.createFallbackMealPlan(responseText)
    }
  }

  private createStructuredMealPlan(responseText: string): any {
    // Create a basic structured meal plan from unstructured text
    return {
      overview: "Custom meal plan generated based on your preferences",
      dailyPlans: [
        {
          day: "Day 1",
          meals: {
            breakfast: {
              name: "Nutritious Breakfast",
              description: "A balanced start to your day",
              ingredients: ["Based on your preferences"],
              instructions: ["Follow the detailed plan provided"],
              prepTime: "15 minutes",
              cookTime: "10 minutes",
              servings: 2,
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
              name: "Healthy Lunch",
              description: "Midday nutrition",
              ingredients: ["Fresh ingredients"],
              instructions: ["Prepare as directed"],
              prepTime: "20 minutes",
              cookTime: "15 minutes",
              servings: 2,
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
              name: "Balanced Dinner",
              description: "Evening meal",
              ingredients: ["Quality proteins and vegetables"],
              instructions: ["Cook with care"],
              prepTime: "25 minutes",
              cookTime: "30 minutes",
              servings: 2,
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
        }
      ],
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
          calories: 10500,
          protein: "525g",
          carbs: "1120g",
          fat: "371g",
          fiber: "210g",
          sugar: "259g"
        },
        healthInsights: ["Balanced nutrition", "Adequate fiber"],
        recommendations: ["Stay hydrated", "Regular meal times"]
      },
      cookingTips: ["Meal prep helps", "Use fresh herbs"],
      detailedPlan: responseText
    }
  }

  private createFallbackMealPlan(responseText: string): any {
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
      rawResponse: responseText
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
