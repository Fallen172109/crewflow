'use client'

import { useState, useEffect } from 'react'
import DrakeAgent from '@/components/agents/DrakeAgent'
import { useAuth } from '@/lib/auth-context'

export default function TestDrakePage() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Drake Agent...</p>
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
            🚢 CrewFlow - Drake Agent Test
          </h1>
          <p className="text-gray-600">
            Test the triple-hybrid AI business development capabilities of Drake
          </p>
          {user && (
            <p className="text-sm text-gray-500 mt-2">
              Logged in as: {user.email}
            </p>
          )}
        </div>

        {/* Framework Info */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Drake Agent - Business Development Specialist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Triple-Hybrid Framework: AutoGen + Perplexity + LangChain</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 text-sm">LangChain Components:</h4>
                    <ul className="text-sm text-blue-700 space-y-1 mt-1">
                      <li>• Proposal and content generation</li>
                      <li>• Sales template creation</li>
                      <li>• CRM data management</li>
                      <li>• Customer communication</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-900 text-sm">Perplexity AI Components:</h4>
                    <ul className="text-sm text-purple-700 space-y-1 mt-1">
                      <li>• Real-time lead research</li>
                      <li>• Competitive intelligence</li>
                      <li>• Market analysis and trends</li>
                      <li>• Company background research</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <h4 className="font-medium text-orange-900 text-sm">AutoGen Components:</h4>
                    <ul className="text-sm text-orange-700 space-y-1 mt-1">
                      <li>• Multi-step campaign automation</li>
                      <li>• Sales process orchestration</li>
                      <li>• Team workflow coordination</li>
                      <li>• Performance optimization</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Intelligent Framework Routing:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Research queries:</strong> Automatically routed to Perplexity AI</li>
                  <li>• <strong>Content creation:</strong> Handled by LangChain</li>
                  <li>• <strong>Complex workflows:</strong> Orchestrated by AutoGen</li>
                  <li>• <strong>Multi-step processes:</strong> Coordinated across frameworks</li>
                  <li>• <strong>Real-time data:</strong> Sourced from Perplexity</li>
                  <li>• <strong>Automation:</strong> Designed with AutoGen agents</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-red-50 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">Sample Test Queries:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-red-800">Lead Research (Perplexity):</p>
                  <p className="text-red-700">"Find qualified SaaS prospects in the healthcare industry"</p>
                </div>
                <div>
                  <p className="font-medium text-red-800">Campaign Automation (AutoGen):</p>
                  <p className="text-red-700">"Design a multi-touch outreach campaign for enterprise clients"</p>
                </div>
                <div>
                  <p className="font-medium text-red-800">Proposal Generation (LangChain):</p>
                  <p className="text-red-700">"Create a business proposal for AI automation services"</p>
                </div>
                <div>
                  <p className="font-medium text-red-800">Competitive Analysis (Perplexity):</p>
                  <p className="text-red-700">"Analyze competitors in the business automation space"</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drake Agent Component */}
        <DrakeAgent userId={user?.id} />

        {/* Additional Info */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About Drake's Triple-Hybrid AI Approach</h2>
            <div className="prose max-w-none text-sm text-gray-600">
              <p>
                Drake represents the most advanced AI agent in the CrewFlow platform, utilizing an intelligent 
                triple-hybrid approach that automatically selects the optimal AI framework for each business 
                development task:
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">LangChain Usage:</h4>
                  <ul className="space-y-1">
                    <li>• Content creation and copywriting</li>
                    <li>• Proposal and pitch development</li>
                    <li>• Sales template generation</li>
                    <li>• CRM data management</li>
                    <li>• Customer communication</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Perplexity AI Usage:</h4>
                  <ul className="space-y-1">
                    <li>• Real-time lead research</li>
                    <li>• Competitive intelligence</li>
                    <li>• Market trend analysis</li>
                    <li>• Company background research</li>
                    <li>• Industry insights</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">AutoGen Usage:</h4>
                  <ul className="space-y-1">
                    <li>• Multi-step campaign design</li>
                    <li>• Sales process automation</li>
                    <li>• Workflow orchestration</li>
                    <li>• Team coordination</li>
                    <li>• Performance optimization</li>
                  </ul>
                </div>
              </div>
              <p className="mt-4">
                This intelligent routing ensures that each aspect of business development leverages the most 
                appropriate AI capabilities, resulting in more accurate research, better content, and more 
                effective automation workflows.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
