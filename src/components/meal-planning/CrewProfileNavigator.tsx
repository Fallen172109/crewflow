'use client'

import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  User,
  Target,
  AlertTriangle,
  Heart,
  Utensils,
  CheckCircle,
  Anchor,
  Compass,
  Ship,
  X
} from 'lucide-react'
import DietaryRestrictionsManager, { DietaryRestriction } from './DietaryRestrictionsManager'
import UnitPreferences from './UnitPreferences'
import { WeightUnit, HeightUnit } from '@/lib/utils/units'
import {
  calculateNutritionalTargets,
  validatePhysicalStats,
  PhysicalStats,
  ACTIVITY_LEVELS,
  GOAL_ADJUSTMENTS,
  DIET_TYPES,
  calculateWeightLossTimeline,
  WeightLossTimeline
} from '@/lib/utils/calorie-calculator'

interface ProfileData {
  // Physical Stats
  height_value?: number
  height_unit: HeightUnit
  weight_value?: number
  weight_unit: WeightUnit
  age?: number
  gender?: 'male' | 'female' | 'other'

  // Goals & Timeline
  primary_goal: string
  target_weight?: number
  target_date?: string
  timeline_duration_weeks?: number

  // Activity & Lifestyle
  activity_level: string
  household_size: number
  preferred_meal_count: number
  max_cooking_time_minutes: number
  budget_range: string

  // Dietary Information
  dietary_restrictions: DietaryRestriction[]
  preferred_diet_type?: string
  food_likes?: string
  food_dislikes?: string
  cuisine_preferences?: Array<{
    cuisine_type: string
    preference_level: 'love' | 'like' | 'neutral' | 'dislike' | 'avoid'
  }>
}

interface CrewProfileNavigatorProps {
  onComplete: (profileData: ProfileData) => void
  onCancel?: () => void
  initialData?: Partial<ProfileData>
  className?: string
}

const NAVIGATION_WAYPOINTS = [
  {
    id: 'embark',
    title: 'All Hands on Deck!',
    subtitle: 'Begin your nutritional voyage with CrewFlow',
    icon: <Anchor className="w-8 h-8" />,
    description: 'Welcome to your personal galley navigator. We\'ll chart a course through your nutritional preferences to create the perfect meal planning experience for your crew.'
  },
  {
    id: 'crew_manifest',
    title: 'Crew Manifest',
    subtitle: 'Record your vital statistics for the ship\'s log',
    icon: <User className="w-8 h-8" />,
    description: 'Every good captain knows their crew. Let\'s log your physical details to calculate optimal nutrition requirements for your voyage.'
  },
  {
    id: 'destination',
    title: 'Chart Your Course',
    subtitle: 'Set your health and fitness destination',
    icon: <Compass className="w-8 h-8" />,
    description: 'Where is your nutritional journey taking you? Whether you\'re maintaining course or navigating toward new health goals, we\'ll plot the perfect route.'
  },
  {
    id: 'navigation_rules',
    title: 'Maritime Safety Protocols',
    subtitle: 'Essential dietary restrictions and health guidelines',
    icon: <Anchor className="w-8 h-8" />,
    description: 'Every safe voyage requires proper navigation rules. Let\'s establish your dietary restrictions and health requirements to keep you sailing smoothly.'
  },
  {
    id: 'galley_favorites',
    title: 'Galley Preferences',
    subtitle: 'Your favorite provisions and culinary traditions',
    icon: <Heart className="w-8 h-8" />,
    description: 'A well-stocked galley reflects the crew\'s tastes. Share your favorite flavors and cuisine styles to personalize your meal planning experience.'
  },
  {
    id: 'ship_operations',
    title: 'Ship Operations',
    subtitle: 'Galley capacity, provisions budget, and crew logistics',
    icon: <Ship className="w-8 h-8" />,
    description: 'Every ship operates differently. Let\'s configure your galley operations including cooking time, budget constraints, and crew size for optimal meal planning.'
  },
  {
    id: 'ready_to_sail',
    title: 'Ready to Set Sail',
    subtitle: 'Final inspection before launching your meal planning voyage',
    icon: <CheckCircle className="w-8 h-8" />,
    description: 'Your crew profile is complete! Review your nutritional navigation settings before we launch your personalized meal planning experience.'
  }
]

