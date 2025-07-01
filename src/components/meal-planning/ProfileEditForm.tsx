'use client'

import { useState } from 'react'
import { Save, X, Trash2, User, Target, Activity, Scale, Ruler } from 'lucide-react'

interface ProfileEditFormProps {
  profile: any
  onSave: (profileData: any) => void
  onCancel: () => void
  onDelete?: () => void
  className?: string
}

export default function ProfileEditForm({
  profile,
  onSave,
  onCancel,
  onDelete,
  className = ''
}: ProfileEditFormProps) {
  const [formData, setFormData] = useState({
    // Physical Stats
    height_value: profile?.height_value || '',
    height_unit: profile?.height_unit || 'cm',
    weight_value: profile?.weight_value || '',
    weight_unit: profile?.weight_unit || 'kg',
    age: profile?.age || '',
    gender: profile?.gender || '',

    // Goals & Timeline
    primary_goal: profile?.primary_goal || 'maintenance',
    target_weight: profile?.target_weight || '',
    target_date: profile?.target_date || '',
    timeline_duration_weeks: profile?.timeline_duration_weeks || '',

    // Activity & Lifestyle
    activity_level: profile?.activity_level || 'moderately_active',
    household_size: profile?.household_size || 1,
    preferred_meal_count: profile?.preferred_meal_count || 3,
    max_cooking_time_minutes: profile?.max_cooking_time_minutes || 60,
    budget_range: profile?.budget_range || 'moderate'
  })

  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Convert string values to numbers where needed
      const processedData = {
        ...formData,
        height_value: formData.height_value ? parseFloat(formData.height_value.toString()) : null,
        weight_value: formData.weight_value ? parseFloat(formData.weight_value.toString()) : null,
        age: formData.age ? parseInt(formData.age.toString()) : null,
        target_weight: formData.target_weight ? parseFloat(formData.target_weight.toString()) : null,
        timeline_duration_weeks: formData.timeline_duration_weeks ? parseInt(formData.timeline_duration_weeks.toString()) : null,
        household_size: parseInt(formData.household_size.toString()),
        preferred_meal_count: parseInt(formData.preferred_meal_count.toString()),
        max_cooking_time_minutes: parseInt(formData.max_cooking_time_minutes.toString())
      }

      await onSave(processedData)
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Edit Profile</h3>
          <div className="flex items-center space-x-2">
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Delete Profile"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Physical Information */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-5 h-5 text-orange-600" />
            <h4 className="text-lg font-medium text-gray-900">Physical Information</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Height
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={formData.height_value}
                  onChange={(e) => updateField('height_value', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="175"
                />
                <select
                  value={formData.height_unit}
                  onChange={(e) => updateField('height_unit', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="cm">cm</option>
                  <option value="ft">ft</option>
                  <option value="in">in</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={formData.weight_value}
                  onChange={(e) => updateField('weight_value', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="70"
                />
                <select
                  value={formData.weight_unit}
                  onChange={(e) => updateField('weight_unit', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                  <option value="stone">stone</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age (optional)
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => updateField('age', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender (optional)
              </label>
              <select
                value={formData.gender}
                onChange={(e) => updateField('gender', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Goals & Timeline */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Target className="w-5 h-5 text-orange-600" />
            <h4 className="text-lg font-medium text-gray-900">Goals & Timeline</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Goal *
              </label>
              <select
                value={formData.primary_goal}
                onChange={(e) => updateField('primary_goal', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              >
                <option value="weight_loss">Weight Loss</option>
                <option value="weight_gain">Weight Gain</option>
                <option value="muscle_gain">Muscle Gain</option>
                <option value="maintenance">Maintenance</option>
                <option value="athletic_performance">Athletic Performance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity Level *
              </label>
              <select
                value={formData.activity_level}
                onChange={(e) => updateField('activity_level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              >
                <option value="sedentary">Sedentary (little/no exercise)</option>
                <option value="lightly_active">Lightly Active (light exercise 1-3 days/week)</option>
                <option value="moderately_active">Moderately Active (moderate exercise 3-5 days/week)</option>
                <option value="very_active">Very Active (hard exercise 6-7 days/week)</option>
                <option value="extremely_active">Extremely Active (very hard exercise, physical job)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lifestyle Preferences */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="w-5 h-5 text-orange-600" />
            <h4 className="text-lg font-medium text-gray-900">Lifestyle Preferences</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Household Size
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.household_size}
                onChange={(e) => updateField('household_size', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Meals per Day
              </label>
              <select
                value={formData.preferred_meal_count}
                onChange={(e) => updateField('preferred_meal_count', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="2">2 meals</option>
                <option value="3">3 meals</option>
                <option value="4">4 meals</option>
                <option value="5">5 meals</option>
                <option value="6">6 meals</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Cooking Time (minutes)
              </label>
              <select
                value={formData.max_cooking_time_minutes}
                onChange={(e) => updateField('max_cooking_time_minutes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Range
              </label>
              <select
                value={formData.budget_range}
                onChange={(e) => updateField('budget_range', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="budget">Budget-friendly</option>
                <option value="moderate">Moderate</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
