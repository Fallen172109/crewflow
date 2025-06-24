'use client'

import { useState, useEffect } from 'react'
import PatchAgent from '@/components/agents/PatchAgent'
import { useAuth } from '@/lib/auth-context'

export default function TestPatchPage() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Patch Agent...</p>
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
            🚢 CrewFlow - Patch Agent Test
          </h1>
          <p className="text-gray-600">
            Test the LangChain-powered IT service desk capabilities of Patch
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Patch Agent - IT Service Desk Specialist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Framework: LangChain ITIL Service Management</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Systematic Approach:</strong> ITIL best practices integration</li>
                  <li>• <strong>User Experience Focus:</strong> Service quality optimization</li>
                  <li>• <strong>Proactive Management:</strong> Prevention over reaction</li>
                  <li>• <strong>Security Integration:</strong> Compliance and risk management</li>
                  <li>• <strong>Automation First:</strong> Self-healing system design</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Core IT Service Capabilities:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Ticket Triage:</strong> Intelligent prioritization and routing</li>
                  <li>• <strong>Automated Fixes:</strong> Self-healing system design</li>
                  <li>• <strong>Incident Management:</strong> Crisis response and escalation</li>
                  <li>• <strong>System Monitoring:</strong> Proactive infrastructure oversight</li>
                  <li>• <strong>Asset Management:</strong> Lifecycle tracking and compliance</li>
                  <li>• <strong>Knowledge Base:</strong> Centralized solution repository</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-medium text-slate-900 mb-2">Sample Test Queries:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-slate-800">Ticket Triage:</p>
                  <p className="text-slate-700">"Set up automated ticket prioritization for our help desk"</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Automated Fixes:</p>
                  <p className="text-slate-700">"Design self-healing systems for common IT issues"</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Incident Management:</p>
                  <p className="text-slate-700">"Create escalation procedures for critical system outages"</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">System Monitoring:</p>
                  <p className="text-slate-700">"Implement comprehensive infrastructure monitoring"</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Patch Agent Component */}
        <PatchAgent userId={user?.id} />

        {/* Additional Info */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About Patch's IT Service Management Approach</h2>
            <div className="prose max-w-none text-sm text-gray-600">
              <p>
                Patch leverages LangChain's structured approach combined with ITIL best practices to provide 
                comprehensive IT service desk capabilities, focusing on user experience, proactive management, 
                and automated problem resolution:
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Service Management Automation:</h4>
                  <ul className="space-y-1">
                    <li>• Intelligent ticket triage and routing</li>
                    <li>• Automated issue resolution and self-healing</li>
                    <li>• Proactive system monitoring and alerting</li>
                    <li>• Streamlined incident escalation procedures</li>
                    <li>• Comprehensive asset lifecycle management</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">ITIL Best Practices:</h4>
                  <ul className="space-y-1">
                    <li>• Incident and problem management frameworks</li>
                    <li>• Change and configuration management</li>
                    <li>• Service level agreement monitoring</li>
                    <li>• Continuous service improvement processes</li>
                    <li>• Knowledge management and documentation</li>
                  </ul>
                </div>
              </div>
              <p className="mt-4">
                Patch's systematic approach ensures that IT services are delivered efficiently while 
                maintaining high user satisfaction, system reliability, and security compliance.
              </p>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Key IT Service Focus Areas:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">Service Desk Operations:</p>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• Multi-channel support (phone, email, chat)</li>
                      <li>• Intelligent ticket routing and escalation</li>
                      <li>• Self-service portal and knowledge base</li>
                      <li>• SLA monitoring and compliance</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Infrastructure Management:</p>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• Proactive system monitoring</li>
                      <li>• Automated patch management</li>
                      <li>• Capacity planning and optimization</li>
                      <li>• Security incident response</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Process Improvement:</p>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• Root cause analysis and prevention</li>
                      <li>• Service quality metrics and reporting</li>
                      <li>• User satisfaction measurement</li>
                      <li>• Continuous improvement initiatives</li>
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
