'use client'

import { useState } from 'react'
import { Download, FileText, Table, Code, Loader2, X } from 'lucide-react'

interface MealPlanExportProps {
  planId: string
  planName: string
  className?: string
  onClose?: () => void
}

export default function MealPlanExport({ planId, planName, className = '', onClose }: MealPlanExportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'html' | 'json'>('csv')

  const handleExport = async (format: 'csv' | 'html' | 'json') => {
    console.log(`Starting export for plan ${planId} in ${format} format`)
    setIsExporting(true)

    try {
      const apiUrl = `/api/meal-planning/export?planId=${planId}&format=${format}`
      console.log('Fetching export from:', apiUrl)
      const response = await fetch(apiUrl)

      if (!response.ok) {
        console.error('Export response not ok:', response.status, response.statusText)
        throw new Error('Export failed')
      }

      console.log('Export response received successfully')

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `meal-plan-${new Date().toISOString().split('T')[0]}.${format}`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Create blob and download
      const blob = await response.blob()
      console.log('Created blob, size:', blob.size)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      console.log('Download triggered for file:', filename)
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export meal plan. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const exportOptions = [
    {
      format: 'csv' as const,
      label: 'CSV Spreadsheet',
      description: 'Excel-compatible format with meal details and shopping list',
      icon: Table,
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      format: 'html' as const,
      label: 'HTML Document',
      description: 'Printable web page with formatted meal plan',
      icon: FileText,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      format: 'json' as const,
      label: 'JSON Data',
      description: 'Raw data format for developers and integrations',
      icon: Code,
      color: 'bg-purple-600 hover:bg-purple-700'
    }
  ]

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Download className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Export Meal Plan</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <p className="text-gray-600 mb-6">
        Download your meal plan in different formats for offline use, printing, or sharing.
      </p>

      <div className="space-y-3">
        {exportOptions.map((option) => {
          const Icon = option.icon
          return (
            <button
              key={option.format}
              onClick={() => handleExport(option.format)}
              disabled={isExporting}
              className={`w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isExporting ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${option.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.description}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <Download className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 text-orange-600 mt-0.5">
            💡
          </div>
          <div className="text-sm">
            <p className="font-medium text-orange-900 mb-1">Export Tips:</p>
            <ul className="text-orange-800 space-y-1">
              <li>• <strong>CSV:</strong> Open in Excel or Google Sheets for meal planning spreadsheets</li>
              <li>• <strong>HTML:</strong> Print-friendly format perfect for kitchen reference</li>
              <li>• <strong>JSON:</strong> Technical format for importing into other apps</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Exported files include meal schedules, recipes, shopping lists, and nutritional information
      </div>
    </div>
  )
}
