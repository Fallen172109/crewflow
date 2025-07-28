'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  BarChart3,
  PieChart,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Eye,
  Download,
  RefreshCw,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Anchor,
  Ship
} from 'lucide-react'

interface KPIMetric {
  id: string
  name: string
  value: number
  change: number
  trend: 'up' | 'down' | 'stable'
  target?: number
  format: 'currency' | 'number' | 'percentage'
  period: string
}

interface ForecastData {
  metric: string
  current: number
  forecast: number[]
  confidence: number
  timeframe: string
}

interface BusinessInsight {
  id: string
  type: 'opportunity' | 'warning' | 'success' | 'info'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  actionRequired: boolean
  recommendations: string[]
  data: any
}

export default function BusinessIntelligenceDashboard() {
  const [kpis, setKpis] = useState<KPIMetric[]>([])
  const [forecasts, setForecasts] = useState<ForecastData[]>([])
  const [insights, setInsights] = useState<BusinessInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d')
  const [selectedView, setSelectedView] = useState('overview')

  useEffect(() => {
    loadBusinessIntelligence()
  }, [selectedTimeframe])

  const loadBusinessIntelligence = async () => {
    try {
      setLoading(true)
      setError(null)

      // TODO: Implement actual business intelligence API calls
      // For now, show empty state
      const emptyKPIs: KPIMetric[] = []
      const emptyForecasts: ForecastData[] = []
      const emptyInsights: BusinessInsight[] = []

      setKpis(emptyKPIs)
      setForecasts(emptyForecasts)
      setInsights(emptyInsights)
    } catch (error) {
      console.error('Failed to load business intelligence:', error)
      setError(error instanceof Error ? error.message : 'Failed to load business intelligence')
    } finally {
      setLoading(false)
    }

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString()}`
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'number':
        return value.toLocaleString()
      default:
        return value.toString()
    }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString()}`
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'number':
        return value.toLocaleString()
      default:
        return value.toString()
    }
  }

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === 'up' || change > 0) {
      return <TrendingUp className="w-4 h-4 text-green-600" />
    } else if (trend === 'down' || change < 0) {
      return <TrendingDown className="w-4 h-4 text-red-600" />
    }
    return <div className="w-4 h-4 bg-gray-400 rounded-full" />
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <Target className="w-5 h-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'info':
        return <Clock className="w-5 h-5 text-blue-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity':
        return 'border-green-200 bg-green-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'info':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-orange-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading business intelligence...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-orange-600" />
            <span>Business Intelligence Dashboard</span>
          </h2>
          <p className="text-gray-600 mt-1">Strategic insights and forecasting for your maritime business</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={loadBusinessIntelligence}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">{kpi.name}</h3>
              {getTrendIcon(kpi.trend, kpi.change)}
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900">
                {formatValue(kpi.value, kpi.format)}
              </div>
              <div className="flex items-center justify-between">
                <div className={`text-sm ${kpi.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpi.change >= 0 ? '+' : ''}{kpi.change.toFixed(1)}% vs last period
                </div>
                {kpi.target && (
                  <div className="text-xs text-gray-500">
                    Target: {formatValue(kpi.target, kpi.format)}
                  </div>
                )}
              </div>
              {kpi.target && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full" 
                    style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Forecasts and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forecasts */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Forecast</h3>
          <div className="space-y-6">
            {forecasts.map((forecast) => (
              <div key={forecast.metric} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{forecast.metric}</span>
                  <span className="text-sm text-gray-600">
                    {(forecast.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">Current:</div>
                  <div className="font-medium">{formatValue(forecast.current, 'currency')}</div>
                  <div className="text-sm text-gray-600">→</div>
                  <div className="font-medium text-green-600">
                    {formatValue(forecast.forecast[forecast.forecast.length - 1], 'currency')}
                  </div>
                  <div className="text-sm text-green-600">
                    +{(((forecast.forecast[forecast.forecast.length - 1] - forecast.current) / forecast.current) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-2 bg-gradient-to-r from-orange-400 to-green-500 rounded-full w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strategic Insights */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Strategic Insights</h3>
          <div className="space-y-4">
            {insights.map((insight) => (
              <div key={insight.id} className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}>
                <div className="flex items-start space-x-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{insight.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        insight.impact === 'high' ? 'bg-red-100 text-red-700' :
                        insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {insight.impact} impact
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
                    {insight.actionRequired && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-600">Recommended Actions:</div>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {insight.recommendations.slice(0, 2).map((rec, index) => (
                            <li key={index} className="flex items-start space-x-1">
                              <span>•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                        {insight.recommendations.length > 2 && (
                          <button className="text-xs text-orange-600 hover:text-orange-700">
                            View all {insight.recommendations.length} recommendations
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Recommendations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">AI Agent Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Anchor className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Anchor</h4>
                <p className="text-sm text-gray-600">Inventory Optimization</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              Recommends increasing safety stock for high-velocity items by 15% based on demand patterns.
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Ship className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Pearl</h4>
                <p className="text-sm text-gray-600">Market Analysis</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              Identifies emerging trend in eco-friendly maritime products with 67% growth potential.
            </p>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Flint</h4>
                <p className="text-sm text-gray-600">Marketing Strategy</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              Suggests launching targeted campaign for navigation equipment with projected 23% ROI.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
