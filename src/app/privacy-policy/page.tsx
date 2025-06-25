import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - CrewFlow',
  description: 'CrewFlow Privacy Policy - How we collect, use, and protect your data',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <p className="text-gray-600 mb-8">
            <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              CrewFlow ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our 
              AI-powered social media management platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium text-gray-800 mb-3">2.1 Personal Information</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Name and email address</li>
              <li>Profile information from connected social media accounts</li>
              <li>Account credentials and authentication tokens</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">2.2 Social Media Data</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Facebook page information and settings</li>
              <li>Post content, comments, and engagement metrics</li>
              <li>Page insights and analytics data</li>
              <li>Customer messages and interactions</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3">2.3 Usage Information</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Platform usage patterns and preferences</li>
              <li>AI agent interactions and configurations</li>
              <li>Performance metrics and analytics</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Provide AI-powered social media management services</li>
              <li>Generate intelligent content and responses</li>
              <li>Analyze performance and provide optimization recommendations</li>
              <li>Automate customer service and engagement</li>
              <li>Improve our AI algorithms and platform functionality</li>
              <li>Communicate with you about our services</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Information Sharing</h2>
            <p className="text-gray-700 mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share 
              information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>With AI processing services necessary for platform functionality</li>
              <li>When required by law or legal process</li>
              <li>To protect our rights, property, or safety</li>
              <li>With your explicit consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-700 mb-4">
              We implement appropriate technical and organizational security measures to protect your 
              information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-700 mb-4">
              We retain your information only as long as necessary to provide our services and fulfill 
              the purposes outlined in this policy. You may request deletion of your data at any time 
              through your CrewFlow dashboard.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and data</li>
              <li>Withdraw consent for data processing</li>
              <li>Export your data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Third-Party Integrations</h2>
            <p className="text-gray-700 mb-4">
              Our platform integrates with third-party services (Facebook, Google, etc.). Your use of 
              these integrations is subject to their respective privacy policies and terms of service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-gray-700">
              <strong>Email:</strong> privacy@crewflow.dev<br />
              <strong>Website:</strong> https://crewflow.dev
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page and updating the effective date.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
