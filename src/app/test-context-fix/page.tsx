'use client'

import { useState } from 'react'
import ThreadContextEditor from '@/components/agents/ThreadContextEditor'
import { getAgent } from '@/lib/agents'

export default function TestContextFixPage() {
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [testResult, setTestResult] = useState<string>('')

  const testAgent = getAgent('splash')
  
  const handleSave = async (context: string, attachments?: any[]) => {
    try {
      setTestResult('✅ Context save function called successfully!')
      console.log('Context saved:', context, 'Attachments:', attachments)
      setIsEditorOpen(false)
    } catch (error) {
      setTestResult('❌ Error in save function: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const testContextEditor = () => {
    setTestResult('🧪 Testing context editor...')
    setIsEditorOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🧪 Context Editor Fix Test
          </h1>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="font-medium text-blue-900 mb-2">Issue Fixed:</h2>
              <p className="text-blue-800 text-sm">
                The "Cannot read properties of undefined (reading 'startsWith')" error in the FileUpload component 
                has been resolved by adding proper null/undefined checks.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={testContextEditor}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                🧪 Test Context Editor
              </button>
              
              {testResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  testResult.includes('✅') ? 'bg-green-50 text-green-800' :
                  testResult.includes('❌') ? 'bg-red-50 text-red-800' :
                  'bg-blue-50 text-blue-800'
                }`}>
                  {testResult}
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Fixes Applied:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• ✅ Fixed "startsWith" error in FileUpload component</li>
                <li>• ✅ Added data transformation for database attachments</li>
                <li>• ✅ Added URL refresh for expired signed URLs</li>
                <li>• ✅ Added corrupted file detection and cleanup</li>
                <li>• ✅ Enhanced error handling throughout</li>
                <li>• ✅ Added visual indicators for corrupted files</li>
                <li>• ✅ Created refresh-url API endpoint</li>
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-medium text-orange-900 mb-2">🔧 Context Issues Fixed:</h3>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• <strong>"NaN undefined" files:</strong> Now shows "Unknown file" with cleanup option</li>
                <li>• <strong>Expired image URLs:</strong> Automatically refreshed when loading context</li>
                <li>• <strong>Missing file data:</strong> Proper fallbacks and error handling</li>
                <li>• <strong>Database format mismatch:</strong> Transforms data to expected format</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Context Editor Modal */}
      {isEditorOpen && testAgent && (
        <ThreadContextEditor
          agent={testAgent}
          threadId="test-thread-123"
          currentContext="Test context for debugging"
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
