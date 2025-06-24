'use client'

import { useState, useEffect } from 'react'
import TideAgent from '@/components/agents/TideAgent'
import { useAuth } from '@/lib/auth-context'

export default function TestTidePage() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Tide Agent...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚢 CrewFlow - Tide Agent Test
          </h1>
          <p className="text-gray-600">
            Test the AutoGen-powered data analysis capabilities of Tide
          </p>
          {user && (
            <p className="text-sm text-gray-500 mt-2">
              Logged in as: {user.email}
            </p>
          )}
        </div>

        {/* Test Scenarios */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">💡 Test Scenarios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Data Analysis Requests:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• "Analyze our sales performance over the last quarter"</li>
                  <li>• "Create a dashboard for customer engagement metrics"</li>
                  <li>• "Identify trends in our website traffic data"</li>
                  <li>• "Build a predictive model for revenue forecasting"</li>
                  <li>• "Clean and prepare our customer database for analysis"</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">AutoGen Multi-Agent Process:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Planner Agent:</strong> Analyzes requirements and creates strategy</li>
                  <li>• <strong>Executor Agent:</strong> Performs statistical analysis</li>
                  <li>• <strong>Reviewer Agent:</strong> Validates results and methodology</li>
                  <li>• <strong>Coordinator Agent:</strong> Synthesizes final insights</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Tide Agent Component */}
        <TideAgent userId={user?.id} />

        {/* Features Overview */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">🌊 Tide Agent Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Multi-Agent Workflow</h3>
                <p className="text-sm text-gray-600">
                  Coordinates multiple specialized AI agents for comprehensive data analysis
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Advanced Analytics</h3>
                <p className="text-sm text-gray-600">
                  Statistical modeling, trend analysis, and predictive analytics capabilities
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Business Intelligence</h3>
                <p className="text-sm text-gray-600">
                  Transforms raw data into actionable business insights and recommendations
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AutoGen Architecture */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">🔧 AutoGen Multi-Agent Architecture</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Agent Specializations</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <h4 className="font-medium text-gray-800">Planner Agent</h4>
                      <p className="text-sm text-gray-600">Analyzes requirements and creates analysis strategy</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <h4 className="font-medium text-gray-800">Executor Agent</h4>
                      <p className="text-sm text-gray-600">Performs statistical analysis and data processing</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🔍</span>
                    <div>
                      <h4 className="font-medium text-gray-800">Reviewer Agent</h4>
                      <p className="text-sm text-gray-600">Validates results and ensures analytical rigor</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🎭</span>
                    <div>
                      <h4 className="font-medium text-gray-800">Coordinator Agent</h4>
                      <p className="text-sm text-gray-600">Synthesizes findings into actionable insights</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Workflow Process</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-6 h-6 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center font-medium">1</div>
                    <span>Task analysis and planning</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-6 h-6 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center font-medium">2</div>
                    <span>Data processing and analysis execution</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-6 h-6 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center font-medium">3</div>
                    <span>Quality review and validation</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-6 h-6 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center font-medium">4</div>
                    <span>Results coordination and synthesis</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-cyan-50 rounded-lg">
                  <p className="text-sm text-cyan-700">
                    <strong>Collaborative Intelligence:</strong> Each agent contributes specialized expertise, 
                    ensuring comprehensive and reliable data analysis results.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Capabilities */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">🔗 Data Source Integrations</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { name: 'Google Analytics', color: 'bg-orange-100 text-orange-700' },
                { name: 'Mixpanel', color: 'bg-purple-100 text-purple-700' },
                { name: 'Amplitude', color: 'bg-blue-100 text-blue-700' },
                { name: 'Tableau', color: 'bg-blue-100 text-blue-700' },
                { name: 'Power BI', color: 'bg-yellow-100 text-yellow-700' }
              ].map((integration) => (
                <div key={integration.name} className={`p-3 rounded-lg text-center ${integration.color}`}>
                  <div className="text-sm font-medium">{integration.name}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Tide connects to your existing analytics platforms to provide unified data analysis and insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
