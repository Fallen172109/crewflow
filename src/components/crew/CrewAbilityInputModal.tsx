'use client'

import { useState, useEffect } from 'react'
import { X, Send, Loader2 } from 'lucide-react'

interface CrewAbilityInputModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: string, additionalData?: Record<string, any>) => void
  ability: {
    id: string
    label: string
    description: string
    agentName: string
    agentColor: string
    icon: string
  }
  loading?: boolean
}

interface InputField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number'
  placeholder?: string
  options?: string[]
  required?: boolean
  description?: string
}

// Define input schemas for different ability types
const getInputSchema = (abilityId: string): InputField[] => {
  switch (abilityId) {
    case 'image_generator':
    case 'visual_content_creator':
    case 'branded_social_visuals':
    case 'seo_visual_content':
      const baseFields = [
        {
          id: 'prompt',
          label: 'Image Description',
          type: 'textarea',
          placeholder: 'Describe the image you want to create in detail...',
          required: true,
          description: 'Be specific about style, colors, composition, and subject matter'
        },
        {
          id: 'style',
          label: 'Art Style',
          type: 'select',
          options: ['Photorealistic', 'Digital Art', 'Oil Painting', 'Watercolor', 'Sketch', 'Cartoon', 'Abstract'],
          required: false
        },
        {
          id: 'aspect_ratio',
          label: 'Aspect Ratio',
          type: 'select',
          options: ['Square (1:1)', 'Portrait (3:4)', 'Landscape (4:3)', 'Wide (16:9)'],
          required: false
        }
      ]

      // Add business context fields for project-aware image generation
      if (abilityId === 'branded_social_visuals') {
        return [
          ...baseFields,
          {
            id: 'brand_name',
            label: 'Brand Name',
            type: 'text',
            placeholder: 'Your brand or company name...',
            required: false,
            description: 'Include your brand name for consistent branding'
          },
          {
            id: 'platform',
            label: 'Social Media Platform',
            type: 'select',
            options: ['Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'TikTok', 'YouTube', 'General'],
            required: false,
            description: 'Optimize for specific platform requirements'
          },
          {
            id: 'campaign_context',
            label: 'Campaign Context',
            type: 'textarea',
            placeholder: 'Describe your marketing campaign or project context...',
            required: false,
            description: 'Provide context about your marketing goals or campaign'
          }
        ]
      }

      if (abilityId === 'seo_visual_content') {
        return [
          ...baseFields,
          {
            id: 'target_keywords',
            label: 'Target Keywords',
            type: 'text',
            placeholder: 'SEO keywords to optimize for...',
            required: false,
            description: 'Keywords to consider for alt text and metadata'
          },
          {
            id: 'content_topic',
            label: 'Content Topic',
            type: 'text',
            placeholder: 'Main topic or theme of your content...',
            required: false,
            description: 'The main subject matter for SEO optimization'
          },
          {
            id: 'target_audience',
            label: 'Target Audience',
            type: 'text',
            placeholder: 'Who is your target audience?',
            required: false,
            description: 'Describe your intended audience for better targeting'
          }
        ]
      }

      return baseFields

    case 'crew_meal_planner':
    case 'meal_prep_workflow':
      return [
        {
          id: 'preferences',
          label: 'Meal Planning Request',
          type: 'textarea',
          placeholder: 'What kind of meal plan do you need? Include preferences, goals, and any specific requirements...',
          required: true,
          description: 'Describe your dietary goals, preferred cuisines, cooking time constraints, etc.'
        },
        {
          id: 'people_count',
          label: 'Number of People',
          type: 'number',
          placeholder: '2',
          required: true
        },
        {
          id: 'dietary_restrictions',
          label: 'Dietary Restrictions',
          type: 'multiselect',
          options: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb', 'Paleo', 'Mediterranean'],
          required: false
        },
        {
          id: 'duration',
          label: 'Planning Duration',
          type: 'select',
          options: ['1 day', '3 days', '1 week', '2 weeks', '1 month'],
          required: true
        }
      ]

    case 'crew_fitness_planner':
    case 'fitness_automation':
      return [
        {
          id: 'goals',
          label: 'Fitness Goals & Requirements',
          type: 'textarea',
          placeholder: 'Describe your fitness goals, current level, available time, and any specific requirements...',
          required: true,
          description: 'Include your fitness level, goals (weight loss, muscle gain, endurance), time availability, and preferences'
        },
        {
          id: 'fitness_level',
          label: 'Current Fitness Level',
          type: 'select',
          options: ['Beginner', 'Intermediate', 'Advanced', 'Professional'],
          required: true
        },
        {
          id: 'equipment',
          label: 'Available Equipment',
          type: 'multiselect',
          options: ['No Equipment', 'Dumbbells', 'Resistance Bands', 'Pull-up Bar', 'Full Gym Access', 'Cardio Equipment'],
          required: false
        },
        {
          id: 'time_per_session',
          label: 'Time Per Session',
          type: 'select',
          options: ['15-30 minutes', '30-45 minutes', '45-60 minutes', '60+ minutes'],
          required: true
        }
      ]

    case 'productivity_compass':
    case 'productivity_optimizer':
    case 'productivity_orchestrator':
      return [
        {
          id: 'productivity_request',
          label: 'Productivity Challenge',
          type: 'textarea',
          placeholder: 'Describe your productivity challenge, goals, or what you need help organizing...',
          required: true,
          description: 'Explain your current workflow, challenges, and what you want to improve or organize'
        },
        {
          id: 'focus_area',
          label: 'Focus Area',
          type: 'select',
          options: ['Task Management', 'Time Blocking', 'Goal Setting', 'Habit Building', 'Workflow Optimization', 'Digital Organization'],
          required: false
        },
        {
          id: 'tools_used',
          label: 'Tools You Currently Use',
          type: 'text',
          placeholder: 'e.g., Notion, Todoist, Google Calendar...',
          required: false
        }
      ]

    case 'budget_navigator':
      return [
        {
          id: 'budget_request',
          label: 'Budget Planning Request',
          type: 'textarea',
          placeholder: 'Describe your budgeting needs, financial goals, or expense tracking requirements...',
          required: true,
          description: 'Include your income range, major expenses, savings goals, and what you need help with'
        },
        {
          id: 'budget_type',
          label: 'Budget Type',
          type: 'select',
          options: ['Personal Budget', 'Household Budget', 'Business Budget', 'Project Budget', 'Event Budget'],
          required: true
        },
        {
          id: 'timeframe',
          label: 'Budget Timeframe',
          type: 'select',
          options: ['Monthly', 'Quarterly', 'Yearly', 'One-time Project'],
          required: true
        }
      ]

    case 'knowledge_organizer':
      return [
        {
          id: 'knowledge_request',
          label: 'Knowledge Organization Request',
          type: 'textarea',
          placeholder: 'What knowledge or information do you need help organizing? Include your learning goals...',
          required: true,
          description: 'Describe the subject matter, your current knowledge level, and how you want to organize it'
        },
        {
          id: 'subject_area',
          label: 'Subject Area',
          type: 'text',
          placeholder: 'e.g., Programming, Marketing, History...',
          required: false
        },
        {
          id: 'organization_method',
          label: 'Preferred Organization Method',
          type: 'select',
          options: ['Mind Maps', 'Hierarchical Notes', 'Flashcards', 'Study Guides', 'Reference Sheets'],
          required: false
        }
      ]

    case 'home_quartermaster':
      return [
        {
          id: 'household_request',
          label: 'Household Organization Request',
          type: 'textarea',
          placeholder: 'What household tasks, supplies, or maintenance do you need help organizing?',
          required: true,
          description: 'Describe your household size, main challenges, and what you want to organize or track'
        },
        {
          id: 'household_size',
          label: 'Household Size',
          type: 'number',
          placeholder: '3',
          required: false
        },
        {
          id: 'focus_area',
          label: 'Focus Area',
          type: 'select',
          options: ['Supply Inventory', 'Maintenance Schedule', 'Cleaning Routine', 'Meal Planning', 'Budget Tracking'],
          required: false
        }
      ]

    // Meal Planning Tools
    case 'meal_plan_generator':
      return [
        {
          id: 'request',
          label: 'Meal Planning Request',
          type: 'textarea',
          placeholder: 'Describe your meal planning needs, goals, or specific requirements...',
          required: true,
          description: 'Include any specific dietary needs, time constraints, or preferences'
        },
        // User Profile Section
        {
          id: 'height_value',
          label: 'Height',
          type: 'number',
          placeholder: '170',
          required: false,
          description: 'Your height (will use unit preference below)'
        },
        {
          id: 'height_unit',
          label: 'Height Unit',
          type: 'select',
          options: ['cm', 'm', 'ft_in', 'inches'],
          required: false
        },
        {
          id: 'weight_value',
          label: 'Weight',
          type: 'number',
          placeholder: '70',
          required: false,
          description: 'Your current weight (will use unit preference below)'
        },
        {
          id: 'weight_unit',
          label: 'Weight Unit',
          type: 'select',
          options: ['kg', 'g', 'lbs', 'oz', 'stone'],
          required: false
        },
        {
          id: 'primary_goal',
          label: 'Primary Goal',
          type: 'select',
          options: ['weight_loss', 'weight_gain', 'muscle_building', 'maintenance', 'athletic_performance', 'health_improvement'],
          required: true
        },
        {
          id: 'activity_level',
          label: 'Activity Level',
          type: 'select',
          options: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'],
          required: true
        },
        {
          id: 'household_size',
          label: 'Household Size',
          type: 'number',
          placeholder: '2',
          required: false,
          description: 'Number of people to cook for'
        },
        // Dietary Restrictions
        {
          id: 'allergies',
          label: 'Food Allergies',
          type: 'multiselect',
          options: ['nuts', 'dairy', 'eggs', 'shellfish', 'fish', 'soy', 'wheat', 'gluten', 'sesame'],
          required: false,
          description: 'Select all that apply'
        },
        {
          id: 'dietary_preferences',
          label: 'Dietary Preferences',
          type: 'multiselect',
          options: ['vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'mediterranean', 'low_carb', 'low_fat', 'diabetic_friendly'],
          required: false,
          description: 'Select all that apply'
        },
        // Meal Planning Preferences
        {
          id: 'plan_duration_days',
          label: 'Plan Duration (Days)',
          type: 'number',
          placeholder: '7',
          required: false,
          description: 'How many days should the meal plan cover?'
        },
        {
          id: 'preferred_meal_count',
          label: 'Meals Per Day',
          type: 'select',
          options: ['2', '3', '4', '5', '6'],
          required: false
        },
        {
          id: 'max_cooking_time',
          label: 'Max Cooking Time (minutes)',
          type: 'number',
          placeholder: '60',
          required: false,
          description: 'Maximum time you want to spend cooking per meal'
        },
        {
          id: 'budget_range',
          label: 'Budget Range',
          type: 'select',
          options: ['budget', 'moderate', 'premium', 'no_limit'],
          required: false
        },
        {
          id: 'cuisine_preferences',
          label: 'Cuisine Preferences',
          type: 'multiselect',
          options: ['italian', 'asian', 'mediterranean', 'mexican', 'indian', 'american', 'french', 'thai', 'japanese', 'middle_eastern'],
          required: false,
          description: 'Select cuisines you enjoy'
        },
        // Pantry Integration
        {
          id: 'current_pantry',
          label: 'Current Pantry Items',
          type: 'textarea',
          placeholder: 'List ingredients you currently have available (e.g., chicken breast, rice, broccoli, olive oil...)',
          required: false,
          description: 'Help us suggest meals using ingredients you already have'
        }
      ]

    case 'nutrition_analyzer':
      return [
        {
          id: 'request',
          label: 'Nutrition Analysis Request',
          type: 'textarea',
          placeholder: 'What would you like me to analyze? (meal, recipe, daily intake, etc.)',
          required: true,
          description: 'Describe what you want analyzed and any specific nutritional concerns'
        },
        {
          id: 'analysis_type',
          label: 'Analysis Type',
          type: 'select',
          options: ['single_meal', 'daily_intake', 'recipe', 'ingredient_comparison', 'meal_plan_review'],
          required: true
        },
        {
          id: 'dietary_goals',
          label: 'Dietary Goals',
          type: 'multiselect',
          options: ['weight_loss', 'muscle_gain', 'heart_health', 'diabetes_management', 'general_wellness'],
          required: false
        }
      ]

    case 'recipe_optimizer':
      return [
        {
          id: 'request',
          label: 'Recipe Optimization Request',
          type: 'textarea',
          placeholder: 'What recipe would you like me to optimize or what ingredients do you want to use?',
          required: true,
          description: 'Include the original recipe or list of available ingredients'
        },
        {
          id: 'available_ingredients',
          label: 'Available Ingredients',
          type: 'textarea',
          placeholder: 'List all ingredients you have available...',
          required: false,
          description: 'Help me suggest the best recipes using what you have'
        },
        {
          id: 'optimization_goal',
          label: 'Optimization Goal',
          type: 'select',
          options: ['use_available_ingredients', 'healthier_version', 'lower_calories', 'higher_protein', 'budget_friendly', 'time_saving'],
          required: true
        },
        {
          id: 'dietary_restrictions',
          label: 'Dietary Restrictions',
          type: 'multiselect',
          options: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free', 'low_sodium', 'keto', 'paleo'],
          required: false
        }
      ]

    case 'dietary_consultation':
      return [
        {
          id: 'request',
          label: 'Dietary Consultation Request',
          type: 'textarea',
          placeholder: 'What dietary concerns or questions do you have?',
          required: true,
          description: 'Describe your dietary concerns, health goals, or questions about nutrition'
        },
        {
          id: 'health_conditions',
          label: 'Health Conditions',
          type: 'multiselect',
          options: ['diabetes', 'hypertension', 'heart_disease', 'digestive_issues', 'food_allergies', 'autoimmune', 'none'],
          required: false,
          description: 'Select any relevant health conditions (for informational purposes only)'
        },
        {
          id: 'current_diet',
          label: 'Current Diet Type',
          type: 'select',
          options: ['standard', 'vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean', 'intermittent_fasting', 'other'],
          required: false
        }
      ]

    case 'allergy_management':
      return [
        {
          id: 'request',
          label: 'Allergy Management Request',
          type: 'textarea',
          placeholder: 'What food allergies do you need help managing?',
          required: true,
          description: 'Describe your allergies and what kind of help you need'
        },
        {
          id: 'known_allergies',
          label: 'Known Food Allergies',
          type: 'multiselect',
          options: ['nuts', 'peanuts', 'dairy', 'eggs', 'shellfish', 'fish', 'soy', 'wheat', 'gluten', 'sesame', 'other'],
          required: true,
          description: 'Select all known food allergies'
        },
        {
          id: 'severity_level',
          label: 'Severity Level',
          type: 'select',
          options: ['mild', 'moderate', 'severe', 'life_threatening'],
          required: true,
          description: 'Highest severity level among your allergies'
        }
      ]

    case 'meal_prep_scheduler':
      return [
        {
          id: 'request',
          label: 'Meal Prep Scheduling Request',
          type: 'textarea',
          placeholder: 'What kind of meal prep schedule do you need help creating?',
          required: true,
          description: 'Describe your meal prep goals, time constraints, and preferences'
        },
        {
          id: 'prep_frequency',
          label: 'Prep Frequency',
          type: 'select',
          options: ['daily', 'every_other_day', 'twice_weekly', 'weekly', 'bi_weekly'],
          required: true
        },
        {
          id: 'available_time',
          label: 'Available Prep Time',
          type: 'select',
          options: ['30_minutes', '1_hour', '2_hours', '3_hours', '4_plus_hours'],
          required: true,
          description: 'How much time can you dedicate to meal prep?'
        },
        {
          id: 'storage_capacity',
          label: 'Storage Capacity',
          type: 'select',
          options: ['limited_fridge', 'standard_fridge', 'large_fridge', 'chest_freezer', 'multiple_freezers'],
          required: false,
          description: 'What storage space do you have available?'
        }
      ]

    case 'shopping_list_organizer':
      return [
        {
          id: 'request',
          label: 'Shopping List Organization Request',
          type: 'textarea',
          placeholder: 'What shopping list do you need help organizing?',
          required: true,
          description: 'Include your meal plan, dietary needs, or specific items you need'
        },
        {
          id: 'store_preference',
          label: 'Primary Store',
          type: 'select',
          options: ['grocery_chain', 'warehouse_store', 'local_market', 'specialty_stores', 'online_delivery'],
          required: false,
          description: 'Where do you usually shop?'
        },
        {
          id: 'organization_method',
          label: 'Organization Method',
          type: 'select',
          options: ['by_store_layout', 'by_category', 'by_priority', 'by_meal', 'by_recipe'],
          required: true,
          description: 'How would you like the list organized?'
        },
        {
          id: 'budget_consideration',
          label: 'Budget Consideration',
          type: 'select',
          options: ['strict_budget', 'moderate_budget', 'flexible_budget', 'no_budget_limit'],
          required: false
        }
      ]

    default:
      return [
        {
          id: 'request',
          label: 'Your Request',
          type: 'textarea',
          placeholder: 'Describe what you need help with...',
          required: true,
          description: 'Provide as much detail as possible to get the best results'
        }
      ]
  }
}

export default function CrewAbilityInputModal({
  isOpen,
  onClose,
  onSubmit,
  ability,
  loading = false
}: CrewAbilityInputModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [inputSchema, setInputSchema] = useState<InputField[]>([])

  useEffect(() => {
    if (isOpen) {
      const schema = getInputSchema(ability.id)
      setInputSchema(schema)
      // Initialize form data with empty values
      const initialData: Record<string, any> = {}
      schema.forEach(field => {
        if (field.type === 'multiselect') {
          initialData[field.id] = []
        } else {
          initialData[field.id] = ''
        }
      })
      setFormData(initialData)
    }
  }, [isOpen, ability.id])

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    const requiredFields = inputSchema.filter(field => field.required)
    const missingFields = requiredFields.filter(field => !formData[field.id] || formData[field.id] === '')
    
    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`)
      return
    }

    // Create the main prompt from the primary field (usually the first textarea)
    const primaryField = inputSchema.find(field => field.type === 'textarea') || inputSchema[0]
    const mainPrompt = formData[primaryField.id] || ''
    
    // Pass additional data for context
    const additionalData = { ...formData }
    delete additionalData[primaryField.id]
    
    onSubmit(mainPrompt, additionalData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: ability.agentColor }}
            >
              <span className="text-lg">⚓</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{ability.label}</h2>
              <p className="text-sm text-gray-600">by {ability.agentName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Maritime Mission:</strong> {ability.description}
            </p>
          </div>

          {inputSchema.map((field) => (
            <div key={field.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {field.description && (
                <p className="text-xs text-gray-500">{field.description}</p>
              )}

              {field.type === 'textarea' && (
                <textarea
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required={field.required}
                />
              )}

              {field.type === 'text' && (
                <input
                  type="text"
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required={field.required}
                />
              )}

              {field.type === 'number' && (
                <input
                  type="number"
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, parseInt(e.target.value) || '')}
                  placeholder={field.placeholder}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required={field.required}
                />
              )}

              {field.type === 'select' && (
                <select
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required={field.required}
                >
                  <option value="">Select an option...</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}

              {field.type === 'multiselect' && (
                <div className="space-y-2">
                  {field.options?.map((option) => (
                    <label key={option} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={(formData[field.id] || []).includes(option)}
                        onChange={(e) => {
                          const currentValues = formData[field.id] || []
                          if (e.target.checked) {
                            handleInputChange(field.id, [...currentValues, option])
                          } else {
                            handleInputChange(field.id, currentValues.filter((v: string) => v !== option))
                          }
                        }}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Starting Mission...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Start Mission</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
