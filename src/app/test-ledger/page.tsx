'use client'

import { useState, useEffect } from 'react'
import LedgerAgent from '@/components/agents/LedgerAgent'
import { useAuth } from '@/lib/auth-context'

export default function TestLedgerPage() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Ledger Agent...</p>
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
            🚢 CrewFlow - Ledger Agent Test
          </h1>
          <p className="text-gray-600">
            Test the LangChain-powered finance and accounting capabilities of Ledger
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ledger Agent - Finance & Accounting Specialist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Framework: LangChain Financial Systems</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Precision & Accuracy:</strong> Financial data integrity</li>
                  <li>• <strong>Compliance Focus:</strong> Regulatory and audit requirements</li>
                  <li>• <strong>Process Automation:</strong> Streamlined financial workflows</li>
                  <li>• <strong>Risk Management:</strong> Financial controls and monitoring</li>
                  <li>• <strong>Strategic Insights:</strong> Data-driven financial analysis</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Core Financial Capabilities:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Invoice Processing:</strong> Automated AP workflows</li>
                  <li>• <strong>Expense Management:</strong> Multi-source reconciliation</li>
                  <li>• <strong>Cash Flow Analysis:</strong> Forecasting and optimization</li>
                  <li>• <strong>Financial Reporting:</strong> Comprehensive statements</li>
                  <li>• <strong>Budget Planning:</strong> Strategic financial planning</li>
                  <li>• <strong>Compliance Monitoring:</strong> Regulatory adherence</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">Sample Test Queries:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-green-800">Invoice Processing:</p>
                  <p className="text-green-700">"Set up automated invoice approval workflow for vendors"</p>
                </div>
                <div>
                  <p className="font-medium text-green-800">Expense Reconciliation:</p>
                  <p className="text-green-700">"Match credit card expenses with receipts and categorize"</p>
                </div>
                <div>
                  <p className="font-medium text-green-800">Cash Flow Analysis:</p>
                  <p className="text-green-700">"Analyze cash flow patterns and create 6-month forecast"</p>
                </div>
                <div>
                  <p className="font-medium text-green-800">Financial Reporting:</p>
                  <p className="text-green-700">"Generate monthly P&L and balance sheet reports"</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Agent Component */}
        <LedgerAgent userId={user?.id} />

        {/* Additional Info */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About Ledger's Financial Management Approach</h2>
            <div className="prose max-w-none text-sm text-gray-600">
              <p>
                Ledger leverages LangChain's structured approach to provide comprehensive finance and 
                accounting capabilities, focusing on accuracy, compliance, and strategic financial insights:
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Financial Process Automation:</h4>
                  <ul className="space-y-1">
                    <li>• Automated invoice processing and approval workflows</li>
                    <li>• Multi-source expense matching and reconciliation</li>
                    <li>• Real-time cash flow monitoring and forecasting</li>
                    <li>• Standardized financial reporting and analysis</li>
                    <li>• Budget variance tracking and alerts</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Compliance & Controls:</h4>
                  <ul className="space-y-1">
                    <li>• GAAP and regulatory compliance monitoring</li>
                    <li>• Audit trail maintenance and documentation</li>
                    <li>• Financial controls and risk management</li>
                    <li>• Tax compliance and reporting</li>
                    <li>• Data integrity and validation checks</li>
                  </ul>
                </div>
              </div>
              <p className="mt-4">
                Ledger's systematic approach ensures that financial processes are not only efficient 
                but also maintain the highest standards of accuracy and compliance, providing 
                stakeholders with reliable financial information for decision-making.
              </p>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Key Financial Focus Areas:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">Accounts Payable:</p>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• Invoice processing automation</li>
                      <li>• Vendor management and payments</li>
                      <li>• Three-way matching validation</li>
                      <li>• Cash flow optimization</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Financial Analysis:</p>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• Cash flow forecasting</li>
                      <li>• Profitability analysis</li>
                      <li>• Budget vs. actual variance</li>
                      <li>• Financial ratio analysis</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Reporting & Compliance:</p>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• Financial statement preparation</li>
                      <li>• Management reporting</li>
                      <li>• Regulatory compliance</li>
                      <li>• Audit support and documentation</li>
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
