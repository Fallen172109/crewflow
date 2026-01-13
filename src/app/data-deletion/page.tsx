import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Data Deletion Instructions - CrewFlow',
  description: 'How to delete your data from CrewFlow',
}

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Data Deletion Instructions</h1>
          
          <p className="text-gray-600 mb-8">
            <strong>Last Updated:</strong> December 25, 2024
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How to Delete Your Data</h2>
            <p className="text-gray-700 mb-4">
              CrewFlow provides multiple ways for you to delete your personal data and account information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Method 1: Through Your Dashboard</h2>
            <ol className="list-decimal pl-6 text-gray-700 mb-4">
              <li>Log into your CrewFlow account at <a href="https://crewflow.dev/auth/login" className="text-green-600 hover:text-green-700">crewflow.dev</a></li>
              <li>Navigate to your Dashboard</li>
              <li>Go to "Settings" in the navigation menu</li>
              <li>Scroll down to the "Account Management" section</li>
              <li>Click "Delete Account"</li>
              <li>Confirm your decision by following the prompts</li>
            </ol>
            <p className="text-gray-700 mb-4">
              <strong>Note:</strong> This action is permanent and cannot be undone. All your data, including AI agent configurations, social media connections, and analytics, will be permanently deleted.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Method 2: Email Request</h2>
            <p className="text-gray-700 mb-4">
              If you cannot access your dashboard or prefer to request deletion via email:
            </p>
            <ol className="list-decimal pl-6 text-gray-700 mb-4">
              <li>Send an email to <strong>crewflow.ai@gmail.com</strong></li>
              <li>Use the subject line: "Data Deletion Request"</li>
              <li>Include your registered email address</li>
              <li>Provide any additional account identifiers (username, etc.)</li>
              <li>We will process your request within 30 days</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What Data Gets Deleted</h2>
            <p className="text-gray-700 mb-4">
              When you delete your account, the following data is permanently removed:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Personal profile information (name, email, preferences)</li>
              <li>Social media account connections and tokens</li>
              <li>AI agent configurations and chat histories</li>
              <li>Analytics data and performance metrics</li>
              <li>Subscription and billing information</li>
              <li>All user-generated content and settings</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Data</h2>
            <p className="text-gray-700 mb-4">
              Please note that data stored by third-party services (Facebook, Google, etc.) connected to your CrewFlow account must be deleted separately through those platforms. CrewFlow will revoke access tokens, but you may need to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Remove CrewFlow app permissions from your Facebook account</li>
              <li>Revoke access in your Google account settings</li>
              <li>Check other connected social media platforms</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Retention</h2>
            <p className="text-gray-700 mb-4">
              After account deletion:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Most data is deleted immediately</li>
              <li>Some data may be retained for up to 30 days for backup purposes</li>
              <li>Legal or regulatory requirements may require longer retention of certain data</li>
              <li>Anonymized analytics data may be retained for service improvement</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Need Help?</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about data deletion or need assistance:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Email:</strong> crewflow.ai@gmail.com</li>
              <li><strong>Subject:</strong> Data Deletion Support</li>
              <li><strong>Response Time:</strong> Within 48 hours</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Alternative: Data Export</h2>
            <p className="text-gray-700 mb-4">
              Before deleting your account, you may want to export your data. Contact us at crewflow.ai@gmail.com with the subject "Data Export Request" to receive a copy of your data in a portable format.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
