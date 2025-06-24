'use client'

import { useState, useEffect } from 'react'
import SageAgent from '@/components/agents/SageAgent'
import { useAuth } from '@/lib/auth-context'

export default function TestSagePage() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Sage Agent...</p>
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
            🚢 CrewFlow - Sage Agent Test
          </h1>
          <p className="text-gray-600">
            Test the LangChain-powered knowledge management capabilities of Sage
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sage Agent - Knowledge Management Specialist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Framework: LangChain with NER</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Advanced NLP:</strong> Named Entity Recognition and extraction</li>
                  <li>• <strong>Document Intelligence:</strong> Smart content analysis</li>
                  <li>• <strong>Semantic Search:</strong> Context-aware information retrieval</li>
                  <li>• <strong>Content Synthesis:</strong> Intelligent summarization</li>
                  <li>• <strong>Knowledge Architecture:</strong> Structured organization</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Core Capabilities:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Document Search:</strong> Advanced search and retrieval</li>
                  <li>• <strong>Content Summarization:</strong> Intelligent abstracts</li>
                  <li>• <strong>Knowledge Base Design:</strong> Information architecture</li>
                  <li>• <strong>Question Answering:</strong> Context-aware responses</li>
                  <li>• <strong>Information Extraction:</strong> Key insight identification</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-900 mb-2">Sample Test Queries:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-purple-800">Document Search:</p>
                  <p className="text-purple-700">"Find all documents related to AI automation policies"</p>
                </div>
                <div>
                  <p className="font-medium text-purple-800">Content Summarization:</p>
                  <p className="text-purple-700">"Summarize our quarterly business review document"</p>
                </div>
                <div>
                  <p className="font-medium text-purple-800">Knowledge Base Design:</p>
                  <p className="text-purple-700">"Design a knowledge base for our technical documentation"</p>
                </div>
                <div>
                  <p className="font-medium text-purple-800">Question Answering:</p>
                  <p className="text-purple-700">"What are our current data retention policies?"</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sage Agent Component */}
        <SageAgent userId={user?.id} />

        {/* Additional Info */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About Sage's Knowledge Management Approach</h2>
            <div className="prose max-w-none text-sm text-gray-600">
              <p>
                Sage leverages advanced LangChain capabilities with Named Entity Recognition (NER) to provide 
                sophisticated knowledge management and information retrieval:
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Advanced NLP Features:</h4>
                  <ul className="space-y-1">
                    <li>• Named Entity Recognition for key information extraction</li>
                    <li>• Semantic search beyond keyword matching</li>
                    <li>• Context-aware content analysis</li>
                    <li>• Intelligent document classification</li>
                    <li>• Relationship mapping between concepts</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Knowledge Management Benefits:</h4>
                  <ul className="space-y-1">
                    <li>• Faster information discovery and retrieval</li>
                    <li>• Consistent knowledge organization</li>
                    <li>• Automated content summarization</li>
                    <li>• Intelligent question answering</li>
                    <li>• Scalable knowledge architecture</li>
                  </ul>
                </div>
              </div>
              <p className="mt-4">
                This makes Sage particularly effective for organizations with large document repositories, 
                complex knowledge bases, and teams that need quick access to accurate information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
