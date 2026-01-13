'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { useShopifyStore } from '@/contexts/ShopifyStoreContext'
import Link from 'next/link'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Download,
  AlertTriangle,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Package,
  Zap,
  Database,
  ArrowUpRight,
  FileText,
  Trash2
} from 'lucide-react'

// =============================================================================
// Types & Interfaces
// =============================================================================

interface CSVRow {
  rowNumber: number
  data: Record<string, string>
  isValid: boolean
  errors: string[]
  warnings: string[]
}

interface ImportResult {
  success: boolean
  productId?: string
  productTitle?: string
  error?: string
}

type ImportMode = 'create' | 'update' | 'upsert'
type ImportState = 'initial' | 'file-selected' | 'parsing' | 'preview' | 'importing' | 'complete'

const CSV_COLUMNS = [
  { key: 'title', label: 'Title', required: true, description: 'Product name' },
  { key: 'description', label: 'Description', required: false, description: 'Product description (HTML supported)' },
  { key: 'vendor', label: 'Vendor', required: false, description: 'Product vendor/brand' },
  { key: 'product_type', label: 'Product Type', required: false, description: 'Category of product' },
  { key: 'tags', label: 'Tags', required: false, description: 'Comma-separated tags' },
  { key: 'price', label: 'Price', required: true, description: 'Product price (numeric)' },
  { key: 'compare_at_price', label: 'Compare At Price', required: false, description: 'Original price for sale display' },
  { key: 'sku', label: 'SKU', required: false, description: 'Stock keeping unit' },
  { key: 'barcode', label: 'Barcode', required: false, description: 'Product barcode/UPC' },
  { key: 'inventory_quantity', label: 'Inventory Qty', required: false, description: 'Stock quantity' },
  { key: 'weight', label: 'Weight', required: false, description: 'Product weight' },
  { key: 'weight_unit', label: 'Weight Unit', required: false, description: 'lb, kg, oz, or g' }
]

const IMPORT_MODES: { value: ImportMode; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'create', label: 'Create New', description: 'Only create new products', icon: <Package className="w-4 h-4" /> },
  { value: 'update', label: 'Update Existing', description: 'Only update by SKU match', icon: <RotateCcw className="w-4 h-4" /> },
  { value: 'upsert', label: 'Upsert', description: 'Create or update as needed', icon: <Zap className="w-4 h-4" /> }
]

// =============================================================================
// Helper Functions
// =============================================================================

const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(parseRow)

  return { headers, rows }
}

const validateRow = (data: Record<string, string>, rowNumber: number): { isValid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = []
  const warnings: string[] = []

  // Required field validation
  if (!data.title?.trim()) {
    errors.push('Title is required')
  }

  if (!data.price?.trim()) {
    errors.push('Price is required')
  } else {
    const price = parseFloat(data.price)
    if (isNaN(price) || price < 0) {
      errors.push('Price must be a valid positive number')
    }
  }

  // Optional field validation
  if (data.compare_at_price?.trim()) {
    const comparePrice = parseFloat(data.compare_at_price)
    if (isNaN(comparePrice) || comparePrice < 0) {
      warnings.push('Compare at price should be a valid number')
    } else {
      const price = parseFloat(data.price || '0')
      if (comparePrice <= price) {
        warnings.push('Compare at price should be higher than price')
      }
    }
  }

  if (data.inventory_quantity?.trim()) {
    const qty = parseInt(data.inventory_quantity)
    if (isNaN(qty) || qty < 0) {
      warnings.push('Inventory quantity should be a non-negative integer')
    }
  }

  if (data.weight?.trim()) {
    const weight = parseFloat(data.weight)
    if (isNaN(weight) || weight < 0) {
      warnings.push('Weight should be a valid positive number')
    }
  }

  if (data.weight_unit?.trim()) {
    const validUnits = ['lb', 'kg', 'oz', 'g']
    if (!validUnits.includes(data.weight_unit.toLowerCase())) {
      warnings.push(`Weight unit should be one of: ${validUnits.join(', ')}`)
    }
  }

  return { isValid: errors.length === 0, errors, warnings }
}

