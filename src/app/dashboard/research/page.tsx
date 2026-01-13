'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  Search,
  TrendingUp,
  DollarSign,
  BarChart3,
  Building2,
  Globe,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Clock,
  Target,
  Layers,
  Zap,
  ChevronDown,
  X,
  AlertCircle,
  Check,
  Loader2,
  RefreshCw,
  FileText,
  Tag,
  Plus,
  Trash2
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

// ============================================================================
// TYPES
// ============================================================================

type ResearchType = 'price_research' | 'competitor_analysis' | 'market_research'
type Timeframe = 'current' | '6-month' | '1-year'

interface PriceResearchForm {
  productName: string
  category: string
  description: string
  features: string[]
  currency: string
}

interface CompetitorAnalysisForm {
  companyName: string
  industry: string
}

interface MarketResearchForm {
  market: string
  timeframe: Timeframe
}

interface CompetitorDataItem {
  source: string
  productName: string
  price: number
  currency: string
  url?: string
  similarity: number
}

interface PriceResearchResult {
  averagePrice: number
  minPrice: number
  maxPrice: number
  currency: string
  recommendedPrice: {
    min: number
    max: number
    optimal: number
    reasoning: string
  }
  competitorData: CompetitorDataItem[]
  marketInsights: {
    priceRange: string
    marketPosition: 'budget' | 'mid-range' | 'premium' | 'luxury'
    demandLevel: 'low' | 'medium' | 'high'
    seasonality: string
    trends: string[]
  }
  sources: string[]
  researchTimestamp: string
}

interface GeneralResearchResult {
  response: string
  sources: string[]
  timestamp: string
}

interface ResearchHistoryItem {
  id: string
  type: ResearchType
  query: string
  timestamp: string
  result: PriceResearchResult | GeneralResearchResult
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (Euro)', symbol: '€' },
  { value: 'GBP', label: 'GBP (Pound)', symbol: '£' },
  { value: 'PLN', label: 'PLN (Zloty)', symbol: 'zl' },
  { value: 'CAD', label: 'CAD ($)', symbol: 'C$' },
  { value: 'AUD', label: 'AUD ($)', symbol: 'A$' },
]

const RESEARCH_TYPES = [
  {
    id: 'price_research' as ResearchType,
    title: 'Price Research',
    description: 'Find competitor prices and optimal pricing',
    icon: DollarSign,
    gradient: 'from-emerald-500 to-green-600',
    bgGradient: 'from-emerald-50 to-green-50',
    borderColor: 'border-emerald-200',
    iconBg: 'bg-emerald-500'
  },
  {
    id: 'competitor_analysis' as ResearchType,
    title: 'Competitor Analysis',
    description: 'Analyze competitors in any industry',
    icon: Building2,
    gradient: 'from-blue-500 to-indigo-600',
    bgGradient: 'from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-500'
  },
  {
    id: 'market_research' as ResearchType,
    title: 'Market Research',
    description: 'Research market segments and trends',
    icon: Globe,
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-50 to-purple-50',
    borderColor: 'border-violet-200',
    iconBg: 'bg-violet-500'
  }
]

