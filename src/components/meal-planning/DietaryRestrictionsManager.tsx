'use client'

import { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  Plus, 
  X, 
  Heart, 
  Shield, 
  Utensils,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react'

export interface DietaryRestriction {
  id?: string
  restriction_type: 'allergy' | 'dietary_preference' | 'medical_restriction' | 'religious_restriction'
  restriction_value: string
  severity: 'mild' | 'moderate' | 'severe' | 'absolute'
  notes?: string
}

interface DietaryRestrictionsManagerProps {
  restrictions: DietaryRestriction[]
  onChange: (restrictions: DietaryRestriction[]) => void
  className?: string
}

// Common allergens and ingredients
const COMMON_ALLERGENS = [
  'nuts', 'peanuts', 'tree nuts', 'dairy', 'milk', 'eggs', 'shellfish', 
  'fish', 'soy', 'wheat', 'gluten', 'sesame', 'mustard', 'celery', 'lupin'
]

const COMMON_DISLIKES = [
  'mushrooms', 'onions', 'garlic', 'cilantro', 'olives', 'tomatoes',
  'bell peppers', 'spicy food', 'seafood', 'organ meat', 'blue cheese',
  'anchovies', 'coconut', 'avocado', 'eggplant', 'brussels sprouts'
]

const DIET_TYPES = [
  'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'mediterranean',
  'low_carb', 'low_fat', 'diabetic_friendly', 'heart_healthy', 'dash',
  'whole30', 'carnivore', 'raw_food', 'macrobiotic'
]

const MEDICAL_RESTRICTIONS = [
  'low_sodium', 'low_sugar', 'low_cholesterol', 'low_potassium',
  'renal_diet', 'cardiac_diet', 'diabetic', 'gout_friendly',
  'acid_reflux_friendly', 'ibs_friendly', 'fodmap_free'
]

const RELIGIOUS_RESTRICTIONS = [
  'halal', 'kosher', 'hindu_vegetarian', 'jain_vegetarian',
  'buddhist_vegetarian', 'no_pork', 'no_beef', 'no_alcohol'
]

const SEVERITY_COLORS = {
  mild: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  moderate: 'bg-orange-50 border-orange-200 text-orange-800',
  severe: 'bg-red-50 border-red-200 text-red-800',
  absolute: 'bg-red-100 border-red-300 text-red-900'
}

const SEVERITY_DESCRIPTIONS = {
  mild: 'Prefer to avoid but can tolerate occasionally',
  moderate: 'Should avoid in most cases',
  severe: 'Must avoid - causes significant discomfort',
  absolute: 'Never consume - medical necessity'
}

export default function DietaryRestrictionsManager({
  restrictions,
  onChange,
  className = ''
}: DietaryRestrictionsManagerProps) {
  const [activeTab, setActiveTab] = useState<'allergies' | 'dislikes' | 'medical' | 'religious'>('allergies')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRestriction, setNewRestriction] = useState<Partial<DietaryRestriction>>({
    restriction_type: 'allergy',
    severity: 'moderate',
    restriction_value: '',
    notes: ''
  })

  const getRestrictionsByType = (type: DietaryRestriction['restriction_type']) => {
    return restrictions.filter(r => r.restriction_type === type)
  }

  const addRestriction = () => {
    if (!newRestriction.restriction_value?.trim()) return

    const restriction: DietaryRestriction = {
      restriction_type: newRestriction.restriction_type!,
      restriction_value: newRestriction.restriction_value.trim().toLowerCase(),
      severity: newRestriction.severity!,
      notes: newRestriction.notes?.trim() || undefined
    }

    // Check for duplicates
    const exists = restrictions.some(r => 
      r.restriction_type === restriction.restriction_type &&
      r.restriction_value === restriction.restriction_value
    )

    if (!exists) {
      onChange([...restrictions, restriction])
    }

    // Reset form
    setNewRestriction({
      restriction_type: activeTab === 'allergies' ? 'allergy' : 
                      activeTab === 'dislikes' ? 'dietary_preference' :
                      activeTab === 'medical' ? 'medical_restriction' : 'religious_restriction',
      severity: 'moderate',
      restriction_value: '',
      notes: ''
    })
    setShowAddForm(false)
  }

  const removeRestriction = (index: number) => {
    const newRestrictions = [...restrictions]
    newRestrictions.splice(index, 1)
    onChange(newRestrictions)
  }

  const getSuggestions = () => {
    switch (activeTab) {
      case 'allergies': return COMMON_ALLERGENS
      case 'dislikes': return COMMON_DISLIKES
      case 'diet_types': return DIET_TYPES
      case 'medical': return MEDICAL_RESTRICTIONS
      case 'religious': return RELIGIOUS_RESTRICTIONS
      default: return []
    }
  }

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'allergies': return <AlertTriangle className="w-4 h-4" />
      case 'dislikes': return <XCircle className="w-4 h-4" />
      case 'diet_types': return <Heart className="w-4 h-4" />
      case 'medical': return <Shield className="w-4 h-4" />
      case 'religious': return <Utensils className="w-4 h-4" />
      default: return null
    }
  }

  const getRestrictionTypeForTab = (tab: string): DietaryRestriction['restriction_type'] => {
    switch (tab) {
      case 'allergies': return 'allergy'
      case 'dislikes': return 'dietary_preference'
      case 'diet_types': return 'dietary_preference'
      case 'medical': return 'medical_restriction'
      case 'religious': return 'religious_restriction'
      default: return 'dietary_preference'
    }
  }

  useEffect(() => {
    setNewRestriction(prev => ({
      ...prev,
      restriction_type: getRestrictionTypeForTab(activeTab)
    }))
  }, [activeTab])

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Dietary Restrictions & Preferences</h3>
            <p className="text-gray-600 text-sm mt-1">
              Manage your allergies, food preferences, and dietary requirements
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {restrictions.length} restriction{restrictions.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
          {[
            { key: 'allergies', label: 'Allergies', count: getRestrictionsByType('allergy').length },
            { key: 'dislikes', label: 'Dislikes', count: getRestrictionsByType('dietary_preference').length },
            { key: 'medical', label: 'Medical', count: getRestrictionsByType('medical_restriction').length },
            { key: 'religious', label: 'Religious', count: getRestrictionsByType('religious_restriction').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {getTabIcon(tab.key)}
              <span className="font-medium">{tab.label}</span>
              {tab.count > 0 && (
                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Current Restrictions */}
          <div className="space-y-3">
            {(() => {
              let currentRestrictions: DietaryRestriction[] = []
              
              if (activeTab === 'allergies') {
                currentRestrictions = getRestrictionsByType('allergy')
              } else if (activeTab === 'dislikes') {
                currentRestrictions = getRestrictionsByType('dietary_preference')
              } else if (activeTab === 'medical') {
                currentRestrictions = getRestrictionsByType('medical_restriction')
              } else if (activeTab === 'religious') {
                currentRestrictions = getRestrictionsByType('religious_restriction')
              }

              return currentRestrictions.length > 0 ? (
                currentRestrictions.map((restriction, index) => (
                  <div
                    key={`${restriction.restriction_type}-${restriction.restriction_value}-${index}`}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      restriction.restriction_type === 'allergy' 
                        ? SEVERITY_COLORS[restriction.severity]
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium capitalize">
                          {restriction.restriction_value.replace('_', ' ')}
                        </span>
                        {restriction.restriction_type === 'allergy' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                            {restriction.severity}
                          </span>
                        )}
                      </div>
                      {restriction.notes && (
                        <p className="text-sm text-gray-600 mt-1">{restriction.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeRestriction(restrictions.indexOf(restriction))}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🍽️</div>
                  <p>No {activeTab.replace('_', ' ')} added yet</p>
                  <p className="text-sm">Click "Add New" to get started</p>
                </div>
              )
            })()}
          </div>

          {/* Add New Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-500 hover:text-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New {activeTab.slice(0, -1).replace('_', ' ')}</span>
            </button>
          )}

          {/* Add Form */}
          {showAddForm && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {activeTab === 'allergies' ? 'Allergen' :
                     activeTab === 'dislikes' ? 'Food/Ingredient' :
                     activeTab === 'medical' ? 'Medical Restriction' : 'Religious Restriction'}
                  </label>
                  <input
                    type="text"
                    value={newRestriction.restriction_value || ''}
                    onChange={(e) => setNewRestriction(prev => ({ ...prev, restriction_value: e.target.value }))}
                    placeholder={`Enter ${activeTab === 'allergies' ? 'allergen' : 'restriction'}...`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  
                  {/* Suggestions */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {getSuggestions().slice(0, 8).map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => setNewRestriction(prev => ({ ...prev, restriction_value: suggestion }))}
                        className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:border-orange-500 hover:text-orange-600 transition-colors"
                      >
                        {suggestion.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Severity (only for allergies and medical) */}
                {(activeTab === 'allergies' || activeTab === 'medical') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Severity Level</label>
                    <select
                      value={newRestriction.severity}
                      onChange={(e) => setNewRestriction(prev => ({ ...prev, severity: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {Object.entries(SEVERITY_DESCRIPTIONS).map(([level, description]) => (
                        <option key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)} - {description}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={newRestriction.notes || ''}
                    onChange={(e) => setNewRestriction(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional details or context..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addRestriction}
                    disabled={!newRestriction.restriction_value?.trim()}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Restriction
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How this helps your meal planning:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• <strong>Allergies</strong> are completely excluded from all recommendations</li>
                <li>• <strong>Dislikes</strong> are avoided but can be overridden if specifically requested</li>
                <li>• <strong>Medical restrictions</strong> ensure your health requirements are met</li>
                <li>• <strong>Religious restrictions</strong> are respected in all meal planning</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
