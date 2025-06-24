'use client'

// Testing Dashboard Component
// Interface for running and monitoring OAuth integration tests

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
  Activity,
  Target,
  Shield,
  Database,
  Globe,
  Settings,
  BarChart3,
  RefreshCw
} from 'lucide-react'

interface TestResult {
  success: boolean
  testName: string
  duration: number
  error?: string
  details?: any
  timestamp: Date
}

interface IntegrationTestSuite {
  integrationId: string
  integrationName: string
  tests: TestResult[]
  overallSuccess: boolean
  totalDuration: number
  passedTests: number
  failedTests: number
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  score: number
  recommendations: string[]
}

interface TestingDashboardProps {
  integrationId?: string
  className?: string
}

export default function TestingDashboard({ integrationId, className = '' }: TestingDashboardProps) {
  const [testSuite, setTestSuite] = useState<IntegrationTestSuite | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [running, setRunning] = useState(false)
  const [selectedTest, setSelectedTest] = useState<string>('all')
  const [lastRun, setLastRun] = useState<Date | null>(null)

  useEffect(() => {
    if (integrationId) {
      loadValidationReport()
    }
  }, [integrationId])

  const loadValidationReport = async () => {
    if (!integrationId) return

    try {
      const response = await fetch(`/api/integrations/test?action=validation_report&integration=${integrationId}`)
      if (response.ok) {
        const data = await response.json()
        setValidation(data.validation)
      }
    } catch (error) {
      console.error('Failed to load validation report:', error)
    }
  }

  const runTest = async (testType: string = 'all') => {
    if (!integrationId && testType !== 'all') return

    setRunning(true)
    setTestSuite(null)

    try {
      let requestBody: any = { action: testType === 'all' ? 'test_all' : 'test_integration' }
      
      if (integrationId && testType !== 'all') {
        requestBody.integrationId = integrationId
      }

      if (testType !== 'all' && testType !== 'test_integration') {
        requestBody = {
          action: 'test_specific',
          integrationId,
          testType
        }
      }

      const response = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const data = await response.json()
        
        if (testType === 'all') {
          // Handle full test suite results
          setTestSuite(data.fullTestSuite?.suites?.[0] || null)
        } else if (testType === 'test_integration') {
          setTestSuite(data.testSuite)
        } else {
          // Handle specific test result
          const mockSuite: IntegrationTestSuite = {
            integrationId: integrationId || 'test',
            integrationName: integrationId || 'Test',
            tests: [data.testResult],
            overallSuccess: data.testResult.success,
            totalDuration: data.testResult.duration,
            passedTests: data.testResult.success ? 1 : 0,
            failedTests: data.testResult.success ? 0 : 1
          }
          setTestSuite(mockSuite)
        }
        
        setLastRun(new Date())
        await loadValidationReport()
      }
    } catch (error) {
      console.error('Test execution failed:', error)
    } finally {
      setRunning(false)
    }
  }

  const getTestIcon = (testName: string) => {
    if (testName.includes('OAuth Configuration')) return <Settings className="w-4 h-4" />
    if (testName.includes('Auth URL')) return <Shield className="w-4 h-4" />
    if (testName.includes('API Connectivity')) return <Globe className="w-4 h-4" />
    if (testName.includes('Database')) return <Database className="w-4 h-4" />
    return <Activity className="w-4 h-4" />
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100'
    if (score >= 70) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {integrationId ? `Integration Testing - ${integrationId}` : 'Integration Testing'}
            </h3>
            <p className="text-sm text-gray-600">
              Validate OAuth flows, connectivity, and configuration
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {lastRun && (
              <span className="text-xs text-gray-500">
                Last run: {lastRun.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => runTest(selectedTest)}
              disabled={running}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {running ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{running ? 'Running...' : 'Run Tests'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Test Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test Type
          </label>
          <select
            value={selectedTest}
            onChange={(e) => setSelectedTest(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Tests</option>
            {integrationId && (
              <>
                <option value="test_integration">Integration Suite</option>
                <option value="oauth_config">OAuth Configuration</option>
                <option value="auth_url">Authorization URL</option>
                <option value="api_connectivity">API Connectivity</option>
              </>
            )}
            <option value="database_schema">Database Schema</option>
          </select>
        </div>

        {/* Validation Score */}
        {validation && (
          <div className={`mb-6 p-4 rounded-lg ${getScoreBgColor(validation.score)}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Validation Score</h4>
              <div className={`text-2xl font-bold ${getScoreColor(validation.score)}`}>
                {validation.score}/100
              </div>
            </div>
            
            {validation.errors.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
                <ul className="text-sm text-red-700 space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-yellow-800 mb-1">Warnings:</p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.recommendations.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-800 mb-1">Recommendations:</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {validation.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Test Results */}
        {testSuite && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Tests</p>
                    <p className="text-xl font-bold text-blue-900">{testSuite.tests.length}</p>
                  </div>
                  <Target className="w-6 h-6 text-blue-500" />
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Passed</p>
                    <p className="text-xl font-bold text-green-900">{testSuite.passedTests}</p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Failed</p>
                    <p className="text-xl font-bold text-red-900">{testSuite.failedTests}</p>
                  </div>
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Duration</p>
                    <p className="text-xl font-bold text-gray-900">{testSuite.totalDuration}ms</p>
                  </div>
                  <Clock className="w-6 h-6 text-gray-500" />
                </div>
              </div>
            </div>

            {/* Individual Test Results */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Test Results</h4>
              {testSuite.tests.map((test, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border ${
                    test.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`mt-0.5 ${test.success ? 'text-green-500' : 'text-red-500'}`}>
                        {test.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          {getTestIcon(test.testName)}
                          <h5 className="font-medium text-gray-900">{test.testName}</h5>
                        </div>
                        {test.error && (
                          <p className="text-sm text-red-700 mt-1">{test.error}</p>
                        )}
                        {test.details && (
                          <div className="mt-2 text-xs text-gray-600">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(test.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{test.duration}ms</p>
                      <p>{test.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!testSuite && !running && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Tests Run Yet</h4>
            <p className="text-gray-600 mb-4">
              Run tests to validate your OAuth integration configuration and connectivity.
            </p>
            <button
              onClick={() => runTest(selectedTest)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors mx-auto"
            >
              <Zap className="w-4 h-4" />
              <span>Run First Test</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
