'use client'

import { useState, useEffect } from 'react'
import SplashAgent from '@/components/agents/SplashAgent'
import { useAuth } from '@/lib/auth-context'

export default function TestSplashPage() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Splash Agent...</p>
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
            🚢 CrewFlow - Splash Agent Test
          </h1>
          <p className="text-gray-600">
            Test the hybrid AI-powered social media capabilities of Splash
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Splash Agent - Social Media Specialist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Hybrid Framework: LangChain + Perplexity AI</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 text-sm">LangChain Components:</h4>
                    <ul className="text-sm text-blue-700 space-y-1 mt-1">
                      <li>• Content creation and scheduling</li>
                      <li>• Engagement strategy development</li>
                      <li>• Performance analysis and reporting</li>
                      <li>• Social media automation workflows</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-900 text-sm">Perplexity AI Components:</h4>
                    <ul className="text-sm text-purple-700 space-y-1 mt-1">
                      <li>• Real-time trend research and analysis</li>
                      <li>• Competitor monitoring and intelligence</li>
                      <li>• Brand mention tracking and sentiment</li>
                      <li>• Viral content pattern identification</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Platform Coverage:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Facebook:</strong> Posts, stories, ads, groups</li>
                  <li>• <strong>Instagram:</strong> Feed posts, stories, reels, IGTV</li>
                  <li>• <strong>Twitter/X:</strong> Tweets, threads, spaces</li>
                  <li>• <strong>LinkedIn:</strong> Posts, articles, company pages</li>
                  <li>• <strong>TikTok:</strong> Short-form videos, trends</li>
                  <li>• <strong>YouTube:</strong> Videos, shorts, community posts</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-pink-50 rounded-lg">
              <h3 className="font-medium text-pink-900 mb-2">Sample Test Queries:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-pink-800">Content Creation (LangChain):</p>
                  <p className="text-pink-700">"Create a week's worth of LinkedIn posts for a tech startup"</p>
                </div>
                <div>
                  <p className="font-medium text-pink-800">Trend Research (Perplexity):</p>
                  <p className="text-pink-700">"What are the trending hashtags in AI automation this week?"</p>
                </div>
                <div>
                  <p className="font-medium text-pink-800">Scheduling (LangChain):</p>
                  <p className="text-pink-700">"Plan optimal posting times for Instagram and TikTok"</p>
                </div>
                <div>
                  <p className="font-medium text-pink-800">Competitor Analysis (Perplexity):</p>
                  <p className="text-pink-700">"Analyze competitor social media strategies in the SaaS space"</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Splash Agent Component */}
        <SplashAgent userId={user?.id} />

        {/* Additional Info */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About Splash's Hybrid AI Approach</h2>
            <div className="prose max-w-none text-sm text-gray-600">
              <p>
                Splash uses an intelligent hybrid approach that automatically selects the best AI framework 
                for each task:
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">When LangChain is Used:</h4>
                  <ul className="space-y-1">
                    <li>• Content creation and copywriting</li>
                    <li>• Scheduling and automation setup</li>
                    <li>• Performance analysis and reporting</li>
                    <li>• Strategy development and planning</li>
                    <li>• Template and workflow creation</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">When Perplexity AI is Used:</h4>
                  <ul className="space-y-1">
                    <li>• Real-time trend research</li>
                    <li>• Competitor monitoring and analysis</li>
                    <li>• Brand mention tracking</li>
                    <li>• Viral content pattern analysis</li>
                    <li>• Current event integration</li>
                  </ul>
                </div>
              </div>
              <p className="mt-4">
                This hybrid approach ensures you get the most accurate, current information for research tasks 
                while leveraging powerful content generation capabilities for creative work.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
