'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function MaintenancePage() {
  const [password, setPassword] = useState('')
  const [showMainSite, setShowMainSite] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'CrewFlow2024!') {
      setShowMainSite(true)
    } else {
      setError('Invalid password')
    }
  }

  if (showMainSite) {
    return <OriginalSite />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">CrewFlow</h1>
          <p className="text-gray-600">Site Under Development</p>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            We're Building Something Amazing
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            CrewFlow is currently under development. Our maritime AI automation platform
            will be launching soon with 10 specialized agents.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Developer Access
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter access password"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Access Site
          </button>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <p className="text-gray-500 text-xs">
            Expected Launch: Q1 2025 • Maritime AI Automation Platform
          </p>
        </div>
      </div>
    </div>
  )
}

function OriginalSite() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="absolute inset-0 bg-ocean-wave opacity-5"></div>
      <nav className="relative z-10 flex items-center justify-between p-6 lg:px-8 bg-white shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
            </svg>
          </div>
          <span className="text-2xl font-bold text-gray-900">CrewFlow</span>
        </div>
        <div className="flex items-center space-x-4">
          <a href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
          <a href="/auth/login" className="text-gray-600 hover:text-gray-900 transition-colors">Sign In</a>
          <a href="/auth/signup" className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors">Get Started</a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center py-20 lg:py-32">
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
            Navigate Your Business with
            <span className="text-primary-500 block">AI Automation</span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            CrewFlow brings together 10 specialized AI agents to automate your business operations.
            From customer support to marketing, let our maritime crew handle the heavy lifting.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/auth/signup"
              className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              style={{ backgroundColor: '#f97316' }}
            >
              <span>Start Your Journey</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>

            <Link
              href="/pricing"
              className="border-2 border-gray-400 text-gray-800 hover:bg-gray-100 hover:border-gray-500 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              View Pricing
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-gray-600">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>No setup fees</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>24/7 support</span>
            </div>
          </div>
        </div>

        {/* Agent Showcase */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Meet Your AI Crew
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Each agent is specialized for specific business functions, powered by the latest AI frameworks
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Coral - Customer Support */}
            <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-primary-500 transition-all duration-300 group shadow-xl hover:shadow-2xl transform hover:scale-105">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ backgroundColor: '#f97316' }}>
                <span className="text-2xl font-bold text-white">C</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Coral</h3>
              <p className="text-primary-500 text-sm mb-3 font-semibold">Customer Support</p>
              <p className="text-gray-700 text-sm leading-relaxed">
                Expert in customer service, ticket management, and support automation with CRM integrations.
              </p>
            </div>

            {/* Mariner - Marketing */}
            <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-blue-500 transition-all duration-300 group shadow-xl hover:shadow-2xl transform hover:scale-105">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl font-bold text-white">M</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Mariner</h3>
              <p className="text-blue-500 text-sm mb-3 font-semibold">Marketing Automation</p>
              <p className="text-gray-700 text-sm leading-relaxed">
                Specialized in campaign creation, lead generation, and marketing analytics across platforms.
              </p>
            </div>

            {/* Pearl - Content & SEO */}
            <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-teal-500 transition-all duration-300 group shadow-xl hover:shadow-2xl transform hover:scale-105">
              <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl font-bold text-white">P</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Pearl</h3>
              <p className="text-teal-500 text-sm mb-3 font-semibold">Content & SEO</p>
              <p className="text-gray-700 text-sm leading-relaxed">
                Content creation, SEO optimization, and trend analysis powered by real-time research.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-500 mb-4">And 7 more specialized agents in higher tiers</p>
            <Link
              href="/pricing"
              className="text-primary-500 hover:text-primary-600 font-medium"
            >
              See all agents →
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
