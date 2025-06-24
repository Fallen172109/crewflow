'use client'

import { useState, useEffect } from 'react'
import FlintAgent from '@/components/agents/FlintAgent'
import { useAuth } from '@/lib/auth-context'

export default function TestFlintPage() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Flint Agent...</p>
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
            🚢 CrewFlow - Flint Agent Test
          </h1>
          <p className="text-gray-600">
            Test the AutoGen-powered workflow automation capabilities of Flint
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Flint Agent - Workflow Automation Specialist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Framework: AutoGen Multi-Agent System</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Planner Agent:</strong> Analyzes requirements and creates strategy</li>
                  <li>• <strong>Designer Agent:</strong> Creates detailed workflow specifications</li>
                  <li>• <strong>Implementer Agent:</strong> Develops automation solutions</li>
                  <li>• <strong>Monitor Agent:</strong> Tracks performance and improvements</li>
                  <li>• <strong>Coordinator Agent:</strong> Orchestrates collaboration</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Core Capabilities:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Workflow Design:</strong> Multi-step process automation</li>
                  <li>• <strong>Process Optimization:</strong> Efficiency improvements</li>
                  <li>• <strong>Task Scheduling:</strong> Automated recurring processes</li>
                  <li>• <strong>Performance Monitoring:</strong> Success tracking</li>
                  <li>• <strong>Integration Management:</strong> Tool coordination</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-amber-50 rounded-lg">
              <h3 className="font-medium text-amber-900 mb-2">Sample Test Queries:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-amber-800">Workflow Creation:</p>
                  <p className="text-amber-700">"Design an automated customer onboarding workflow"</p>
                </div>
                <div>
                  <p className="font-medium text-amber-800">Process Optimization:</p>
                  <p className="text-amber-700">"Optimize our invoice approval process for efficiency"</p>
                </div>
                <div>
                  <p className="font-medium text-amber-800">Task Scheduling:</p>
                  <p className="text-amber-700">"Create automated scheduling for weekly reports"</p>
                </div>
                <div>
                  <p className="font-medium text-amber-800">Performance Monitoring:</p>
                  <p className="text-amber-700">"Set up monitoring for our automation workflows"</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Flint Agent Component */}
        <FlintAgent userId={user?.id} />

        {/* Additional Info */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About Flint's AutoGen Multi-Agent System</h2>
            <div className="prose max-w-none text-sm text-gray-600">
              <p>
                Flint uses AutoGen's multi-agent framework to break down complex workflow automation 
                tasks into specialized components, each handled by a dedicated AI agent:
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Agent Specializations:</h4>
                  <ul className="space-y-1">
                    <li>• <strong>Planner:</strong> Strategic analysis and requirement gathering</li>
                    <li>• <strong>Designer:</strong> Technical workflow specification</li>
                    <li>• <strong>Implementer:</strong> Solution development and integration</li>
                    <li>• <strong>Monitor:</strong> Performance tracking and optimization</li>
                    <li>• <strong>Coordinator:</strong> Agent communication and orchestration</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Process Benefits:</h4>
                  <ul className="space-y-1">
                    <li>• Comprehensive analysis from multiple perspectives</li>
                    <li>• Specialized expertise for each workflow aspect</li>
                    <li>• Iterative refinement through agent collaboration</li>
                    <li>• Robust error checking and validation</li>
                    <li>• Scalable automation architecture</li>
                  </ul>
                </div>
              </div>
              <p className="mt-4">
                This multi-agent approach ensures that workflow automation solutions are thoroughly 
                analyzed, well-designed, properly implemented, and continuously optimized for maximum 
                business value.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
