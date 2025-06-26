'use client'

import { useState, useEffect } from 'react'
import { AI_PROVIDER_PRICING } from '@/lib/ai-cost-calculator'

export default function CostCheckPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-3xl font-bold text-gray-900">AI Cost & Token Verification</h1>
            <p className="text-gray-600 mt-1">
              Check the accuracy of AI cost calculations and token tracking
            </p>
          </div>

          {/* Status Alert */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-400 text-xl">✅</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Real Data Only</h3>
                <p className="mt-1 text-sm text-green-700">
                  All fake/mock data has been removed. The system now tracks only real AI usage data from actual API calls.
                </p>
              </div>
            </div>
          </div>

          {/* Your Current Models */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Current AI Models (from .env)</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded border">
                  <h3 className="font-medium text-gray-900 mb-2">🤖 OpenAI</h3>
                  <p className="text-sm text-gray-600 font-mono">gpt-4-turbo-preview</p>
                  <p className="text-xs text-gray-500 mt-1">$0.01 input / $0.03 output per 1K tokens</p>
                  <p className="text-xs text-green-600 mt-1">✅ Real tracking implemented</p>
                </div>
                <div className="p-4 bg-white rounded border">
                  <h3 className="font-medium text-gray-900 mb-2">🧠 Anthropic</h3>
                  <p className="text-sm text-gray-600 font-mono">claude-3.5-sonnet-20241022</p>
                  <p className="text-xs text-gray-500 mt-1">$0.003 input / $0.015 output per 1K tokens</p>
                  <p className="text-xs text-yellow-600 mt-1">⏳ Real tracking pending</p>
                </div>
                <div className="p-4 bg-white rounded border">
                  <h3 className="font-medium text-gray-900 mb-2">🔍 Perplexity</h3>
                  <p className="text-sm text-gray-600 font-mono">llama-3.1-sonar-large-128k-online</p>
                  <p className="text-xs text-gray-500 mt-1">$0.001 input / $0.001 output per 1K tokens</p>
                  <p className="text-xs text-yellow-600 mt-1">⏳ Real tracking pending</p>
                </div>
              </div>
            </div>
          </div>

          {/* Real vs Estimated Comparison */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Real vs Estimated Cost Tracking</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h3 className="font-medium text-red-900 mb-2">❌ Current System (Estimated)</h3>
                <div className="space-y-2 text-sm text-red-700">
                  <p>• Uses hardcoded pricing from ai-cost-calculator.ts</p>
                  <p>• Estimates token usage (not always accurate)</p>
                  <p>• Fixed cost per request for some agents</p>
                  <p>• No real-time cost data from AI providers</p>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="font-medium text-green-900 mb-2">✅ New System (Real Data)</h3>
                <div className="space-y-2 text-sm text-green-700">
                  <p>• Captures actual token usage from API responses</p>
                  <p>• Uses real input/output token counts</p>
                  <p>• Tracks actual model used per request</p>
                  <p>• Calculates costs based on real usage</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Calculation Example */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Cost Calculation Example</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Example: Your OpenAI Model (gpt-4-turbo-preview)</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Input Cost:</strong> $0.01 per 1,000 tokens</p>
                <p><strong>Output Cost:</strong> $0.03 per 1,000 tokens</p>
                <p><strong>Example Usage:</strong> 150 input tokens, 75 output tokens</p>
                <div className="mt-3 p-3 bg-white rounded border">
                  <p><strong>Calculation:</strong></p>
                  <p>Input Cost: (150 ÷ 1,000) × $0.01 = $0.0015</p>
                  <p>Output Cost: (75 ÷ 1,000) × $0.03 = $0.00225</p>
                  <p><strong>Total Cost: $0.00375</strong></p>
                </div>
              </div>
            </div>
          </div>

          {/* Implementation Status */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Implementation Status</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-green-500 text-xl mr-3">✅</span>
                <span>Updated Coral agent to use real usage tracking</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 text-xl mr-3">✅</span>
                <span>Modified LangChain to include full API responses</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 text-xl mr-3">✅</span>
                <span>Modified Perplexity to include full API responses</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 text-xl mr-3">✅</span>
                <span>Updated pricing to match your .env models</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 text-xl mr-3">✅</span>
                <span>Removed all fake/mock data from database</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 text-xl mr-3">✅</span>
                <span>System now tracks only real API usage data</span>
              </div>
              <div className="flex items-center">
                <span className="text-yellow-500 text-xl mr-3">⏳</span>
                <span>Need to update remaining agents (Pearl, Mariner, etc.)</span>
              </div>
              <div className="flex items-center">
                <span className="text-yellow-500 text-xl mr-3">⏳</span>
                <span>Need to implement provider API usage sync</span>
              </div>
            </div>
          </div>

          {/* Test Instructions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Test Real vs Estimated Costs</h2>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h3 className="font-medium text-yellow-900 mb-2">🧪 Run the Test Script</h3>
                <p className="text-sm text-yellow-700 mb-2">
                  Run this command in your terminal to see real vs estimated costs:
                </p>
                <code className="block bg-gray-800 text-green-400 p-2 rounded text-sm">
                  node test-real-vs-estimated-costs.js
                </code>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2">💬 Test with AI Agents</h3>
                <p className="text-sm text-blue-700">
                  Use the Coral agent (customer support) to generate real usage data, then check the analytics to see actual vs estimated costs.
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-900 mb-2">📊 Check Your Usage</h3>
                <p className="text-sm text-green-700">
                  Go to <strong>/dashboard/my-usage</strong> to see your personal AI usage costs and token consumption.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Navigation</h2>
            <div className="space-y-2">
              <a href="/dashboard" className="block text-blue-600 hover:text-blue-800">← Back to Dashboard</a>
              <a href="/dashboard/my-usage" className="block text-blue-600 hover:text-blue-800">→ My AI Usage</a>
              <a href="/admin" className="block text-blue-600 hover:text-blue-800">→ Admin Dashboard</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
