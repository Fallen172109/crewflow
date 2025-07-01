'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  ChefHat,
  Calendar,
  ShoppingCart,
  Clock,
  User,
  Settings,
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Target,
  Activity,
  Scale,
  Timer,
  DollarSign,
  MessageSquare,
  History,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  X,
  Ship
} from 'lucide-react'
import MealPlanningChatInterface from '@/components/meal-planning/MealPlanningChatInterface'
import MealPlanExport from '@/components/meal-planning/MealPlanExport'
import UnitPreferences from '@/components/meal-planning/UnitPreferences'
import CrewProfileNavigator from '@/components/meal-planning/CrewProfileNavigator'
import ProfileEditForm from '@/components/meal-planning/ProfileEditForm'
import PantryManagement from '@/components/meal-planning/PantryManagement'
import MealPlansManagement from '@/components/meal-planning/MealPlansManagement'
import DietaryRestrictionsManager, { DietaryRestriction } from '@/components/meal-planning/DietaryRestrictionsManager'
import MealPlanDisplay from '@/components/meal-planning/MealPlanDisplay'
import { WeightUnit, HeightUnit, formatWeight, formatHeight } from '@/lib/utils/units'

interface UserProfile {
  id?: string
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

interface PantryItem {
  id?: string
  ingredient_name: string
  quantity?: number
  unit?: string
  category: string
  expiration_date?: string
  status: string
}

interface MealPlan {
  id: string
  plan_name: string
  plan_duration_days: number
  generated_for_date: string
  plan_data: any
  is_active: boolean
  completion_status: string
  created_at: string
}

export default function MealPlanningPage() {
  const { user, userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'pantry' | 'plans' | 'chat'>('overview')
  const [mealProfile, setMealProfile] = useState<UserProfile | null>(null)
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([])
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [showProfileWizard, setShowProfileWizard] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [showPantryForm, setShowPantryForm] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false)
  const [selectedPlanForExport, setSelectedPlanForExport] = useState<MealPlan | null>(null)
  const [pantryFilter, setPantryFilter] = useState<'all' | 'available' | 'running_low' | 'expired'>('all')
  const [pantryCategory, setPantryCategory] = useState<string>('all')
  const [dietaryRestrictions, setDietaryRestrictions] = useState<DietaryRestriction[]>([])
  const [cuisinePreferences, setCuisinePreferences] = useState<any[]>([])
  const [nutritionalTargets, setNutritionalTargets] = useState<any>(null)
  const [profileCompletion, setProfileCompletion] = useState<any>(null)
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [autoGenError, setAutoGenError] = useState<string | null>(null)
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null)
  const [showQuickPlanModal, setShowQuickPlanModal] = useState(false)
  const [quickPlanData, setQuickPlanData] = useState({
    weightLossGoal: '',
    timeline: '',
    timelineUnit: 'weeks' as 'weeks' | 'months',
    specialRequests: ''
  })

  useEffect(() => {
    if (userProfile) {
      loadMealPlanningData()
    }
  }, [userProfile])

