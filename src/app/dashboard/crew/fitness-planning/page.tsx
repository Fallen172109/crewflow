'use client'

import { useState } from 'react'
import { Dumbbell, Target, Activity, TrendingUp } from 'lucide-react'

export default function FitnessPlanningPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-8 rounded-lg mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Dumbbell className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Fitness Planning</h1>
              <p className="text-blue-100 mt-2">Workout routines and wellness tracking</p>
            </div>
          </div>
        </div>

        {/* Coming Soon Content */}
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Dumbbell className="w-12 h-12 text-blue-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Fitness Planning Tools</h2>
            <p className="text-gray-600 mb-8">
              Comprehensive fitness planning and workout tools are coming soon. This will include personalized workout routines, 
              progress tracking, goal setting, and wellness monitoring.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-gray-50 rounded-lg">
                <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900">Goal Setting</h3>
                <p className="text-sm text-gray-600">Set and track fitness goals</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900">Workout Plans</h3>
                <p className="text-sm text-gray-600">Personalized exercise routines</p>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              For now, you can access fitness planning tools through individual AI agents in the crew section.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