const TIMEFRAMES = [
  { value: 'current' as Timeframe, label: 'Current State' },
  { value: '6-month' as Timeframe, label: '6-Month Outlook' },
  { value: '1-year' as Timeframe, label: '1-Year Projection' },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (amount: number, currency: string): string => {
  const currencyInfo = CURRENCIES.find(c => c.value === currency)
  const symbol = currencyInfo?.symbol || '$'
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const getMarketPositionColor = (position: string): string => {
  switch (position) {
    case 'budget': return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'mid-range': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'premium': return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'luxury': return 'bg-rose-100 text-rose-700 border-rose-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

const getDemandLevelColor = (level: string): string => {
  switch (level) {
    case 'low': return 'bg-red-100 text-red-700'
    case 'medium': return 'bg-yellow-100 text-yellow-700'
    case 'high': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const getSimilarityWidth = (similarity: number): string => {
  return `${Math.round(similarity * 100)}%`
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CompetitiveIntelligenceHub() {
  const { user } = useAuth()

  // State
  const [selectedType, setSelectedType] = useState<ResearchType>('price_research')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form states
  const [priceForm, setPriceForm] = useState<PriceResearchForm>({
    productName: '',
    category: '',
    description: '',
    features: [],
    currency: 'USD'
  })
  const [competitorForm, setCompetitorForm] = useState<CompetitorAnalysisForm>({
    companyName: '',
    industry: ''
  })
  const [marketForm, setMarketForm] = useState<MarketResearchForm>({
    market: '',
    timeframe: 'current'
  })
  const [featureInput, setFeatureInput] = useState('')

  // Results
  const [priceResult, setPriceResult] = useState<PriceResearchResult | null>(null)
  const [generalResult, setGeneralResult] = useState<GeneralResearchResult | null>(null)

  // History
  const [history, setHistory] = useState<ResearchHistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  // Load research history from database on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return

      setHistoryLoading(true)
      try {
        const response = await fetch('/api/research/competitive?type=pending&limit=20')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data?.history) {
            // Transform database records to ResearchHistoryItem format
            const historyItems: ResearchHistoryItem[] = data.data.history.map((record: any) => ({
              id: record.id,
              type: record.research_type as ResearchType,
              query: getQueryFromRecord(record),
              timestamp: record.created_at,
              result: record.result_data?.pricing || record.result_data?.analysis || record.result_data?.research || record.result_data
            }))
            setHistory(historyItems)
          }
        }
      } catch (err) {
        console.warn('Failed to load research history:', err)
        // Don't show error to user, just use empty history
      } finally {
        setHistoryLoading(false)
      }
    }

    loadHistory()
  }, [user])

  // Helper to extract query string from database record
  const getQueryFromRecord = (record: any): string => {
    const data = record.request_data
    if (!data) return 'Unknown query'

    switch (record.research_type) {
      case 'price_research':
        return `${data.productName || 'Product'} in ${data.category || 'Category'}`
      case 'competitor_analysis':
        return `${data.company || 'Company'} in ${data.industry || 'Industry'}`
      case 'market_research':
        return `${data.market || 'Market'} (${data.timeframe || 'current'})`
      default:
        return 'Research query'
    }
  }

  // Clear messages after timeout
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  // Feature tag handling
  const addFeature = useCallback(() => {
    const trimmed = featureInput.trim()
    if (trimmed && !priceForm.features.includes(trimmed)) {
      setPriceForm(prev => ({ ...prev, features: [...prev.features, trimmed] }))
      setFeatureInput('')
    }
  }, [featureInput, priceForm.features])

  const removeFeature = (feature: string) => {
    setPriceForm(prev => ({ ...prev, features: prev.features.filter(f => f !== feature) }))
  }

  const handleFeatureKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addFeature()
    }
  }

  // Research submission
  const handleSubmit = async () => {
    setError(null)
    setIsLoading(true)

    try {
      let payload: Record<string, unknown> = { type: selectedType }

      if (selectedType === 'price_research') {
        if (!priceForm.productName.trim() || !priceForm.category.trim() || !priceForm.description.trim()) {
          throw new Error('Product name, category, and description are required')
        }
        payload = {
          ...payload,
          productName: priceForm.productName,
          category: priceForm.category,
          description: priceForm.description,
          features: priceForm.features,
          currency: priceForm.currency
        }
      } else if (selectedType === 'competitor_analysis') {
        if (!competitorForm.companyName.trim() || !competitorForm.industry.trim()) {
          throw new Error('Company name and industry are required')
        }
        payload = {
          ...payload,
          company: competitorForm.companyName,
          industry: competitorForm.industry
        }
      } else if (selectedType === 'market_research') {
        if (!marketForm.market.trim()) {
          throw new Error('Market/niche is required')
        }
        payload = {
          ...payload,
          market: marketForm.market,
          timeframe: marketForm.timeframe
        }
      }

      const response = await fetch('/api/research/competitive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Research request failed')
      }

      const result = await response.json()

      if (selectedType === 'price_research') {
        // API returns { success, data: { type, pricing: PriceResearchResult } }
        const pricingData = result.data?.pricing || result.data
        setPriceResult(pricingData)
        setGeneralResult(null)

        // Add to history
        const historyItem: ResearchHistoryItem = {
          id: `research-${Date.now()}`,
          type: selectedType,
          query: `${priceForm.productName} in ${priceForm.category}`,
          timestamp: new Date().toISOString(),
          result: pricingData
        }
        setHistory(prev => [historyItem, ...prev].slice(0, 20))
      } else if (selectedType === 'competitor_analysis') {
        // API returns { success, data: { type, analysis: { content, sources, ... } } }
        const analysisData = result.data?.analysis || result.data
        setGeneralResult({
          response: analysisData?.content || analysisData?.response || 'No response received',
          sources: analysisData?.sources || [],
          timestamp: new Date().toISOString()
        })
        setPriceResult(null)

        const historyItem: ResearchHistoryItem = {
          id: `research-${Date.now()}`,
          type: selectedType,
          query: `${competitorForm.companyName} in ${competitorForm.industry}`,
          timestamp: new Date().toISOString(),
          result: {
            response: analysisData?.content || analysisData?.response || '',
            sources: analysisData?.sources || [],
            timestamp: new Date().toISOString()
          }
        }
        setHistory(prev => [historyItem, ...prev].slice(0, 20))
      } else {
        // Market research: API returns { success, data: { type, research: { content, sources, ... } } }
        const researchData = result.data?.research || result.data
        setGeneralResult({
          response: researchData?.content || researchData?.response || 'No response received',
          sources: researchData?.sources || [],
          timestamp: new Date().toISOString()
        })
        setPriceResult(null)

        const historyItem: ResearchHistoryItem = {
          id: `research-${Date.now()}`,
          type: selectedType,
          query: `${marketForm.market} (${marketForm.timeframe})`,
          timestamp: new Date().toISOString(),
          result: {
            response: researchData?.content || researchData?.response || '',
            sources: researchData?.sources || [],
            timestamp: new Date().toISOString()
          }
        }
        setHistory(prev => [historyItem, ...prev].slice(0, 20))
      }

      setSuccessMessage('Research completed successfully!')
    } catch (err) {
      console.error('Research error:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete research')
    } finally {
      setIsLoading(false)
    }
  }

  // Load history item
  const loadHistoryItem = (item: ResearchHistoryItem) => {
    setSelectedType(item.type)
    if (item.type === 'price_research') {
      setPriceResult(item.result as PriceResearchResult)
      setGeneralResult(null)
    } else {
      setGeneralResult(item.result as GeneralResearchResult)
      setPriceResult(null)
    }
    setShowHistory(false)
  }

  // Get current type config
  const currentTypeConfig = RESEARCH_TYPES.find(t => t.id === selectedType) || RESEARCH_TYPES[0]

  return (
    <div className="min-h-screen pb-12">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-green-100/40 via-emerald-50/20 to-transparent rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-100/30 via-indigo-50/20 to-transparent rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px'
          }}
        />
      </div>

      <div className="space-y-8">
        {/* Header Section */}
        <header className="relative">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200/50 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-semibold text-green-700 tracking-wide uppercase">Intelligence Hub</span>
              </div>

              {/* Title */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl blur-lg opacity-40" />
                  <div className="relative w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/25">
                    <BarChart3 className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    Competitive Intelligence
                  </h1>
                  <p className="text-gray-500 mt-1">
                    AI-powered market research and pricing analysis
                  </p>
                </div>
              </div>
            </div>

            {/* History Toggle */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                ${showHistory
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:shadow-md'
                }
              `}
            >
              <Clock className="w-4 h-4" />
              <span>Research History</span>
              {history.length > 0 && (
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-semibold
                  ${showHistory ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}
                `}>
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Alert Messages */}
        {(error || successMessage) && (
          <div className={`
            flex items-center gap-3 px-5 py-4 rounded-xl border backdrop-blur-sm
            ${error
              ? 'bg-red-50/80 border-red-200 text-red-700'
              : 'bg-green-50/80 border-green-200 text-green-700'
            }
            animate-in slide-in-from-top-2 duration-300
          `}>
            {error ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <Check className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="font-medium">{error || successMessage}</span>
          </div>
        )}

        {/* Research Type Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {RESEARCH_TYPES.map((type) => {
            const Icon = type.icon
            const isSelected = selectedType === type.id
            return (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedType(type.id)
                  setPriceResult(null)
                  setGeneralResult(null)
                }}
                disabled={isLoading}
                className={`
                  relative group overflow-hidden rounded-2xl p-5 text-left transition-all duration-300
                  ${isSelected
                    ? `bg-gradient-to-br ${type.bgGradient} border-2 ${type.borderColor} shadow-lg`
                    : 'bg-white border-2 border-gray-100 hover:border-gray-200 hover:shadow-md'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${type.gradient} flex items-center justify-center`}>
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300
                    ${isSelected
                      ? `bg-gradient-to-br ${type.gradient} shadow-lg`
                      : 'bg-gray-100 group-hover:bg-gray-200'
                    }
                  `}>
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                      {type.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">{type.description}</p>
                  </div>
                </div>

                {/* Hover effect line */}
                <div className={`
                  absolute bottom-0 left-0 right-0 h-1 transition-all duration-300
                  ${isSelected ? `bg-gradient-to-r ${type.gradient}` : 'bg-transparent group-hover:bg-gray-100'}
                `} />
              </button>
            )
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Input Form Panel */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-6">
              {/* Form Header */}
              <div className={`px-5 py-4 border-b bg-gradient-to-r ${currentTypeConfig.bgGradient} border-gray-100`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${currentTypeConfig.iconBg} flex items-center justify-center`}>
                    <currentTypeConfig.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{currentTypeConfig.title}</h2>
                    <p className="text-xs text-gray-500">Enter details below</p>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-5 space-y-5">
                {selectedType === 'price_research' && (
                  <>
                    {/* Product Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={priceForm.productName}
                        onChange={(e) => setPriceForm(prev => ({ ...prev, productName: e.target.value }))}
                        placeholder="e.g., Premium Leather Wallet"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={priceForm.category}
                        onChange={(e) => setPriceForm(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="e.g., Fashion Accessories"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={priceForm.description}
                        onChange={(e) => setPriceForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your product in detail..."
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Features */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Key Features
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={featureInput}
                          onChange={(e) => setFeatureInput(e.target.value)}
                          onKeyDown={handleFeatureKeyDown}
                          placeholder="Add feature and press Enter"
                          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                          disabled={isLoading}
                        />
                        <button
                          onClick={addFeature}
                          disabled={!featureInput.trim() || isLoading}
                          className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {priceForm.features.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {priceForm.features.map((feature, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200"
                            >
                              <Tag className="w-3 h-3" />
                              {feature}
                              <button
                                onClick={() => removeFeature(feature)}
                                className="ml-1 hover:text-green-900"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Currency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <div className="relative">
                        <select
                          value={priceForm.currency}
                          onChange={(e) => setPriceForm(prev => ({ ...prev, currency: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                          disabled={isLoading}
                        >
                          {CURRENCIES.map(curr => (
                            <option key={curr.value} value={curr.value}>{curr.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </>
                )}

                {selectedType === 'competitor_analysis' && (
                  <>
                    {/* Company Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={competitorForm.companyName}
                        onChange={(e) => setCompetitorForm(prev => ({ ...prev, companyName: e.target.value }))}
                        placeholder="e.g., Apple, Nike, Tesla"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Industry */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Industry <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={competitorForm.industry}
                        onChange={(e) => setCompetitorForm(prev => ({ ...prev, industry: e.target.value }))}
                        placeholder="e.g., Consumer Electronics, Sportswear"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        disabled={isLoading}
                      />
                    </div>
                  </>
                )}

                {selectedType === 'market_research' && (
                  <>
                    {/* Market/Niche */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Market / Niche <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={marketForm.market}
                        onChange={(e) => setMarketForm(prev => ({ ...prev, market: e.target.value }))}
                        placeholder="e.g., Sustainable Fashion, AI SaaS"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Timeframe */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timeframe
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {TIMEFRAMES.map((tf) => (
                          <button
                            key={tf.value}
                            onClick={() => setMarketForm(prev => ({ ...prev, timeframe: tf.value }))}
                            disabled={isLoading}
                            className={`
                              px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                              ${marketForm.timeframe === tf.value
                                ? 'bg-violet-100 text-violet-700 border-2 border-violet-300'
                                : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:border-gray-200'
                              }
                              disabled:opacity-50
                            `}
                          >
                            {tf.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className={`
                    w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-white
                    transition-all duration-300 transform
                    ${isLoading
                      ? 'bg-gray-300 cursor-not-allowed'
                      : `bg-gradient-to-r ${currentTypeConfig.gradient} hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`
                    }
                  `}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Researching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      <span>Start Research</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="xl:col-span-2 space-y-6">
            {/* History Sidebar (when expanded) */}
            {showHistory && history.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-300">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Recent Research</h3>
                  </div>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                  {history.map((item) => {
                    const typeConfig = RESEARCH_TYPES.find(t => t.id === item.type) || RESEARCH_TYPES[0]
                    return (
                      <button
                        key={item.id}
                        onClick={() => loadHistoryItem(item)}
                        className="w-full px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg ${typeConfig.iconBg} flex items-center justify-center flex-shrink-0`}>
                          <typeConfig.icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{item.query}</p>
                          <p className="text-xs text-gray-500">{formatTimeAgo(item.timestamp)}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-12 flex flex-col items-center justify-center">
                  <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                    <div className={`absolute inset-0 rounded-full border-4 border-transparent border-t-current animate-spin`} style={{ color: selectedType === 'price_research' ? '#10b981' : selectedType === 'competitor_analysis' ? '#3b82f6' : '#8b5cf6' }} />
                    <div className={`absolute inset-3 rounded-full bg-gradient-to-br ${currentTypeConfig.bgGradient} animate-pulse flex items-center justify-center`}>
                      <currentTypeConfig.icon className="w-8 h-8" style={{ color: selectedType === 'price_research' ? '#10b981' : selectedType === 'competitor_analysis' ? '#3b82f6' : '#8b5cf6' }} />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Market Data</h3>
                  <p className="text-gray-500 text-sm text-center max-w-md">
                    Our AI is searching real-time sources and analyzing competitive intelligence. This typically takes 15-30 seconds.
                  </p>
                  <div className="mt-6 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Price Research Results */}
            {!isLoading && priceResult && (
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Average Price */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-500">Average Price</span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(priceResult.averagePrice, priceResult.currency)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Market average</p>
                  </div>

                  {/* Price Range */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-500">Price Range</span>
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(priceResult.minPrice, priceResult.currency)} - {formatCurrency(priceResult.maxPrice, priceResult.currency)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{priceResult.marketInsights.priceRange}</p>
                  </div>

                  {/* Market Position */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-500">Market Position</span>
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Target className="w-4 h-4 text-purple-600" />
                      </div>
                    </div>
                    <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-semibold border capitalize ${getMarketPositionColor(priceResult.marketInsights.marketPosition)}`}>
                      {priceResult.marketInsights.marketPosition}
                    </span>
                  </div>

                  {/* Demand Level */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-500">Demand Level</span>
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-amber-600" />
                      </div>
                    </div>
                    <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-semibold capitalize ${getDemandLevelColor(priceResult.marketInsights.demandLevel)}`}>
                      {priceResult.marketInsights.demandLevel} demand
                    </span>
                  </div>
                </div>

                {/* Recommended Pricing */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-emerald-200/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Recommended Pricing</h3>
                      <p className="text-sm text-gray-500">AI-optimized price suggestion</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-white/50 rounded-xl">
                        <p className="text-sm text-gray-500 mb-1">Minimum</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(priceResult.recommendedPrice.min, priceResult.currency)}</p>
                      </div>
                      <div className="text-center p-4 bg-emerald-100/50 rounded-xl border-2 border-emerald-300">
                        <p className="text-sm text-emerald-700 font-medium mb-1">Optimal</p>
                        <p className="text-2xl font-bold text-emerald-700">{formatCurrency(priceResult.recommendedPrice.optimal, priceResult.currency)}</p>
                      </div>
                      <div className="text-center p-4 bg-white/50 rounded-xl">
                        <p className="text-sm text-gray-500 mb-1">Maximum</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(priceResult.recommendedPrice.max, priceResult.currency)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {priceResult.recommendedPrice.reasoning}
                    </p>
                  </div>
                </div>

                {/* Competitor Data Table */}
                {priceResult.competitorData.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-gray-500" />
                      <h3 className="font-semibold text-gray-900">Competitor Pricing</h3>
                      <span className="ml-auto px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        {priceResult.competitorData.length} sources
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Similarity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {priceResult.competitorData.map((competitor, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <Globe className="w-4 h-4 text-gray-500" />
                                  </div>
                                  <span className="font-medium text-gray-900">{competitor.source}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-gray-700 line-clamp-1">{competitor.productName}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-semibold text-gray-900">
                                  {formatCurrency(competitor.price, competitor.currency)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-500"
                                      style={{ width: getSimilarityWidth(competitor.similarity) }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-gray-600 w-12">
                                    {Math.round(competitor.similarity * 100)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Market Insights */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Market Insights</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Seasonality</h4>
                        <p className="text-gray-700">{priceResult.marketInsights.seasonality}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Market Trends</h4>
                        <div className="flex flex-wrap gap-2">
                          {priceResult.marketInsights.trends.map((trend, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg"
                            >
                              <TrendingUp className="w-3 h-3" />
                              {trend}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sources */}
                {priceResult.sources.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Research Sources
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {priceResult.sources.map((source, idx) => (
                        <a
                          key={idx}
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-sm rounded-lg border border-gray-200 hover:border-gray-300 hover:text-gray-900 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {(() => {
                            try {
                              return new URL(source).hostname.replace('www.', '')
                            } catch {
                              return source.slice(0, 30) + (source.length > 30 ? '...' : '')
                            }
                          })()}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* General Research Results (Competitor/Market) */}
            {!isLoading && generalResult && (
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                {/* Response Content */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className={`px-6 py-4 border-b bg-gradient-to-r ${currentTypeConfig.bgGradient} border-gray-100 flex items-center gap-3`}>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentTypeConfig.gradient} flex items-center justify-center shadow-lg`}>
                      <currentTypeConfig.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Research Results</h3>
                      <p className="text-sm text-gray-500">Generated {formatTimeAgo(generalResult.timestamp)}</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="prose prose-base max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700 prose-code:text-green-600 prose-code:bg-green-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-blockquote:border-green-500 prose-blockquote:text-gray-600">
                      <ReactMarkdown>{generalResult.response}</ReactMarkdown>
                    </div>
                  </div>
                </div>

                {/* Sources */}
                {generalResult.sources.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <h3 className="font-semibold text-gray-900">Sources</h3>
                      <span className="ml-auto px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        {generalResult.sources.length} references
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {generalResult.sources.map((source, idx) => (
                          <a
                            key={idx}
                            href={source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                              <Globe className="w-4 h-4 text-gray-500" />
                            </div>
                            <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate flex-1">
                              {source}
                            </span>
                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !priceResult && !generalResult && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                      <Search className="w-10 h-10 text-gray-300" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Research</h3>
                  <p className="text-gray-500 max-w-md mb-8">
                    Select a research type, fill in the details, and let our AI analyze real-time market data to provide actionable competitive intelligence.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg">
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                      <DollarSign className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm text-gray-600">Price Analysis</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                      <Building2 className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-gray-600">Competitors</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                      <Globe className="w-5 h-5 text-violet-500" />
                      <span className="text-sm text-gray-600">Market Trends</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