  const loadMealPlanningData = async () => {
    setLoading(true)
    try {
      // Load profile data
      const profileResponse = await fetch('/api/meal-planning/profile')
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setMealProfile(profileData.profile)
        setNutritionalTargets(profileData.nutritional_targets)
        setProfileCompletion(profileData.profile_completion)
        setDietaryRestrictions(profileData.dietary_restrictions || [])
        setCuisinePreferences(profileData.cuisine_preferences || [])
      }

      // Load pantry items
      const pantryResponse = await fetch('/api/meal-planning/pantry')
      if (pantryResponse.ok) {
        const pantryData = await pantryResponse.json()
        setPantryItems(pantryData.items || [])
      }

      // Load meal plan history
      const historyResponse = await fetch('/api/meal-planning/history?limit=5')
      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        setMealPlans(historyData.meal_plans || [])
      }
    } catch (error) {
      console.error('Error loading meal planning data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updatedProfile: UserProfile) => {
    try {
      const response = await fetch('/api/meal-planning/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedProfile)
      })

      if (response.ok) {
        setMealProfile(updatedProfile)
      } else {
        console.error('Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const handleProfileWizardComplete = async (profileData: any) => {
    try {
      console.log('Saving profile data:', profileData)

      if (!user) {
        alert('You must be logged in to save your profile. Please refresh the page and log in again.')
        return
      }

      const response = await fetch('/api/meal-planning/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      })

      if (response.ok) {
        const result = await response.json()
        setMealProfile(result.profile)
        setNutritionalTargets(result.nutritional_targets)
        setProfileCompletion(result.profile_completion)
        setDietaryRestrictions(profileData.dietary_restrictions || [])
        setCuisinePreferences(profileData.cuisine_preferences || [])
        setShowProfileWizard(false)
        setShowProfileEdit(false)
        await loadMealPlanningData()
      } else {
        const errorData = await response.text()
        console.error('Failed to save profile. Status:', response.status, 'Error:', errorData)
        alert(`Failed to save profile: ${response.status} - ${errorData}`)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert(`Error saving profile: ${error.message}`)
    }
  }

  const handleDeleteProfile = async () => {
    if (!confirm('Are you sure you want to delete your meal planning profile? This action cannot be undone and will remove all your profile data, meal plans, and pantry items.')) {
      return
    }

    try {
      const response = await fetch('/api/meal-planning/profile', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // Reset all state
        setMealProfile(null)
        setNutritionalTargets(null)
        setProfileCompletion(null)
        setDietaryRestrictions([])
        setMealPlans([])
        setPantryItems([])
        setShowProfileEdit(false)
        setActiveTab('overview')
        alert('Profile deleted successfully.')
      } else {
        const errorData = await response.text()
        console.error('Failed to delete profile. Status:', response.status, 'Error:', errorData)
        alert(`Failed to delete profile: ${response.status} - ${errorData}`)
      }
    } catch (error) {
      console.error('Error deleting profile:', error)
      alert(`Error deleting profile: ${error.message}`)
    }
  }

  const handleExportPlan = (plan: MealPlan) => {
    setSelectedPlanForExport(plan)
    setShowExportModal(true)
  }

  const handleAutoGenerate = async (planDurationDays: number = 7) => {
    setAutoGenerating(true)
    setAutoGenError(null)

    try {
      const response = await fetch('/api/meal-planning/auto-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan_duration_days: planDurationDays,
          regenerate_existing: true
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Refresh meal plans to show the new auto-generated plan
        await loadMealPlanningData()
        setActiveTab('plans')

        // Show success message
        alert('🎉 Your personalized 7-day meal plan has been auto-generated successfully!')
      } else {
        setAutoGenError(data.error || 'Failed to auto-generate meal plan')

        // Show specific guidance for profile completion but don't redirect
        if (data.profile_completion && !data.profile_completion.has_minimal_profile) {
          setAutoGenError(`Profile setup required: Missing ${data.missing_fields?.join(', ').replace(/_/g, ' ') || 'required fields'}. Please complete your basic profile to enable auto-generation.`)
        }
      }
    } catch (error) {
      console.error('Error auto-generating meal plan:', error)
      setAutoGenError('An unexpected error occurred while generating your meal plan.')
    } finally {
      setAutoGenerating(false)
    }
  }

  const handleManualGenerate = async (request: string, planDurationDays: number = 7) => {
    setAutoGenerating(true)
    setAutoGenError(null)

    try {
      const response = await fetch('/api/meal-planning/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request: request,
          plan_duration_days: planDurationDays,
          use_profile_data: true,
          current_pantry: true
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Refresh meal plans to show the new generated plan
        await loadMealPlanningData()
        setActiveTab('plans')

        // Show success message
        alert('🎉 Your custom meal plan has been generated successfully!')
      } else {
        setAutoGenError(data.error || 'Failed to generate meal plan')
      }
    } catch (error) {
      console.error('Manual generation error:', error)
      setAutoGenError('Failed to generate meal plan. Please try again.')
    } finally {
      setAutoGenerating(false)
    }
  }

  const handleQuickPlanGenerate = async () => {
    if (!quickPlanData.weightLossGoal || !quickPlanData.timeline) {
      setAutoGenError('Please fill in your weight loss goal and timeline')
      return
    }

    // Clear any previous errors
    setAutoGenError(null)
    setAutoGenerating(true)

    // Build intelligent request based on user input and profile data
    let request = `Generate a personalized meal plan for weight loss with the following goals:
- Target weight loss: ${quickPlanData.weightLossGoal} kg
- Timeline: ${quickPlanData.timeline} ${quickPlanData.timelineUnit}
- Current weight: ${mealProfile?.weight_value || 'not specified'} ${mealProfile?.weight_unit || 'kg'}
- Activity level: ${mealProfile?.activity_level || 'not specified'}
- Primary goal: ${mealProfile?.primary_goal || 'weight loss'}`

    // Add dietary restrictions and food preferences from user profile
    if (dietaryRestrictions && dietaryRestrictions.length > 0) {
      const allergies = dietaryRestrictions
        .filter(r => r.restriction_type === 'allergy')
        .map(r => r.restriction_value)

      const foodDislikes = dietaryRestrictions
        .filter(r => r.restriction_type === 'dietary_preference' && r.severity === 'severe')
        .map(r => r.restriction_value)

      if (allergies.length > 0) {
        request += `\n- ALLERGIES (must avoid): ${allergies.join(', ')}`
      }

      if (foodDislikes.length > 0) {
        request += `\n- Foods to avoid (dislikes): ${foodDislikes.join(', ')}`
      }
    }

    // Add cuisine preferences if available
    if (cuisinePreferences && cuisinePreferences.length > 0) {
      const avoidCuisines = cuisinePreferences
        .filter(c => c.preference_level === 'avoid' || c.preference_level === 'dislike')
        .map(c => c.cuisine_type)

      if (avoidCuisines.length > 0) {
        request += `\n- Cuisine types to avoid: ${avoidCuisines.join(', ')}`
      }
    }

    if (quickPlanData.specialRequests) {
      request += `\n- Special requests: ${quickPlanData.specialRequests}`
    }

    // Add safety recommendations
    const timelineInWeeks = quickPlanData.timelineUnit === 'months'
      ? parseInt(quickPlanData.timeline) * 4
      : parseInt(quickPlanData.timeline)
    const weightLossPerWeek = parseFloat(quickPlanData.weightLossGoal) / timelineInWeeks

    if (weightLossPerWeek > 1) {
      request += `\n\nIMPORTANT: The requested weight loss rate (${weightLossPerWeek.toFixed(1)} kg/week) is above the recommended safe rate of 0.5-1 kg per week. Please provide health-safe recommendations and suggest a more sustainable timeline if needed.`
    }

    request += `\n\nPlease create a balanced, sustainable meal plan that supports healthy weight loss while maintaining proper nutrition and energy levels. Ensure all meals avoid the specified allergies and food dislikes listed above.`

    try {
      setShowQuickPlanModal(false)
      await handleManualGenerate(request, 7)
    } catch (error) {
      console.error('Quick plan generation error:', error)
      setAutoGenError('Failed to generate quick weight loss plan. Please try again.')
    } finally {
      setAutoGenerating(false)
    }
  }

  const handleMealModify = async (planId: string, dayIndex: number, mealType: string, modificationRequest: string) => {
    try {
      const response = await fetch('/api/meal-planning/modify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan_id: planId,
          day_index: dayIndex,
          meal_type: mealType,
          modification_request: modificationRequest
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await loadMealPlanningData()
        alert('✅ Your meal has been successfully modified!')
      } else {
        alert(`❌ Failed to modify meal: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error modifying meal:', error)
      alert('❌ An unexpected error occurred while modifying your meal.')
    }
  }

  const handleMealRemove = async (planId: string, dayIndex: number, mealType: string) => {
    if (!confirm(`Are you sure you want to remove the ${mealType} for day ${dayIndex + 1}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/meal-planning/modify?plan_id=${planId}&day_index=${dayIndex}&meal_type=${mealType}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await loadMealPlanningData()
        alert('✅ Meal removed successfully!')
      } else {
        alert(`❌ Failed to remove meal: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error removing meal:', error)
      alert('❌ An unexpected error occurred while removing the meal.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-8 rounded-lg mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <ChefHat className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Meal Planning Hub</h1>
                <p className="text-orange-100 mt-2">Your personalized nutrition and meal planning center</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-orange-100 text-sm">Welcome aboard, Captain!</div>
              <div className="text-white font-medium">{userProfile?.email}</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex border-b">
            {[
              { id: 'overview', label: 'Overview', icon: Target },
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'pantry', label: 'Pantry', icon: ShoppingCart },
              { id: 'plans', label: 'Meal Plans', icon: Calendar },
              { id: 'chat', label: 'AI Assistant', icon: MessageSquare }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Stats */}
              <div className="lg:col-span-2 space-y-6">
                {/* Profile Status Card */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Profile Status</h3>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                    >
                      {mealProfile ? 'Update Crew Manifest' : 'Create Crew Profile'}
                    </button>
                  </div>

                  {mealProfile ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <Target className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="text-sm text-gray-600">Goal</div>
                          <div className="font-medium capitalize">{mealProfile.primary_goal.replace('_', ' ')}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Activity className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="text-sm text-gray-600">Activity</div>
                          <div className="font-medium capitalize">{mealProfile.activity_level.replace('_', ' ')}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-purple-600" />
                        <div>
                          <div className="text-sm text-gray-600">Household</div>
                          <div className="font-medium">{mealProfile.household_size} people</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Timer className="w-5 h-5 text-orange-600" />
                        <div>
                          <div className="text-sm text-gray-600">Max Cook Time</div>
                          <div className="font-medium">{mealProfile.max_cooking_time_minutes} min</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Set up your meal planning profile to get personalized recommendations</p>
                      <button
                        onClick={() => setActiveTab('profile')}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        Create Profile
                      </button>
                    </div>
                  )}
                </div>

                {/* Auto-Generation Section */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Quick Meal Plan Generation</h3>
                    <RefreshCw className="w-5 h-5 text-orange-600" />
                  </div>

                  {profileCompletion && profileCompletion.has_minimal_profile ? (
                    <div>
                      <p className="text-gray-600 mb-4">
                        Generate a personalized 7-day meal plan instantly using your complete profile data,
                        dietary restrictions, and nutritional targets.
                      </p>

                      {autoGenError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                          <div className="flex items-start space-x-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                            <div className="text-sm text-red-700">{autoGenError}</div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <button
                          onClick={() => handleAutoGenerate(7)}
                          disabled={autoGenerating}
                          className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                        >
                          {autoGenerating ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Generating Your Plan...</span>
                            </>
                          ) : (
                            <>
                              <ChefHat className="w-4 h-4" />
                              <span>Auto-Generate 7-Day Meal Plan</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setShowQuickPlanModal(true)}
                          disabled={autoGenerating}
                          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                        >
                          <Target className="w-4 h-4" />
                          <span>Quick Weight Loss Plan</span>
                        </button>
                      </div>

                      <div className="mt-3 text-xs text-gray-500 text-center">
                        ✨ Uses your profile: {profileCompletion.percentage}% complete •
                        {dietaryRestrictions.length} dietary restrictions •
                        {pantryItems.length} pantry items
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">Complete your profile to enable auto-generation</p>
                      <p className="text-sm text-gray-500 mb-2">
                        Current completion: {profileCompletion?.percentage || 0}% (70% required)
                      </p>
                      {profileCompletion?.missing_fields && profileCompletion.missing_fields.length > 0 && (
                        <p className="text-sm text-red-600 mb-4">
                          Missing: {profileCompletion.missing_fields.join(', ').replace(/_/g, ' ')}
                        </p>
                      )}
                      <button
                        onClick={() => setActiveTab('profile')}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        Complete Profile Setup
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab('chat')}
                      className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <MessageSquare className="w-5 h-5 text-orange-600" />
                      <div>
                        <div className="font-medium text-gray-900">Chat with AI</div>
                        <div className="text-sm text-gray-600">Get personalized advice</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('pantry')}
                      className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ShoppingCart className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900">Manage Pantry</div>
                        <div className="text-sm text-gray-600">{pantryItems.length} items tracked</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('plans')}
                      className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-gray-900">View Plans</div>
                        <div className="text-sm text-gray-600">{mealPlans.length} plans created</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Profile Setup</h3>

              {!mealProfile ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Welcome to Meal Planning!</h4>
                  <p className="text-gray-600 mb-6">
                    Set up your personalized profile to unlock intelligent meal plan generation.
                    We'll use your goals, dietary preferences, and lifestyle to create perfect meal plans for you.
                  </p>
                  <button
                    onClick={() => setShowProfileWizard(true)}
                    className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 mx-auto"
                  >
                    <Ship className="w-5 h-5" />
                    <span>Start Profile Setup</span>
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900">Profile Status</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        profileCompletion?.has_minimal_profile
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {profileCompletion?.percentage || 0}% Complete
                      </span>
                    </div>

                    {!profileCompletion?.has_minimal_profile && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h5 className="font-medium text-yellow-800">Profile Incomplete</h5>
                            <p className="text-yellow-700 text-sm mt-1">
                              Complete your profile to unlock auto-generation features.
                              {profileCompletion?.missing_fields && profileCompletion.missing_fields.length > 0 && (
                                <span className="block mt-1">
                                  Missing: {profileCompletion.missing_fields.join(', ').replace(/_/g, ' ')}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {profileCompletion?.has_minimal_profile && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                          <div>
                            <h5 className="font-medium text-green-800">Profile Complete!</h5>
                            <p className="text-green-700 text-sm mt-1">
                              Your profile is ready for auto-generation. You can now create personalized meal plans instantly.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowProfileEdit(true)}
                      className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                    >
                      <Settings className="w-5 h-5" />
                      <span>Update Crew Manifest</span>
                    </button>
                    <button
                      onClick={() => setShowProfileWizard(true)}
                      className="bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      Complete Navigation
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pantry Tab */}
          {activeTab === 'pantry' && (
            <PantryManagement />
          )}

          {/* Meal Plans Tab */}
          {activeTab === 'plans' && (
            <MealPlansManagement
              onCreateNew={() => setShowCreatePlanModal(true)}
            />
          )}

          {/* AI Assistant Tab */}
          {activeTab === 'chat' && (
            <div className="h-[600px]">
              <MealPlanningChatInterface
                userProfile={mealProfile}
                pantryItems={pantryItems}
                recentMealPlans={mealPlans}
                dietaryRestrictions={dietaryRestrictions}
                nutritionalTargets={nutritionalTargets}
                onMealPlanGenerated={async (mealPlan) => {
                  // Refresh meal plans when a new one is generated
                  await loadMealPlanningData()
                  setActiveTab('plans')
                }}
              />
            </div>
          )}
        </div>

        {/* Profile Setup Wizard Modal */}
        {showProfileWizard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <CrewProfileNavigator
                onComplete={handleProfileWizardComplete}
                onCancel={() => setShowProfileWizard(false)}
                initialData={mealProfile}
              />
            </div>
          </div>
        )}

        {/* Profile Edit Form Modal - Using Crew Profile Navigator for Complete Access */}
        {showProfileEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Update Crew Manifest</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDeleteProfile}
                    className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete Profile"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowProfileEdit(false)}
                    className="text-gray-600 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <CrewProfileNavigator
                onComplete={handleProfileWizardComplete}
                onCancel={() => setShowProfileEdit(false)}
                initialData={{
                  ...mealProfile,
                  dietary_restrictions: dietaryRestrictions,
                  cuisine_preferences: cuisinePreferences
                }}
              />
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && selectedPlanForExport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <MealPlanExport
                onClose={() => setShowExportModal(false)}
                planId={selectedPlanForExport.id}
                planName={selectedPlanForExport.plan_name}
              />
            </div>
          </div>
        )}

        {/* Quick Plan Generation Modal */}
        {showQuickPlanModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  <span>Quick Weight Loss Plan</span>
                </h3>
                <button
                  onClick={() => setShowQuickPlanModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How many kilograms do you want to lose?
                  </label>
                  <input
                    type="number"
                    value={quickPlanData.weightLossGoal}
                    onChange={(e) => setQuickPlanData(prev => ({ ...prev, weightLossGoal: e.target.value }))}
                    placeholder="e.g., 5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    min="0.5"
                    max="50"
                    step="0.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    By when do you want to achieve this goal?
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={quickPlanData.timeline}
                      onChange={(e) => setQuickPlanData(prev => ({ ...prev, timeline: e.target.value }))}
                      placeholder="e.g., 8"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      min="1"
                      max="52"
                    />
                    <select
                      value={quickPlanData.timelineUnit}
                      onChange={(e) => setQuickPlanData(prev => ({ ...prev, timelineUnit: e.target.value as 'weeks' | 'months' }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="weeks">weeks</option>
                      <option value="months">months</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Any special requests? (Optional)
                  </label>
                  <textarea
                    value={quickPlanData.specialRequests}
                    onChange={(e) => setQuickPlanData(prev => ({ ...prev, specialRequests: e.target.value }))}
                    placeholder="e.g., vegetarian meals, no dairy, quick prep times..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    rows={3}
                  />
                </div>

                {quickPlanData.weightLossGoal && quickPlanData.timeline && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm text-blue-800">
                      <strong>Health Check:</strong> {(() => {
                        const timelineInWeeks = quickPlanData.timelineUnit === 'months'
                          ? parseInt(quickPlanData.timeline) * 4
                          : parseInt(quickPlanData.timeline)
                        const weightLossPerWeek = parseFloat(quickPlanData.weightLossGoal) / timelineInWeeks

                        if (weightLossPerWeek > 1) {
                          return `⚠️ Your target rate (${weightLossPerWeek.toFixed(1)} kg/week) is above the recommended safe rate. We'll provide health-safe alternatives.`
                        } else if (weightLossPerWeek > 0.5) {
                          return `✅ Your target rate (${weightLossPerWeek.toFixed(1)} kg/week) is within the healthy range.`
                        } else {
                          return `💡 Your target rate (${weightLossPerWeek.toFixed(1)} kg/week) is conservative and sustainable.`
                        }
                      })()}
                    </div>
                  </div>
                )}

                {autoGenError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-sm text-red-700">{autoGenError}</div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowQuickPlanModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickPlanGenerate}
                  disabled={!quickPlanData.weightLossGoal || !quickPlanData.timeline || autoGenerating}
                  className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {autoGenerating ? 'Generating...' : 'Generate Plan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Plan Modal */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Meal Plan</h3>
            <p className="text-gray-600 mb-6">Choose how you'd like to create your meal plan:</p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowCreatePlanModal(false)
                  handleAutoGenerate()
                }}
                className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition-colors text-left"
              >
                <div className="font-medium">🚀 Auto-Generate (Recommended)</div>
                <div className="text-sm text-orange-100">Generate a 7-day plan based on your profile</div>
              </button>

              <button
                onClick={() => {
                  setShowCreatePlanModal(false)
                  setActiveTab('chat')
                }}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors text-left"
              >
                <div className="font-medium">💬 Custom with AI Chat</div>
                <div className="text-sm text-blue-100">Create a custom plan through conversation</div>
              </button>

              <button
                onClick={() => {
                  setShowCreatePlanModal(false)
                  const customRequest = prompt("Describe the meal plan you'd like to create:")
                  if (customRequest) {
                    handleManualGenerate(customRequest, 7)
                  }
                }}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors text-left"
              >
                <div className="font-medium">✏️ Quick Custom Request</div>
                <div className="text-sm text-green-100">Describe your meal plan requirements</div>
              </button>
            </div>

            <button
              onClick={() => setShowCreatePlanModal(false)}
              className="w-full mt-4 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
