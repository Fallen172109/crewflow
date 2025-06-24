'use client'

import { useState, useEffect } from 'react'
import PearlAgent from '@/components/agents/PearlAgent'
import { useAuth } from '@/lib/auth-context'

export default function TestPearlPage() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Pearl Agent...</p>
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
            🚢 CrewFlow - Pearl Agent Test
          </h1>
          <p className="text-gray-600">
            Test the Perplexity AI-powered content and SEO capabilities of Pearl
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pearl Agent - Content & SEO Specialist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Framework: Perplexity AI</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Real-time Research:</strong> Access to current web data and trends</li>
                  <li>• <strong>Source Citations:</strong> Provides credible sources for all claims</li>
                  <li>• <strong>SEO Intelligence:</strong> Latest algorithm updates and best practices</li>
                  <li>• <strong>Competitive Analysis:</strong> Real-time competitor research</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Core Capabilities:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Content Creation:</strong> SEO-optimized blog posts and articles</li>
                  <li>• <strong>Keyword Research:</strong> Comprehensive keyword analysis</li>
                  <li>• <strong>Trend Analysis:</strong> Current trending topics and opportunities</li>
                  <li>• <strong>Content Auditing:</strong> Performance analysis and optimization</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-teal-50 rounded-lg">
              <h3 className="font-medium text-teal-900 mb-2">Sample Test Queries:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-teal-800">Content Creation:</p>
                  <p className="text-teal-700">"Create a blog post about AI automation trends in 2024"</p>
                </div>
                <div>
                  <p className="font-medium text-teal-800">SEO Analysis:</p>
                  <p className="text-teal-700">"Analyze keyword opportunities for 'maritime automation'"</p>
                </div>
                <div>
                  <p className="font-medium text-teal-800">Trend Research:</p>
                  <p className="text-teal-700">"What are the trending topics in business automation?"</p>
                </div>
                <div>
                  <p className="font-medium text-teal-800">Content Optimization:</p>
                  <p className="text-teal-700">"How can I optimize my website content for better SEO?"</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pearl Agent Component */}
        <PearlAgent userId={user?.id} />

        {/* Additional Info */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About Pearl's Perplexity AI Integration</h2>
            <div className="prose max-w-none text-sm text-gray-600">
              <p>
                Pearl leverages Perplexity AI's real-time web research capabilities to provide the most current 
                and accurate content and SEO insights. Unlike traditional AI models that have knowledge cutoffs, 
                Pearl can access live web data to:
              </p>
              <ul className="mt-3 space-y-1">
                <li>• Research trending topics and keywords in real-time</li>
                <li>• Analyze current SEO algorithm updates and best practices</li>
                <li>• Provide competitor analysis with up-to-date information</li>
                <li>• Access the latest industry statistics and data</li>
                <li>• Cite credible sources for all recommendations</li>
              </ul>
              <p className="mt-3">
                This makes Pearl particularly powerful for content marketing, SEO strategy, and staying ahead 
                of rapidly changing digital marketing trends.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
