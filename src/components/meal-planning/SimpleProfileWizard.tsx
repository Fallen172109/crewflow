'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, User } from 'lucide-react'

interface SimpleProfileWizardProps {
  onComplete: (data: any) => void
  onCancel: () => void
}

export default function SimpleProfileWizard({ onComplete, onCancel }: SimpleProfileWizardProps) {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    weight_value: '',
    height_value: '',
    primary_goal: 'maintenance',
    activity_level: 'moderately_active'
  })

  const steps = [
    {
      title: 'Basic Info',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Information</h3>
          <div>
            <label className="block text-sm font-medium mb-2">Weight (kg)</label>
            <input
              type="number"
              value={formData.weight_value}
              onChange={(e) => setFormData(prev => ({ ...prev, weight_value: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="70"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Height (cm)</label>
            <input
              type="number"
              value={formData.height_value}
              onChange={(e) => setFormData(prev => ({ ...prev, height_value: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="175"
            />
          </div>
        </div>
      )
    },
    {
      title: 'Goals',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Your Goals</h3>
          <div>
            <label className="block text-sm font-medium mb-2">Primary Goal</label>
            <select
              value={formData.primary_goal}
              onChange={(e) => setFormData(prev => ({ ...prev, primary_goal: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="maintenance">Maintenance</option>
              <option value="weight_loss">Weight Loss</option>
              <option value="weight_gain">Weight Gain</option>
              <option value="muscle_building">Muscle Building</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Activity Level</label>
            <select
              value={formData.activity_level}
              onChange={(e) => setFormData(prev => ({ ...prev, activity_level: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="sedentary">Sedentary</option>
              <option value="lightly_active">Lightly Active</option>
              <option value="moderately_active">Moderately Active</option>
              <option value="very_active">Very Active</option>
            </select>
          </div>
        </div>
      )
    }
  ]

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      // Complete the wizard
      onComplete({
        weight_value: parseFloat(formData.weight_value),
        weight_unit: 'kg',
        height_value: parseFloat(formData.height_value),
        height_unit: 'cm',
        primary_goal: formData.primary_goal,
        activity_level: formData.activity_level,
        household_size: 1,
        preferred_meal_count: 3,
        max_cooking_time_minutes: 60,
        budget_range: 'moderate',
        dietary_restrictions: []
      })
    }
  }

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const canProceed = () => {
    if (step === 0) {
      return formData.weight_value && formData.height_value
    }
    return true
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg border">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Profile Setup</h2>
            <p className="text-gray-600 text-sm">Step {step + 1} of {steps.length}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-orange-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6 min-h-64">
        {steps[step].content}
      </div>

      {/* Navigation */}
      <div className="p-6 border-t border-gray-200 flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={step === 0}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>{step === steps.length - 1 ? 'Complete' : 'Next'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
