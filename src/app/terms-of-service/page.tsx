import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - CrewFlow',
  description: 'CrewFlow Terms of Service - Legal terms and conditions for using our platform',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          
          <p className="text-gray-600 mb-8">
            <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing and using CrewFlow ("the Service"), you accept and agree to be bound by the 
              terms and provision of this agreement. If you do not agree to abide by the above, please 
              do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 mb-4">
              CrewFlow is an AI-powered automation platform that provides social media management services, 
              including but not limited to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Automated content creation and posting</li>
              <li>AI-driven customer engagement and responses</li>
              <li>Social media analytics and insights</li>
              <li>Multi-platform integration and management</li>
              <li>Business automation tools and workflows</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
            <p className="text-gray-700 mb-4">
              To access certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-700 mb-4">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit harmful, offensive, or inappropriate content</li>
              <li>Engage in spam, harassment, or abusive behavior</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with the proper functioning of the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Third-Party Integrations</h2>
            <p className="text-gray-700 mb-4">
              CrewFlow integrates with third-party services (Facebook, Google, etc.). Your use of these 
              integrations is subject to their respective terms of service. You are responsible for 
              complying with all third-party terms and policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. AI-Generated Content</h2>
            <p className="text-gray-700 mb-4">
              Our AI agents generate content based on your instructions and data. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>AI-generated content should be reviewed before publication</li>
              <li>You are responsible for all content published through our platform</li>
              <li>We do not guarantee the accuracy or appropriateness of AI-generated content</li>
              <li>You retain ownership of your original content and data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Privacy and Data</h2>
            <p className="text-gray-700 mb-4">
              Your privacy is important to us. Please review our Privacy Policy, which also governs your 
              use of the Service, to understand our practices.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Subscription and Billing</h2>
            <p className="text-gray-700 mb-4">
              Paid features of the Service are billed on a subscription basis. You agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Pay all fees associated with your subscription</li>
              <li>Provide accurate billing information</li>
              <li>Notify us of any billing disputes within 30 days</li>
              <li>Accept that fees are non-refundable except as required by law</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-700 mb-4">
              To the maximum extent permitted by law, CrewFlow shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages, or any loss of profits or revenues.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Termination</h2>
            <p className="text-gray-700 mb-4">
              We may terminate or suspend your account and access to the Service at our sole discretion, 
              without prior notice, for conduct that we believe violates these Terms or is harmful to 
              other users, us, or third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to Terms</h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of any 
              material changes. Your continued use of the Service after such modifications constitutes 
              acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="text-gray-700">
              <strong>Email:</strong> legal@crewflow.dev<br />
              <strong>Website:</strong> https://crewflow.dev
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
