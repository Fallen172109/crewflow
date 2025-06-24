'use client'

import { useState, useEffect } from 'react'
import CoralAgent from '@/components/agents/CoralAgent'
import { useAuth } from '@/lib/auth-context'

export default function TestCoralPage() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Coral Agent...</p>
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
            🚢 CrewFlow - Coral Agent Test
          </h1>
          <p className="text-gray-600">
            Test the customer support capabilities of Coral, your maritime AI assistant
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">Customer Support Scenarios:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• "I'm having trouble with my account login"</li>
                  <li>• "Your service is terrible and I want a refund!"</li>
                  <li>• "Can you help me understand my billing?"</li>
                  <li>• "I need urgent help with a critical issue"</li>
                  <li>• "Thank you for the excellent support!"</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">Preset Actions:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Generate professional response templates</li>
                  <li>• Analyze customer sentiment and urgency</li>
                  <li>• Prepare escalation summaries</li>
                  <li>• Create knowledge base entries</li>
                  <li>• Update customer records</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Coral Agent Component */}
        <CoralAgent userId={user?.id} />

        {/* Features Overview */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">🌊 Coral Agent Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Intelligent Analysis</h3>
                <p className="text-sm text-gray-600">
                  Automatically analyzes customer sentiment, urgency, and escalation needs
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Quick Actions</h3>
                <p className="text-sm text-gray-600">
                  Pre-built workflows for common customer support tasks and scenarios
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🔗</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">CRM Integration</h3>
                <p className="text-sm text-gray-600">
                  Seamlessly integrates with Zendesk, Intercom, Salesforce, and more
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">🔧 Technical Implementation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">AI Framework</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• LangChain with OpenAI GPT-4</li>
                  <li>• Advanced prompt engineering</li>
                  <li>• Context-aware responses</li>
                  <li>• Token usage optimization</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Capabilities</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Sentiment analysis</li>
                  <li>• Urgency detection</li>
                  <li>• Escalation protocols</li>
                  <li>• Knowledge base creation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
