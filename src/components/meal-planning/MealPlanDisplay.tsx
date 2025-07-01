'use client'

import { useState } from 'react'
import { 
  Calendar, 
  Clock, 
  Users, 
  ChefHat, 
  Utensils, 
  Edit3, 
  Trash2, 
  Plus,
  BarChart3,
  ShoppingCart,
  Download,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'

interface NutritionalInfo {
  calories: number
  protein: string
  carbs: string
  fat: string
  fiber: string
  sugar: string
}

interface Meal {
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

interface DailyMealPlan {
  day: string
  meals: {
    breakfast: Meal
    lunch: Meal
    dinner: Meal
    snacks?: Meal[]
  }
  dailyNutrition: NutritionalInfo
}

interface MealPlan {
  overview: string
  dailyPlans: DailyMealPlan[]
  shoppingList: {
    categories: { [category: string]: string[] }
    estimatedCost: string
    tips: string[]
  }
  nutritionalSummary: {
    dailyAverages: NutritionalInfo
    weeklyTotals: NutritionalInfo
    healthInsights: string[]
    recommendations: string[]
  }
  cookingTips: string[]
}

interface MealPlanDisplayProps {
  mealPlan: MealPlan
  planId?: string
  planName?: string
  isActive?: boolean
  onMealModify?: (dayIndex: number, mealType: string, meal: Meal) => void
  onMealRemove?: (dayIndex: number, mealType: string) => void
  onMealAdd?: (dayIndex: number, mealType: string) => void

  onRegenerate?: () => void
  className?: string
}

export default function MealPlanDisplay({
  mealPlan,
  planId,
  planName,
  isActive = false,
  onMealModify,
  onMealRemove,
  onMealAdd,

  onRegenerate,
  className = ''
}: MealPlanDisplayProps) {
  const [selectedDay, setSelectedDay] = useState(0)
  const [showNutrition, setShowNutrition] = useState(true)
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set())

  const toggleMealExpansion = (mealId: string) => {
    const newExpanded = new Set(expandedMeals)
    if (newExpanded.has(mealId)) {
      newExpanded.delete(mealId)
    } else {
      newExpanded.add(mealId)
    }
    setExpandedMeals(newExpanded)
  }

  const formatNutrition = (nutrition: NutritionalInfo) => ({
    calories: typeof nutrition.calories === 'number' ? nutrition.calories : parseInt(nutrition.calories?.toString() || '0'),
    protein: nutrition.protein?.toString().replace('g', '') || '0',
    carbs: nutrition.carbs?.toString().replace('g', '') || '0',
    fat: nutrition.fat?.toString().replace('g', '') || '0',
    fiber: nutrition.fiber?.toString().replace('g', '') || '0'
  })

  if (!mealPlan || !mealPlan.dailyPlans || mealPlan.dailyPlans.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <ChefHat className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No meal plan data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <ChefHat className="w-5 h-5 text-orange-600" />
              <span>{planName || 'Meal Plan'}</span>
              {isActive && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">Active</span>
              )}
            </h3>
            {mealPlan.overview && (
              <p className="text-gray-600 mt-1">{mealPlan.overview}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowNutrition(!showNutrition)}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {showNutrition ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showNutrition ? 'Hide' : 'Show'} Nutrition</span>
            </button>

            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center space-x-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        </div>

        {/* Day Navigation */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {mealPlan.dailyPlans.map((day, index) => (
            <button
              key={index}
              onClick={() => setSelectedDay(index)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedDay === index
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {day.day || `Day ${index + 1}`}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Day Content */}
      {mealPlan.dailyPlans[selectedDay] && (
        <div className="p-6">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              {mealPlan.dailyPlans[selectedDay].day || `Day ${selectedDay + 1}`}
            </h4>
            
            {/* Daily Nutrition Summary */}
            {showNutrition && mealPlan.dailyPlans[selectedDay].dailyNutrition && (
              <div className="bg-orange-50 rounded-lg p-4 mb-6">
                <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2 text-orange-600" />
                  Daily Nutrition Totals
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  {(() => {
                    const nutrition = formatNutrition(mealPlan.dailyPlans[selectedDay].dailyNutrition)
                    return (
                      <>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{nutrition.calories}</div>
                          <div className="text-gray-600">Calories</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{nutrition.protein}g</div>
                          <div className="text-gray-600">Protein</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{nutrition.carbs}g</div>
                          <div className="text-gray-600">Carbs</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{nutrition.fat}g</div>
                          <div className="text-gray-600">Fat</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{nutrition.fiber}g</div>
                          <div className="text-gray-600">Fiber</div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* Meals */}
            <div className="space-y-6">
              {Object.entries(mealPlan.dailyPlans[selectedDay].meals).map(([mealType, meal]) => {
                if (!meal || typeof meal !== 'object') return null
                
                const mealId = `${selectedDay}-${mealType}`
                const isExpanded = expandedMeals.has(mealId)
                
                return (
                  <div key={mealType} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Utensils className="w-4 h-4 text-gray-600" />
                          <h6 className="font-medium text-gray-900 capitalize">{mealType}</h6>
                          <span className="text-sm text-gray-600">{meal.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {showNutrition && meal.nutrition && (
                            <span className="text-sm text-gray-600">
                              {formatNutrition(meal.nutrition).calories} cal
                            </span>
                          )}
                          <button
                            onClick={() => toggleMealExpansion(mealId)}
                            className="text-sm text-orange-600 hover:text-orange-700"
                          >
                            {isExpanded ? 'Hide Details' : 'Show Details'}
                          </button>
                          {onMealModify && (
                            <button
                              onClick={() => onMealModify(selectedDay, mealType, meal)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {onMealRemove && (
                            <button
                              onClick={() => onMealRemove(selectedDay, mealType)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-4 space-y-4">
                        {meal.description && (
                          <p className="text-gray-700">{meal.description}</p>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h6 className="font-medium text-gray-900 mb-2 block">Ingredients</h6>
                            <ul className="text-sm text-gray-700 space-y-1">
                              {meal.ingredients?.map((ingredient, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="w-2 h-2 bg-orange-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                  {ingredient}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h6 className="font-medium text-gray-900 mb-2 block">Instructions</h6>
                            <ol className="text-sm text-gray-700 space-y-1">
                              {meal.instructions?.map((instruction, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                                    {idx + 1}
                                  </span>
                                  {instruction}
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-600 pt-2 border-t border-gray-100">
                          {meal.prepTime && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>Prep: {meal.prepTime}</span>
                            </div>
                          )}
                          {meal.cookTime && (
                            <div className="flex items-center space-x-1">
                              <ChefHat className="w-4 h-4" />
                              <span>Cook: {meal.cookTime}</span>
                            </div>
                          )}
                          {meal.servings && (
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>Serves: {meal.servings}</span>
                            </div>
                          )}
                        </div>
                        
                        {showNutrition && meal.nutrition && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <h6 className="font-medium text-gray-900 mb-2 block">Nutrition per serving</h6>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-sm">
                              {(() => {
                                const nutrition = formatNutrition(meal.nutrition)
                                return (
                                  <>
                                    <div className="text-center">
                                      <div className="font-medium">{nutrition.calories}</div>
                                      <div className="text-gray-600 text-xs">cal</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-medium">{nutrition.protein}g</div>
                                      <div className="text-gray-600 text-xs">protein</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-medium">{nutrition.carbs}g</div>
                                      <div className="text-gray-600 text-xs">carbs</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-medium">{nutrition.fat}g</div>
                                      <div className="text-gray-600 text-xs">fat</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-medium">{nutrition.fiber}g</div>
                                      <div className="text-gray-600 text-xs">fiber</div>
                                    </div>
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              
              {/* Add Meal Button */}
              {onMealAdd && (
                <button
                  onClick={() => onMealAdd(selectedDay, 'snack')}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:border-orange-400 hover:text-orange-600 transition-colors"
                >
                  <Plus className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm">Add Snack or Additional Meal</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
