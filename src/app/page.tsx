import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-900 via-secondary-800 to-primary-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-ocean-wave opacity-5"></div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 lg:px-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
            </svg>
          </div>
          <span className="text-2xl font-bold text-white">CrewFlow</span>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/pricing"
            className="text-secondary-300 hover:text-white transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/auth/login"
            className="text-secondary-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center py-20 lg:py-32">
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            Navigate Your Business with
            <span className="text-primary-400 block">AI Automation</span>
          </h1>

          <p className="text-xl text-secondary-300 mb-8 max-w-3xl mx-auto">
            CrewFlow brings together 10 specialized AI agents to automate your business operations.
            From customer support to marketing, let our maritime crew handle the heavy lifting.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/auth/signup"
              className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center space-x-2"
            >
              <span>Start Your Journey</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>

            <Link
              href="/pricing"
              className="border border-white/20 text-white hover:bg-white/10 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              View Pricing
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-secondary-400">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>No setup fees</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>24/7 support</span>
            </div>
          </div>
        </div>

        {/* Agent Showcase */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Meet Your AI Crew
            </h2>
            <p className="text-xl text-secondary-300 max-w-2xl mx-auto">
              Each agent is specialized for specific business functions, powered by the latest AI frameworks
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Coral - Customer Support */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-primary-500/50 transition-all duration-300 group">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl font-bold text-white">C</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Coral</h3>
              <p className="text-primary-400 text-sm mb-3">Customer Support</p>
              <p className="text-secondary-300 text-sm">
                Expert in customer service, ticket management, and support automation with CRM integrations.
              </p>
            </div>

            {/* Mariner - Marketing */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-maritime-blue/50 transition-all duration-300 group">
              <div className="w-16 h-16 bg-maritime-blue rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl font-bold text-white">M</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Mariner</h3>
              <p className="text-maritime-blue text-sm mb-3">Marketing Automation</p>
              <p className="text-secondary-300 text-sm">
                Specialized in campaign creation, lead generation, and marketing analytics across platforms.
              </p>
            </div>

            {/* Pearl - Content & SEO */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-maritime-teal/50 transition-all duration-300 group">
              <div className="w-16 h-16 bg-maritime-teal rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl font-bold text-white">P</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Pearl</h3>
              <p className="text-maritime-teal text-sm mb-3">Content & SEO</p>
              <p className="text-secondary-300 text-sm">
                Content creation, SEO optimization, and trend analysis powered by real-time research.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-secondary-400 mb-4">And 7 more specialized agents in higher tiers</p>
            <Link
              href="/pricing"
              className="text-primary-400 hover:text-primary-300 font-medium"
            >
              See all agents →
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
