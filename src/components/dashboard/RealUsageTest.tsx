'use client'

import { useState } from 'react'

export default function RealUsageTest() {
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testRealUsage = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-real-usage')
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      setTestResult({ error: 'Failed to test real usage' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Real Usage Tracking Test</h2>
      
      <div className="space-y-4">
        <button
          onClick={testRealUsage}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? 'Testing...' : 'Test Real Usage Tracking'}
        </button>

        {testResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Test Results:</h3>
            
            {testResult.error ? (
              <div className="text-red-600">
                <p>❌ Error: {testResult.error}</p>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <span className={testResult.isRealTrackingWorking ? 'text-green-600' : 'text-yellow-600'}>
                    {testResult.isRealTrackingWorking ? '✅' : '⚠️'}
                  </span>
                  <span className="ml-2">
                    Real tracking working: {testResult.isRealTrackingWorking ? 'Yes' : 'No'}
                  </span>
                </div>
                
                <p><strong>Total Records:</strong> {testResult.totalRecords}</p>
                <p><strong>Real Usage Records:</strong> {testResult.realUsageRecords}</p>
                <p><strong>Message:</strong> {testResult.message}</p>
                
                {testResult.latestRecords && testResult.latestRecords.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium text-gray-900 mb-2">Latest Records:</h4>
                    <div className="space-y-1">
                      {testResult.latestRecords.map((record: any, index: number) => (
                        <div key={index} className="text-xs bg-white p-2 rounded border">
                          <span className={record.hasRealData ? 'text-green-600' : 'text-gray-600'}>
                            {record.hasRealData ? '✅' : '❌'}
                          </span>
                          <span className="ml-2">
                            {record.agent} ({record.provider}) - ${record.cost} - {record.tokens} tokens
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">How to Generate Real Usage Data:</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>1. Go to the <strong>Coral agent</strong> (customer support)</p>
            <p>2. Send a message or use a preset action</p>
            <p>3. The system will automatically track real token usage and costs</p>
            <p>4. Come back here and click "Test Real Usage Tracking" to verify</p>
          </div>
        </div>
      </div>
    </div>
  )
}
