'use client'

import { useState, useEffect } from 'react'
import MarinerAgent from '@/components/agents/MarinerAgent'
import { useAuth } from '@/lib/auth-context'

export default function TestMarinerPage() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Mariner Agent...</p>
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
            🚢 CrewFlow - Mariner Agent Test
          </h1>
          <p className="text-gray-600">
            Test the hybrid marketing automation capabilities of Mariner
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
                <h3 className="font-medium text-gray-900">LangChain Scenarios (Strategy & Automation):</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• "Create a social media campaign for a tech startup"</li>
                  <li>• "Generate a content calendar for B2B SaaS"</li>
                  <li>• "Optimize our Google Ads performance"</li>
                  <li>• "Segment our customer base for email marketing"</li>
                  <li>• "Develop a multi-channel campaign strategy"</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Perplexity AI Scenarios (Research & Trends):</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• "Research the latest digital marketing trends"</li>
                  <li>• "Analyze competitor strategies in the AI industry"</li>
                  <li>• "What are current social media trends for 2024?"</li>
                  <li>• "Research market opportunities in e-commerce"</li>
                  <li>• "Find the latest marketing automation tools"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Mariner Agent Component */}
        <MarinerAgent userId={user?.id} />

        {/* Features Overview */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">🌊 Mariner Agent Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Campaign Management</h3>
                <p className="text-sm text-gray-600">
                  Create comprehensive marketing campaigns with strategy, content, and automation
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🔍</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Market Research</h3>
                <p className="text-sm text-gray-600">
                  Real-time competitive analysis and trend research using Perplexity AI
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Hybrid Intelligence</h3>
                <p className="text-sm text-gray-600">
                  Combines LangChain automation with Perplexity's real-time web research
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Architecture */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">🔧 Hybrid AI Architecture</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  LangChain Framework
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Campaign strategy development</li>
                  <li>• Content calendar generation</li>
                  <li>• Audience segmentation</li>
                  <li>• Ad optimization recommendations</li>
                  <li>• Marketing automation workflows</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                  <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                  Perplexity AI Framework
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Real-time market research</li>
                  <li>• Competitive intelligence</li>
                  <li>• Trend analysis and insights</li>
                  <li>• Industry news and updates</li>
                  <li>• Source-cited research reports</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Intelligent Routing:</strong> Mariner automatically selects the optimal AI framework based on your request type. 
                Research queries route to Perplexity AI for real-time web data, while strategy and automation tasks use LangChain for structured planning.
              </p>
            </div>
          </div>
        </div>

        {/* Integration Capabilities */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">🔗 Marketing Integrations</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { name: 'Google Ads', color: 'bg-red-100 text-red-700' },
                { name: 'Facebook Ads', color: 'bg-blue-100 text-blue-700' },
                { name: 'Mailchimp', color: 'bg-yellow-100 text-yellow-700' },
                { name: 'HubSpot', color: 'bg-orange-100 text-orange-700' },
                { name: 'Google Analytics', color: 'bg-green-100 text-green-700' }
              ].map((integration) => (
                <div key={integration.name} className={`p-3 rounded-lg text-center ${integration.color}`}>
                  <div className="text-sm font-medium">{integration.name}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Mariner seamlessly integrates with your existing marketing stack to provide unified campaign management and analytics.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