export default function CrewProfileNavigator({
  onComplete,
  onCancel,
  initialData,
  className = ''
}: CrewProfileNavigatorProps) {
  const [currentWaypoint, setCurrentWaypoint] = useState(0)
  const [profileData, setProfileData] = useState<ProfileData>({
    height_unit: 'cm',
    weight_unit: 'kg',
    primary_goal: 'maintenance',
    activity_level: 'moderately_active',
    household_size: 1,
    preferred_meal_count: 3,
    max_cooking_time_minutes: 60,
    budget_range: 'moderate',
    dietary_restrictions: [],
    food_likes: '',
    food_dislikes: '',
    cuisine_preferences: [],
    ...initialData
  })
  const [errors, setErrors] = useState<string[]>([])
  const [calculatedTargets, setCalculatedTargets] = useState<any>(null)
  const [weightLossTimeline, setWeightLossTimeline] = useState<WeightLossTimeline | null>(null)

  // Calculate nutritional targets when relevant data changes
  useEffect(() => {
    if (profileData.weight_value && profileData.height_value && profileData.age) {
      try {
        const physicalStats: PhysicalStats = {
          weight_value: profileData.weight_value,
          weight_unit: profileData.weight_unit,
          height_value: profileData.height_value,
          height_unit: profileData.height_unit
        }

        const targets = calculateNutritionalTargets(
          physicalStats,
          profileData.activity_level,
          profileData.primary_goal,
          profileData.preferred_diet_type || 'balanced',
          profileData.age,
          profileData.gender
        )

        setCalculatedTargets(targets)

        // Calculate weight loss timeline if applicable
        if (profileData.primary_goal === 'weight_loss' && profileData.target_weight) {
          const timeline = calculateWeightLossTimeline(
            profileData.weight_value,
            profileData.target_weight,
            profileData.weight_unit,
            profileData.timeline_duration_weeks
          )
          setWeightLossTimeline(timeline)
        } else {
          setWeightLossTimeline(null)
        }
      } catch (error) {
        console.error('Error calculating targets:', error)
        setCalculatedTargets(null)
        setWeightLossTimeline(null)
      }
    }
  }, [
    profileData.weight_value,
    profileData.height_value,
    profileData.age,
    profileData.gender,
    profileData.activity_level,
    profileData.primary_goal,
    profileData.preferred_diet_type,
    profileData.target_weight,
    profileData.timeline_duration_weeks,
    profileData.weight_unit
  ])

  const updateProfileData = (updates: Partial<ProfileData>) => {
    setProfileData(prev => ({ ...prev, ...updates }))
    setErrors([]) // Clear errors when data changes
  }

  const validateCurrentWaypoint = (): boolean => {
    const newErrors: string[] = []

    switch (NAVIGATION_WAYPOINTS[currentWaypoint].id) {
      case 'crew_manifest':
        if (!profileData.weight_value) newErrors.push('Crew weight is required for the ship\'s manifest')
        if (!profileData.height_value) newErrors.push('Crew height is required for the ship\'s manifest')
        if (!profileData.age || profileData.age < 13 || profileData.age > 120) {
          newErrors.push('Please enter a valid age for crew records (13-120)')
        }

        if (profileData.weight_value && profileData.height_value) {
          const physicalStats: PhysicalStats = {
            weight_value: profileData.weight_value,
            weight_unit: profileData.weight_unit,
            height_value: profileData.height_value,
            height_unit: profileData.height_unit
          }
          const validationErrors = validatePhysicalStats(physicalStats)
          newErrors.push(...validationErrors)
        }
        break

      case 'destination':
        if (!profileData.primary_goal) newErrors.push('Please chart your navigation course')
        if (!profileData.activity_level) newErrors.push('Please specify your activity level for voyage planning')
        break

      case 'ship_operations':
        if (profileData.household_size < 1 || profileData.household_size > 20) {
          newErrors.push('Crew size must be between 1 and 20 for galley operations')
        }
        if (profileData.preferred_meal_count < 2 || profileData.preferred_meal_count > 6) {
          newErrors.push('Daily meal count must be between 2 and 6 for optimal galley scheduling')
        }
        break
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const navigateForward = () => {
    if (validateCurrentWaypoint() && currentWaypoint < NAVIGATION_WAYPOINTS.length - 1) {
      setCurrentWaypoint(currentWaypoint + 1)
    }
  }

  const navigateBack = () => {
    if (currentWaypoint > 0) {
      setCurrentWaypoint(currentWaypoint - 1)
      setErrors([])
    }
  }

  const completeCourse = () => {
    if (validateCurrentWaypoint()) {
      onComplete(profileData)
    }
  }

  const canSkipWaypoint = () => {
    const waypoint = NAVIGATION_WAYPOINTS[currentWaypoint]
    // Allow skipping all waypoints except embark and ready_to_sail
    return waypoint.id !== 'embark' && waypoint.id !== 'ready_to_sail'
  }

  const renderWaypointContent = () => {
    const waypoint = NAVIGATION_WAYPOINTS[currentWaypoint]

    switch (waypoint.id) {
      case 'embark':
        return (
          <div className="text-center py-8">
            <div className="mb-6">
              <Ship className="w-24 h-24 text-orange-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                All Hands on Deck!
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Welcome aboard the CrewFlow galley navigator! We're about to embark on a voyage 
                to chart your perfect nutritional course. Our AI crew will use this information 
                to provision your galley with personalized meal plans and nutrition guidance.
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center space-x-3">
                <Compass className="w-6 h-6 text-orange-600" />
                <div className="text-left">
                  <h4 className="font-medium text-orange-900">Navigation Waypoints:</h4>
                  <ul className="text-sm text-orange-700 mt-1 space-y-1">
                    <li>• Crew manifest and vital statistics</li>
                    <li>• Chart your health destination</li>
                    <li>• Maritime safety protocols</li>
                    <li>• Galley preferences and operations</li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-4">
              Estimated voyage time: 3-5 minutes to complete your crew profile.
            </p>
          </div>
        )

      case 'crew_manifest':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <User className="w-12 h-12 text-orange-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900">Crew Manifest</h3>
              <p className="text-gray-600">Record your vital statistics for the ship's log</p>
              <p className="text-sm text-gray-500 mt-2">
                <em>Optional: You can navigate past this waypoint and add details during your voyage</em>
              </p>
            </div>

            {/* Unit Preferences */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Measurement Standards</h4>
              <UnitPreferences
                currentWeightUnit={profileData.weight_unit}
                currentHeightUnit={profileData.height_unit}
                onWeightUnitChange={(unit) => updateProfileData({ weight_unit: unit })}
                onHeightUnitChange={(unit) => updateProfileData({ height_unit: unit })}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crew Weight ({profileData.weight_unit})
                </label>
                <input
                  type="number"
                  value={profileData.weight_value || ''}
                  onChange={(e) => updateProfileData({ weight_value: parseFloat(e.target.value) || undefined })}
                  placeholder={profileData.weight_unit === 'kg' ? '70' : '154'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Height */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crew Height ({profileData.height_unit})
                </label>
                <input
                  type="number"
                  value={profileData.height_value || ''}
                  onChange={(e) => updateProfileData({ height_value: parseFloat(e.target.value) || undefined })}
                  placeholder={profileData.height_unit === 'cm' ? '175' : '5.75'}
                  step={profileData.height_unit === 'cm' ? '1' : '0.01'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Crew Member Age</label>
                <input
                  type="number"
                  value={profileData.age || ''}
                  onChange={(e) => updateProfileData({ age: parseInt(e.target.value) || undefined })}
                  placeholder="30"
                  min="13"
                  max="120"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Crew Member Gender (for calculations)</label>
                <select
                  value={profileData.gender || 'other'}
                  onChange={(e) => updateProfileData({ gender: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="other">Prefer not to specify</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Used only for calorie calculations (BMR formula)
                </p>
              </div>
            </div>

            {/* Calculated Preview */}
            {calculatedTargets && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Daily Provisions Calculation</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-green-800">{calculatedTargets.calories}</div>
                    <div className="text-green-600">Calories</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-800">{calculatedTargets.protein}g</div>
                    <div className="text-green-600">Protein</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-800">{calculatedTargets.carbs}g</div>
                    <div className="text-green-600">Carbs</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-800">{calculatedTargets.fat}g</div>
                    <div className="text-green-600">Fat</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 'destination':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Compass className="w-12 h-12 text-orange-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900">Chart Your Course</h3>
              <p className="text-gray-600">Set your health and fitness destination</p>
              <p className="text-sm text-gray-500 mt-2">
                <em>Optional: You can navigate past this waypoint and set course later</em>
              </p>
            </div>

            <div className="space-y-6">
              {/* Primary Goal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Navigation Destination</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(GOAL_ADJUSTMENTS).map(([key, goal]) => (
                    <button
                      key={key}
                      onClick={() => updateProfileData({ primary_goal: key })}
                      className={`p-4 text-left border rounded-lg transition-colors ${
                        profileData.primary_goal === key
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium capitalize">{key.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-600 mt-1">{goal.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Ship Activity Level</label>
                <div className="space-y-3">
                  {Object.entries(ACTIVITY_LEVELS).map(([key, activity]) => (
                    <button
                      key={key}
                      onClick={() => updateProfileData({ activity_level: key })}
                      className={`w-full p-4 text-left border rounded-lg transition-colors ${
                        profileData.activity_level === key
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium capitalize">{key.replace('_', ' ')}</div>
                          <div className="text-sm text-gray-600 mt-1">{activity.description}</div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {activity.multiplier}x BMR
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case 'navigation_rules':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Anchor className="w-12 h-12 text-orange-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900">Maritime Safety Protocols</h3>
              <p className="text-gray-600">Essential dietary restrictions and health guidelines</p>
            </div>

            <DietaryRestrictionsManager
              restrictions={profileData.dietary_restrictions}
              onChange={(restrictions) => updateProfileData({ dietary_restrictions: restrictions })}
            />
          </div>
        )

      case 'galley_favorites':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Heart className="w-12 h-12 text-orange-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900">Galley Preferences</h3>
              <p className="text-gray-600">Your favorite provisions and culinary traditions</p>
            </div>

            <div className="space-y-6">
              {/* Diet Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Galley Style</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(DIET_TYPES).map(([key, diet]) => (
                    <button
                      key={key}
                      onClick={() => updateProfileData({ preferred_diet_type: key })}
                      className={`p-4 text-left border rounded-lg transition-colors ${
                        profileData.preferred_diet_type === key
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium capitalize">{key.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        P: {Math.round(diet.proteinRatio * 100)}% |
                        C: {Math.round(diet.carbRatio * 100)}% |
                        F: {Math.round(diet.fatRatio * 100)}%
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Food Preferences */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Favorite Provisions</label>
                  <textarea
                    value={profileData.food_likes || ''}
                    onChange={(e) => updateProfileData({ food_likes: e.target.value })}
                    placeholder="List foods you enjoy..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Foods to Avoid</label>
                  <textarea
                    value={profileData.food_dislikes || ''}
                    onChange={(e) => updateProfileData({ food_dislikes: e.target.value })}
                    placeholder="List foods you prefer to avoid..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 'ship_operations':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Ship className="w-12 h-12 text-orange-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900">Ship Operations</h3>
              <p className="text-gray-600">Galley capacity, provisions budget, and crew logistics</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Crew Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Crew Size</label>
                <input
                  type="number"
                  value={profileData.household_size}
                  onChange={(e) => updateProfileData({ household_size: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Daily Meals */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Daily Meal Count</label>
                <select
                  value={profileData.preferred_meal_count}
                  onChange={(e) => updateProfileData({ preferred_meal_count: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value={2}>2 meals per day</option>
                  <option value={3}>3 meals per day</option>
                  <option value={4}>4 meals per day</option>
                  <option value={5}>5 meals per day</option>
                  <option value={6}>6 meals per day</option>
                </select>
              </div>

              {/* Cooking Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Galley Time (minutes)</label>
                <select
                  value={profileData.max_cooking_time_minutes}
                  onChange={(e) => updateProfileData({ max_cooking_time_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value={15}>15 minutes (Quick prep)</option>
                  <option value={30}>30 minutes (Standard)</option>
                  <option value={60}>60 minutes (Extended)</option>
                  <option value={90}>90 minutes (Elaborate)</option>
                  <option value={120}>120+ minutes (Gourmet)</option>
                </select>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Provisions Budget</label>
                <select
                  value={profileData.budget_range}
                  onChange={(e) => updateProfileData({ budget_range: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="budget">Budget-friendly</option>
                  <option value="moderate">Moderate</option>
                  <option value="premium">Premium</option>
                  <option value="luxury">Luxury</option>
                </select>
              </div>
            </div>
          </div>
        )

      case 'ready_to_sail':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-12 h-12 text-orange-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900">Ready to Set Sail</h3>
              <p className="text-gray-600">Final inspection before launching your meal planning voyage</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h4 className="font-medium text-green-900 mb-4">Crew Profile Summary</h4>
              <div className="space-y-3 text-sm">
                {profileData.weight_value && profileData.height_value && (
                  <div className="flex justify-between">
                    <span className="text-green-700">Physical Stats:</span>
                    <span className="text-green-800 font-medium">
                      {profileData.weight_value}{profileData.weight_unit}, {profileData.height_value}{profileData.height_unit}
                      {profileData.age && `, ${profileData.age} years`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-green-700">Navigation Goal:</span>
                  <span className="text-green-800 font-medium capitalize">
                    {profileData.primary_goal.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Activity Level:</span>
                  <span className="text-green-800 font-medium capitalize">
                    {profileData.activity_level.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Crew Size:</span>
                  <span className="text-green-800 font-medium">{profileData.household_size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Daily Meals:</span>
                  <span className="text-green-800 font-medium">{profileData.preferred_meal_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Dietary Restrictions:</span>
                  <span className="text-green-800 font-medium">{profileData.dietary_restrictions.length}</span>
                </div>
              </div>
            </div>

            {calculatedTargets && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h4 className="font-medium text-orange-900 mb-4">Daily Nutritional Targets</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-orange-800 text-lg">{calculatedTargets.calories}</div>
                    <div className="text-orange-600">Calories</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-orange-800 text-lg">{calculatedTargets.protein}g</div>
                    <div className="text-orange-600">Protein</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-orange-800 text-lg">{calculatedTargets.carbs}g</div>
                    <div className="text-orange-600">Carbs</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-orange-800 text-lg">{calculatedTargets.fat}g</div>
                    <div className="text-orange-600">Fat</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="text-center py-8">
            <div className="mb-6">
              <Compass className="w-12 h-12 text-orange-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900">{waypoint.title}</h3>
              <p className="text-gray-600">{waypoint.subtitle}</p>
              {waypoint.description && (
                <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                  {waypoint.description}
                </p>
              )}
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-orange-700 text-sm">
                This waypoint is under construction. Please continue to the next waypoint.
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="max-w-4xl mx-auto">
        {/* Navigation Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Crew Profile Navigator</h2>
              <p className="text-gray-600 text-sm">Waypoint {currentWaypoint + 1} of {NAVIGATION_WAYPOINTS.length}</p>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Navigation Progress */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentWaypoint + 1) / NAVIGATION_WAYPOINTS.length) * 100}%` }}
            />
          </div>

          {/* Waypoint Indicators */}
          <div className="flex justify-between mt-4">
            {NAVIGATION_WAYPOINTS.map((waypoint, index) => (
              <div
                key={waypoint.id}
                className={`flex flex-col items-center space-y-2 ${
                  index <= currentWaypoint ? 'text-orange-600' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    index < currentWaypoint
                      ? 'bg-orange-600 text-white'
                      : index === currentWaypoint
                      ? 'bg-orange-100 text-orange-600 border-2 border-orange-600'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {index < currentWaypoint ? <CheckCircle className="w-4 h-4" /> : index + 1}
                </div>
                <div className="text-xs text-center max-w-16">
                  {waypoint.title.split(' ')[0]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Waypoint Content */}
        <div className="p-6 min-h-96">
          {/* Current Waypoint Description */}
          {NAVIGATION_WAYPOINTS[currentWaypoint].description && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Compass className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Navigation Notes</h4>
                  <p className="text-blue-700 text-sm mt-1">
                    {NAVIGATION_WAYPOINTS[currentWaypoint].description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {renderWaypointContent()}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Navigation Issues Detected:</h4>
                  <ul className="mt-2 text-sm text-red-700 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={navigateBack}
            disabled={currentWaypoint === 0}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-3">
            {/* Skip button for optional waypoints */}
            {canSkipWaypoint() && currentWaypoint !== NAVIGATION_WAYPOINTS.length - 1 && (
              <button
                onClick={navigateForward}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <span>Skip Waypoint</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {currentWaypoint === NAVIGATION_WAYPOINTS.length - 1 ? (
              <button
                onClick={completeCourse}
                className="flex items-center space-x-2 bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Set Sail</span>
              </button>
            ) : (
              <button
                onClick={navigateForward}
                className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