const generateTemplateCSV = (): string => {
  const headers = CSV_COLUMNS.map(col => col.key)
  const exampleRow = [
    'Example Product Name',
    'This is a sample product description with <b>HTML</b> support.',
    'Sample Vendor',
    'Electronics',
    'featured, sale, new-arrival',
    '29.99',
    '39.99',
    'SKU-001',
    '012345678901',
    '100',
    '0.5',
    'kg'
  ]

  return [headers.join(','), exampleRow.join(',')].join('\n')
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Sanitize CSV values to prevent formula injection attacks.
 * Removes leading characters that could be interpreted as formulas
 * by spreadsheet applications (=, +, -, @, tab, carriage return).
 */
const sanitizeForCSVInjection = (value: string): string => {
  if (!value) return value
  // Strip leading dangerous characters that could trigger formula injection
  if (/^[=+\-@\t\r]/.test(value)) {
    return value.substring(1)
  }
  return value
}

// =============================================================================
// Main Component
// =============================================================================

export default function BulkImportPage() {
  const { selectedStore, stores, loading: storesLoading } = useShopifyStore()

  // State
  const [importState, setImportState] = useState<ImportState>('initial')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('create')
  const [skipFirstRow, setSkipFirstRow] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)
  const [parsedRows, setParsedRows] = useState<CSVRow[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [importCancelled, setImportCancelled] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Computed values
  const validRowCount = useMemo(() => parsedRows.filter(r => r.isValid).length, [parsedRows])
  const invalidRowCount = useMemo(() => parsedRows.filter(r => !r.isValid).length, [parsedRows])
  const warningRowCount = useMemo(() => parsedRows.filter(r => r.warnings.length > 0).length, [parsedRows])
  const successCount = useMemo(() => importResults.filter(r => r.success).length, [importResults])
  const failureCount = useMemo(() => importResults.filter(r => !r.success).length, [importResults])

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit')
      return
    }

    setSelectedFile(file)
    setError(null)
    setImportState('file-selected')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const parseFile = async () => {
    if (!selectedFile) return

    setImportState('parsing')
    setError(null)

    try {
      const text = await selectedFile.text()
      const { headers, rows } = parseCSV(text)

      if (headers.length === 0) {
        throw new Error('CSV file appears to be empty')
      }

      // Auto-map columns
      const mapping: Record<string, string> = {}
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '_')
        const matchedColumn = CSV_COLUMNS.find(col =>
          col.key === normalizedHeader ||
          col.label.toLowerCase().replace(/[^a-z0-9]/g, '_') === normalizedHeader
        )
        if (matchedColumn) {
          mapping[matchedColumn.key] = header
        }
      })
      setColumnMapping(mapping)

      // Parse and validate rows
      // skipFirstRow skips an additional row (e.g., template instructions row after headers)
      // parseCSV already removes the header row, so we skip 1 more if toggle is on
      const dataStartIndex = skipFirstRow ? 1 : 0
      const parsedData: CSVRow[] = rows.slice(dataStartIndex).map((row, index) => {
        const data: Record<string, string> = {}
        headers.forEach((header, colIndex) => {
          const matchedKey = Object.entries(mapping).find(([, v]) => v === header)?.[0]
          if (matchedKey) {
            // Sanitize values to prevent CSV injection attacks
            const rawValue = row[colIndex] || ''
            data[matchedKey] = sanitizeForCSVInjection(rawValue)
          }
        })

        const validation = validateRow(data, index + 1 + (skipFirstRow ? 1 : 0))

        return {
          rowNumber: index + 1 + (skipFirstRow ? 1 : 0),
          data,
          ...validation
        }
      })

      setParsedRows(parsedData)
      setImportState('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file')
      setImportState('file-selected')
    }
  }

  const startImport = async () => {
    if (!selectedStore || validRowCount === 0) return

    setImportState('importing')
    setImportProgress(0)
    setImportResults([])
    setImportCancelled(false)

    // Create a new AbortController for this import session
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    const validRows = parsedRows.filter(r => r.isValid)
    const results: ImportResult[] = []

    for (let i = 0; i < validRows.length; i++) {
      // Check if import was cancelled
      if (signal.aborted) {
        break
      }

      const row = validRows[i]

      try {
        const formData = new FormData()
        formData.append('storeId', selectedStore.id)
        formData.append('mode', importMode)
        formData.append('productData', JSON.stringify(row.data))

        // Create timeout controller that works with the abort signal
        const timeoutController = new AbortController()
        const timeoutId = setTimeout(() => timeoutController.abort(), 30000)

        // Combine both signals - abort if either timeout or user cancellation
        const combinedSignal = signal.aborted ? signal : timeoutController.signal

        try {
          const response = await fetch('/api/bulk-import', {
            method: 'POST',
            body: formData,
            signal: combinedSignal
          })

          clearTimeout(timeoutId)

          // Check again if cancelled during fetch
          if (signal.aborted) {
            break
          }

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Import failed')
          }

          const data = await response.json()
          results.push({
            success: true,
            productId: data.productId,
            productTitle: row.data.title
          })
        } catch (fetchErr) {
          clearTimeout(timeoutId)

          // Re-throw if it's a cancellation
          if (signal.aborted) {
            break
          }

          // Check if it's a timeout
          if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
            throw new Error('Request timed out after 30 seconds')
          }
          throw fetchErr
        }
      } catch (err) {
        // Don't add error if cancelled
        if (signal.aborted) {
          break
        }

        results.push({
          success: false,
          productTitle: row.data.title,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100))
      setImportResults([...results])
    }

    // Clean up
    abortControllerRef.current = null

    // If cancelled, mark as cancelled and transition to complete with partial results
    if (signal.aborted) {
      setImportCancelled(true)
    }

    setImportState('complete')
  }

  const cancelImport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const downloadTemplate = () => {
    const csv = generateTemplateCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'product_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const resetImport = () => {
    setImportState('initial')
    setSelectedFile(null)
    setParsedRows([])
    setColumnMapping({})
    setImportProgress(0)
    setImportResults([])
    setError(null)
    setExpandedRows(new Set())
    setImportCancelled(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const toggleRowExpanded = (rowNumber: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(rowNumber)) {
        next.delete(rowNumber)
      } else {
        next.add(rowNumber)
      }
      return next
    })
  }

  // ==========================================================================
  // Render Helpers
  // ==========================================================================

  const renderUploadZone = () => (
    <div
      className={`
        relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer group
        ${isDragOver
          ? 'border-emerald-400 bg-emerald-500/10 scale-[1.02]'
          : 'border-slate-600/50 hover:border-emerald-500/50 bg-slate-800/30 hover:bg-slate-800/50'
        }
      `}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(16, 185, 129, 0.3) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Flowing data animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent transform ${isDragOver ? 'animate-pulse' : ''}`} style={{ animationDuration: '2s' }} />
        <div className={`absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-emerald-400/20 to-transparent transform ${isDragOver ? 'animate-pulse' : ''}`} style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
        <div className={`absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent transform ${isDragOver ? 'animate-pulse' : ''}`} style={{ animationDuration: '2s', animationDelay: '1s' }} />
      </div>

      <div className="relative px-8 py-16 text-center">
        <div className={`
          inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 transition-all duration-300
          ${isDragOver
            ? 'bg-emerald-500/20 scale-110'
            : 'bg-slate-700/50 group-hover:bg-emerald-500/10 group-hover:scale-105'
          }
        `}>
          <FileSpreadsheet className={`w-10 h-10 transition-colors ${isDragOver ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-400'}`} />
        </div>

        <h3 className="text-xl font-semibold text-white mb-2">
          {isDragOver ? 'Drop your CSV file' : 'Upload CSV File'}
        </h3>
        <p className="text-slate-400 mb-4">
          Drag and drop your CSV file here, or click to browse
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            .csv only
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-600" />
          <span>Max 5MB</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  )

  const renderFileSelected = () => (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-white">{selectedFile?.name}</p>
            <p className="text-sm text-slate-400">{selectedFile && formatFileSize(selectedFile.size)}</p>
          </div>
        </div>
        <button
          onClick={resetImport}
          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Import Configuration */}
      <div className="p-6 space-y-6">
        {/* Import Mode */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Import Mode</label>
          <div className="grid grid-cols-3 gap-3">
            {IMPORT_MODES.map(mode => (
              <button
                key={mode.value}
                onClick={() => setImportMode(mode.value)}
                className={`
                  relative px-4 py-3 rounded-xl border text-left transition-all
                  ${importMode === mode.value
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={importMode === mode.value ? 'text-emerald-400' : 'text-slate-400'}>
                    {mode.icon}
                  </span>
                  <span className={`font-medium ${importMode === mode.value ? 'text-emerald-300' : 'text-slate-200'}`}>
                    {mode.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{mode.description}</p>
                {importMode === mode.value && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Skip Header Option */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-700/50 bg-slate-800/20">
          <div>
            <p className="font-medium text-slate-200">Skip header row</p>
            <p className="text-sm text-slate-500">First row contains column names</p>
          </div>
          <button
            onClick={() => setSkipFirstRow(!skipFirstRow)}
            className={`
              relative w-14 h-8 rounded-full transition-colors
              ${skipFirstRow ? 'bg-emerald-500' : 'bg-slate-600'}
            `}
          >
            <div className={`
              absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transition-transform
              ${skipFirstRow ? 'left-7' : 'left-1'}
            `} />
          </button>
        </div>

        {/* Parse Button */}
        <button
          onClick={parseFile}
          disabled={!selectedFile}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
        >
          <Database className="w-5 h-5" />
          Parse &amp; Validate CSV
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )

  const renderParsing = () => (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-12 text-center">
      <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
        <div className="absolute inset-2 rounded-full border-2 border-t-emerald-400 border-r-emerald-400 border-b-transparent border-l-transparent animate-spin" />
        <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Processing CSV</h3>
      <p className="text-slate-400">Parsing and validating your data...</p>

      {/* Animated data flow */}
      <div className="mt-8 flex justify-center gap-2">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  )

  const renderPreview = () => (
    <div className="space-y-6">
      {/* Validation Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
          <div className="text-3xl font-bold text-white mb-1">{parsedRows.length}</div>
          <div className="text-sm text-slate-400">Total Rows</div>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-3xl font-bold text-emerald-400">{validRowCount}</span>
          </div>
          <div className="text-sm text-slate-400">Valid</div>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-3xl font-bold text-red-400">{invalidRowCount}</span>
          </div>
          <div className="text-sm text-slate-400">Invalid</div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="text-3xl font-bold text-amber-400">{warningRowCount}</span>
          </div>
          <div className="text-sm text-slate-400">Warnings</div>
        </div>
      </div>

      {/* Column Mapping Display */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
        <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4" />
          Column Mapping
        </h4>
        <div className="flex flex-wrap gap-2">
          {CSV_COLUMNS.map(col => {
            const isMapped = !!columnMapping[col.key]
            return (
              <div
                key={col.key}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5
                  ${isMapped
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : col.required
                      ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                      : 'bg-slate-700/30 text-slate-500 border border-slate-600/30'
                  }
                `}
              >
                {isMapped ? <CheckCircle className="w-3 h-3" /> : col.required ? <XCircle className="w-3 h-3" /> : null}
                {col.label}
                {col.required && <span className="text-red-400">*</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Data Preview Table */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/50">
          <h4 className="font-medium text-slate-200">Data Preview</h4>
          <span className="text-sm text-slate-500">Showing first 50 rows</span>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-800 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-16">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-20">Status</th>
                {CSV_COLUMNS.slice(0, 6).map(col => (
                  <th key={col.key} className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider min-w-[120px]">
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {parsedRows.slice(0, 50).map(row => (
                <React.Fragment key={row.rowNumber}>
                  <tr
                    className={`
                      hover:bg-slate-700/20 transition-colors cursor-pointer
                      ${!row.isValid ? 'bg-red-500/5' : row.warnings.length > 0 ? 'bg-amber-500/5' : ''}
                    `}
                    onClick={() => toggleRowExpanded(row.rowNumber)}
                  >
                    <td className="px-3 py-2.5 text-sm font-mono text-slate-500">{row.rowNumber}</td>
                    <td className="px-3 py-2.5">
                      {row.isValid ? (
                        row.warnings.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            Warn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle className="w-3 h-3" />
                            Valid
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                          <XCircle className="w-3 h-3" />
                          Error
                        </span>
                      )}
                    </td>
                    {CSV_COLUMNS.slice(0, 6).map(col => (
                      <td key={col.key} className="px-3 py-2.5 text-sm text-slate-300 max-w-[200px] truncate">
                        {row.data[col.key] || <span className="text-slate-600">-</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2.5">
                      {expandedRows.has(row.rowNumber) ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </td>
                  </tr>
                  {expandedRows.has(row.rowNumber) && (
                    <tr className="bg-slate-800/50">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-6">
                          {/* All Data */}
                          <div>
                            <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">All Fields</h5>
                            <div className="space-y-1">
                              {CSV_COLUMNS.map(col => (
                                <div key={col.key} className="flex items-start gap-2 text-sm">
                                  <span className="text-slate-500 w-32 flex-shrink-0">{col.label}:</span>
                                  <span className="text-slate-300 font-mono text-xs">
                                    {row.data[col.key] || <span className="text-slate-600">empty</span>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Errors & Warnings */}
                          <div>
                            {row.errors.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />
                                  Errors
                                </h5>
                                <ul className="space-y-1">
                                  {row.errors.map((err, i) => (
                                    <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                                      <span className="w-1 h-1 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                                      {err}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {row.warnings.length > 0 && (
                              <div>
                                <h5 className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Warnings
                                </h5>
                                <ul className="space-y-1">
                                  {row.warnings.map((warn, i) => (
                                    <li key={i} className="text-sm text-amber-300 flex items-start gap-2">
                                      <span className="w-1 h-1 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                                      {warn}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {row.errors.length === 0 && row.warnings.length === 0 && (
                              <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm">All validations passed</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={resetImport}
          className="px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Start Over
        </button>

        <button
          onClick={startImport}
          disabled={validRowCount === 0 || !selectedStore}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
        >
          <Upload className="w-5 h-5" />
          Import {validRowCount} Products
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )

  const renderImporting = () => (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Importing Products</h3>
        <p className="text-slate-400">Please wait while we create your products...</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Progress</span>
          <span className="text-sm font-mono text-emerald-400">{importProgress}%</span>
        </div>
        <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-300 relative"
            style={{ width: `${importProgress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Live Results */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
          <div>
            <div className="text-2xl font-bold text-emerald-400">{successCount}</div>
            <div className="text-sm text-slate-400">Successful</div>
          </div>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-400" />
          <div>
            <div className="text-2xl font-bold text-red-400">{failureCount}</div>
            <div className="text-sm text-slate-400">Failed</div>
          </div>
        </div>
      </div>

      {/* Cancel Import Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={cancelImport}
          className="px-6 py-3 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
        >
          <XCircle className="w-5 h-5" />
          Cancel Import
        </button>
      </div>
    </div>
  )

  const renderComplete = () => (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-8 text-center">
        <div className={`
          inline-flex items-center justify-center w-20 h-20 rounded-full mb-6
          ${importCancelled ? 'bg-amber-500/10' : failureCount === 0 ? 'bg-emerald-500/10' : 'bg-amber-500/10'}
        `}>
          {importCancelled ? (
            <XCircle className="w-10 h-10 text-amber-400" />
          ) : failureCount === 0 ? (
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-10 h-10 text-amber-400" />
          )}
        </div>

        <h3 className="text-2xl font-bold text-white mb-2">
          {importCancelled
            ? 'Import Cancelled'
            : failureCount === 0
              ? 'Import Complete!'
              : 'Import Finished with Errors'}
        </h3>
        <p className="text-slate-400 mb-6">
          {importCancelled
            ? `${successCount} products were imported before cancellation`
            : `${successCount} of ${importResults.length} products were imported successfully`}
        </p>

        <div className="flex items-center justify-center gap-4">
          <div className="px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-2xl font-bold text-emerald-400">{successCount}</div>
            <div className="text-xs text-slate-400">Successful</div>
          </div>
          {failureCount > 0 && (
            <div className="px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="text-2xl font-bold text-red-400">{failureCount}</div>
              <div className="text-xs text-slate-400">Failed</div>
            </div>
          )}
        </div>
      </div>

      {/* Import Log */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
          <h4 className="font-medium text-slate-200">Import Log</h4>
        </div>
        <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-700/30">
          {importResults.map((result, index) => (
            <div
              key={index}
              className={`px-4 py-3 flex items-center gap-3 ${result.success ? '' : 'bg-red-500/5'}`}
            >
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{result.productTitle}</p>
                {result.error && (
                  <p className="text-xs text-red-400">{result.error}</p>
                )}
              </div>
              {result.success && result.productId && (
                <Link
                  href={`/dashboard/products/${result.productId}`}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  View
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={resetImport}
          className="px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Import More
        </button>

        <Link
          href="/dashboard/products"
          className="px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
        >
          View All Products
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )

  // ==========================================================================
  // Main Render
  // ==========================================================================

  // Loading state
  if (storesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading stores...</p>
        </div>
      </div>
    )
  }

  // No store connected
  if (!selectedStore && stores.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-2xl mx-auto px-6 py-20">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Store Connected</h2>
            <p className="text-slate-400 mb-6">Connect your Shopify store to start importing products</p>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors"
            >
              Connect Store
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link href="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboard/products" className="hover:text-slate-300 transition-colors">Products</Link>
            <span>/</span>
            <span className="text-slate-300">Bulk Import</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                </div>
                Bulk CSV Import
              </h1>
              <p className="text-slate-400">
                Import multiple products at once from a CSV file
              </p>
            </div>

            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-slate-500 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>
        </div>

        {/* Store Selector */}
        {stores.length > 1 && (
          <div className="mb-6 p-4 rounded-xl border border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${selectedStore?.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className="text-slate-300">Importing to:</span>
              <span className="font-medium text-white">{selectedStore?.storeName || selectedStore?.shopDomain}</span>
            </div>
            <Link
              href="/dashboard/settings"
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Change store
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-300">Error</p>
              <p className="text-sm text-red-400/80">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* State-based Content */}
        <div className="space-y-6">
          {importState === 'initial' && renderUploadZone()}
          {importState === 'file-selected' && renderFileSelected()}
          {importState === 'parsing' && renderParsing()}
          {importState === 'preview' && renderPreview()}
          {importState === 'importing' && renderImporting()}
          {importState === 'complete' && renderComplete()}
        </div>

        {/* CSV Column Reference */}
        {(importState === 'initial' || importState === 'file-selected') && (
          <div className="mt-8 rounded-xl border border-slate-700/50 bg-slate-800/20 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
              <h3 className="font-medium text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                CSV Column Reference
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {CSV_COLUMNS.map(col => (
                  <div
                    key={col.key}
                    className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-emerald-400">{col.key}</span>
                      {col.required && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{col.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  )
}
