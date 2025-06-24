'use client'

import { useState, useEffect } from 'react'
import HelmAgent from '@/components/agents/HelmAgent'
import { useAuth } from '@/lib/auth-context'

export default function TestHelmPage() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Helm Agent...</p>
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
            🚢 CrewFlow - Helm Agent Test
          </h1>
          <p className="text-gray-600">
            Test the LangChain-powered HR and hiring capabilities of Helm
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Helm Agent - HR & Hiring Specialist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Framework: LangChain HR Systems</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Structured Processes:</strong> Systematic HR workflows</li>
                  <li>• <strong>Compliance Focus:</strong> Legal and regulatory adherence</li>
                  <li>• <strong>Employee Experience:</strong> Positive lifecycle management</li>
                  <li>• <strong>Data-Driven Decisions:</strong> Analytics and insights</li>
                  <li>• <strong>Scalable Solutions:</strong> Growing organization support</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Core HR Capabilities:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Talent Acquisition:</strong> End-to-end recruitment</li>
                  <li>• <strong>Interview Management:</strong> Coordination and scheduling</li>
                  <li>• <strong>Employee Onboarding:</strong> Integration and training</li>
                  <li>• <strong>Benefits Administration:</strong> Enrollment and support</li>
                  <li>• <strong>Performance Management:</strong> Reviews and development</li>
                  <li>• <strong>HR Compliance:</strong> Policy and legal requirements</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-cyan-50 rounded-lg">
              <h3 className="font-medium text-cyan-900 mb-2">Sample Test Queries:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-cyan-800">Candidate Screening:</p>
                  <p className="text-cyan-700">"Screen candidates for a senior developer position"</p>
                </div>
                <div>
                  <p className="font-medium text-cyan-800">Interview Scheduling:</p>
                  <p className="text-cyan-700">"Coordinate interviews for multiple candidates this week"</p>
                </div>
                <div>
                  <p className="font-medium text-cyan-800">Employee Onboarding:</p>
                  <p className="text-cyan-700">"Design onboarding program for remote employees"</p>
                </div>
                <div>
                  <p className="font-medium text-cyan-800">Benefits Management:</p>
                  <p className="text-cyan-700">"Set up annual benefits enrollment process"</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Helm Agent Component */}
        <HelmAgent userId={user?.id} />

        {/* Additional Info */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About Helm's HR Management Approach</h2>
            <div className="prose max-w-none text-sm text-gray-600">
              <p>
                Helm leverages LangChain's structured approach to provide comprehensive HR and hiring 
                management capabilities, focusing on creating positive employee experiences while 
                maintaining compliance and efficiency:
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">HR Process Automation:</h4>
                  <ul className="space-y-1">
                    <li>• Standardized candidate evaluation frameworks</li>
                    <li>• Automated interview scheduling and coordination</li>
                    <li>• Structured onboarding checklists and workflows</li>
                    <li>• Benefits enrollment guidance and support</li>
                    <li>• Performance review templates and processes</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Compliance & Best Practices:</h4>
                  <ul className="space-y-1">
                    <li>• Legal compliance monitoring and guidance</li>
                    <li>• Diversity, equity, and inclusion considerations</li>
                    <li>• Data privacy and confidentiality protection</li>
                    <li>• Industry best practice implementation</li>
                    <li>• Regulatory requirement adherence</li>
                  </ul>
                </div>
              </div>
              <p className="mt-4">
                Helm's systematic approach ensures that HR processes are not only efficient but also 
                create positive experiences for both employees and managers, while maintaining the 
                highest standards of compliance and professionalism.
              </p>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Key HR Focus Areas:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">Talent Acquisition:</p>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• Job posting optimization</li>
                      <li>• Candidate sourcing strategies</li>
                      <li>• Interview process design</li>
                      <li>• Offer negotiation guidance</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Employee Development:</p>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• Onboarding program design</li>
                      <li>• Training and development plans</li>
                      <li>• Performance management systems</li>
                      <li>• Career progression pathways</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">HR Operations:</p>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• Benefits administration</li>
                      <li>• Policy development and updates</li>
                      <li>• Compliance monitoring</li>
                      <li>• Employee relations support</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
