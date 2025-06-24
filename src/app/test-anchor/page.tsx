'use client'

import { useState, useEffect } from 'react'
import AnchorAgent from '@/components/agents/AnchorAgent'
import { useAuth } from '@/lib/auth-context'

export default function TestAnchorPage() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Anchor Agent...</p>
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
            🚢 CrewFlow - Anchor Agent Test
          </h1>
          <p className="text-gray-600">
            Test the triple-hybrid AI supply chain and inventory capabilities of Anchor
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Anchor Agent - Supply Chain/Inventory Specialist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Triple-Hybrid Framework: LangChain + AutoGen + Perplexity</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 text-sm">LangChain Components:</h4>
                    <ul className="text-sm text-blue-700 space-y-1 mt-1">
                      <li>• Inventory analysis and tracking</li>
                      <li>• Operational planning and optimization</li>
                      <li>• Cost analysis and reporting</li>
                      <li>• Performance monitoring</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-900 text-sm">Perplexity AI Components:</h4>
                    <ul className="text-sm text-purple-700 space-y-1 mt-1">
                      <li>• Real-time supplier monitoring</li>
                      <li>• Market pricing intelligence</li>
                      <li>• Supply chain risk assessment</li>
                      <li>• Industry trend analysis</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <h4 className="font-medium text-orange-900 text-sm">AutoGen Components:</h4>
                    <ul className="text-sm text-orange-700 space-y-1 mt-1">
                      <li>• Complex demand forecasting</li>
                      <li>• Multi-location optimization</li>
                      <li>• Order quantity optimization</li>
                      <li>• Process automation</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Intelligent Framework Routing:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Market research:</strong> Automatically routed to Perplexity AI</li>
                  <li>• <strong>Complex optimization:</strong> Handled by AutoGen multi-agents</li>
                  <li>• <strong>Analysis & reporting:</strong> Processed by LangChain</li>
                  <li>• <strong>Real-time data:</strong> Sourced from Perplexity</li>
                  <li>• <strong>Multi-step processes:</strong> Orchestrated by AutoGen</li>
                  <li>• <strong>Decision support:</strong> Analyzed by LangChain</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
              <h3 className="font-medium text-emerald-900 mb-2">Sample Test Queries:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-emerald-800">Inventory Tracking (LangChain):</p>
                  <p className="text-emerald-700">"Analyze current inventory levels and identify slow-moving stock"</p>
                </div>
                <div>
                  <p className="font-medium text-emerald-800">Supplier Monitoring (Perplexity):</p>
                  <p className="text-emerald-700">"Research supplier performance and market conditions"</p>
                </div>
                <div>
                  <p className="font-medium text-emerald-800">Demand Forecasting (AutoGen):</p>
                  <p className="text-emerald-700">"Predict inventory shortages for the next quarter"</p>
                </div>
                <div>
                  <p className="font-medium text-emerald-800">Order Optimization (AutoGen):</p>
                  <p className="text-emerald-700">"Optimize purchase orders to minimize costs and stockouts"</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Anchor Agent Component */}
        <AnchorAgent userId={user?.id} />

        {/* Additional Info */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About Anchor's Triple-Hybrid AI Approach</h2>
            <div className="prose max-w-none text-sm text-gray-600">
              <p>
                Anchor represents one of the most sophisticated AI agents in the CrewFlow platform, utilizing 
                a triple-hybrid approach that intelligently combines three AI frameworks for comprehensive 
                supply chain management:
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">LangChain Usage:</h4>
                  <ul className="space-y-1">
                    <li>• Inventory analysis and tracking</li>
                    <li>• Cost optimization strategies</li>
                    <li>• Performance reporting</li>
                    <li>• Operational planning</li>
                    <li>• Decision support systems</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Perplexity AI Usage:</h4>
                  <ul className="space-y-1">
                    <li>• Real-time supplier monitoring</li>
                    <li>• Market pricing intelligence</li>
                    <li>• Supply chain risk assessment</li>
                    <li>• Industry trend analysis</li>
                    <li>• Competitive benchmarking</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">AutoGen Usage:</h4>
                  <ul className="space-y-1">
                    <li>• Complex demand forecasting</li>
                    <li>• Multi-location optimization</li>
                    <li>• Order quantity optimization</li>
                    <li>• Process automation design</li>
                    <li>• Multi-agent coordination</li>
                  </ul>
                </div>
              </div>
              <p className="mt-4">
                This intelligent framework selection ensures that each aspect of supply chain management 
                leverages the most appropriate AI capabilities - real-time data for market intelligence, 
                multi-agent coordination for complex optimization, and structured analysis for operational 
                decision-making.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
