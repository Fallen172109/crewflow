import Link from 'next/link'

const tiers = [
  {
    name: 'Starter',
    price: 29,
    description: 'Perfect for small businesses getting started with AI automation',
    agents: 3,
    requestsPerAgent: 500,
    features: [
      '3 AI Agents (Coral, Mariner, Pearl)',
      '500 requests per agent/month',
      'Basic integrations',
      'Email support',
      'Maritime dashboard',
      'Chat interface',
      'Preset actions'
    ],
    cta: 'Start Your Journey',
    popular: false
  },
  {
    name: 'Professional',
    price: 59,
    description: 'Ideal for growing businesses that need advanced automation',
    agents: 6,
    requestsPerAgent: 750,
    features: [
      '6 AI Agents + Social Media Agent',
      '750 requests per agent/month',
      'Advanced integrations',
      'Priority support',
      'Analytics dashboard',
      'API connections',
      'Custom workflows',
      'Usage analytics'
    ],
    cta: 'Scale Your Operations',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 89,
    description: 'Complete automation suite for large organizations',
    agents: 10,
    requestsPerAgent: 1000,
    features: [
      'All 10 AI Agents',
      '1,000 requests per agent/month',
      'Premium integrations',
      '24/7 priority support',
      'Advanced analytics',
      'Custom workflows',
      'White-label options',
      'Dedicated account manager'
    ],
    cta: 'Command Your Fleet',
    popular: false
  }
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-ocean-wave opacity-5"></div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 lg:px-8 bg-white shadow-sm">
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
            </svg>
          </div>
          <span className="text-2xl font-bold text-gray-900">CrewFlow</span>
        </Link>

        <div className="flex items-center space-x-4">
          <Link
            href="/auth/login"
            className="text-gray-600 hover:text-gray-900 transition-colors"
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

      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Choose Your
            <span className="text-primary-500 block">Maritime Plan</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Scale your AI automation with flexible pricing. Start small and grow your crew as your business expands.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-white rounded-2xl p-8 border transition-all duration-300 shadow-lg ${
                tier.popular
                  ? 'border-primary-500 scale-105 shadow-xl shadow-primary-500/20'
                  : 'border-gray-200 hover:border-primary-500/50 hover:shadow-xl'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{tier.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900">${tier.price}</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">AI Agents</span>
                  <span className="text-gray-900 font-semibold">{tier.agents}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Requests per agent</span>
                  <span className="text-gray-900 font-semibold">{tier.requestsPerAgent.toLocaleString()}/month</span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Link
                href="/auth/signup"
                className={`w-full py-3 px-4 rounded-lg font-semibold text-center transition-colors block ${
                  tier.popular
                    ? 'bg-primary-500 hover:bg-primary-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What happens if I exceed my request limit?</h3>
              <p className="text-gray-600 text-sm">
                Additional requests are charged at $0.05 each. You'll receive notifications at 80% and 100% usage.
              </p>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I change plans anytime?</h3>
              <p className="text-gray-600 text-sm">
                Yes! Upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle.
              </p>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Do you offer custom enterprise plans?</h3>
              <p className="text-gray-600 text-sm">
                Absolutely! Contact our sales team for custom pricing and features tailored to your organization.
              </p>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Is there a free trial?</h3>
              <p className="text-gray-600 text-sm">
                We offer a 7-day free trial with full access to the Starter plan features. No credit card required.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 p-8 bg-white rounded-2xl border border-gray-200 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Set Sail?</h2>
          <p className="text-gray-600 mb-6">
            Join thousands of businesses already using CrewFlow to automate their operations.
          </p>
          <Link
            href="/auth/signup"
            className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-flex items-center space-x-2 shadow-lg"
          >
            <span>Start Free Trial</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
