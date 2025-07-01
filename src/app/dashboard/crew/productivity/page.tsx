'use client'

import { useState } from 'react'
import { Zap, CheckSquare, Clock, BarChart3 } from 'lucide-react'

export default function ProductivityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-8 rounded-lg mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Productivity Tools</h1>
              <p className="text-indigo-100 mt-2">Task management and life optimization</p>
            </div>
          </div>
        </div>

        {/* Coming Soon Content */}
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="w-12 h-12 text-indigo-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Productivity Tools</h2>
            <p className="text-gray-600 mb-8">
              Comprehensive productivity and task management tools are coming soon. This will include task organization, 
              time tracking, habit building, and personal optimization systems.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-gray-50 rounded-lg">
                <CheckSquare className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900">Task Management</h3>
                <p className="text-sm text-gray-600">Organize and prioritize tasks</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <Clock className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900">Time Tracking</h3>
                <p className="text-sm text-gray-600">Monitor time and productivity</p>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              For now, you can access productivity tools through individual AI agents in the crew section.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
