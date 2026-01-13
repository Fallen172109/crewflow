'use client'

import { useShopifyStore } from '@/contexts/ShopifyStoreContext'
import Link from 'next/link'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Package,
  Eye,
  Truck,
  XCircle,
  RefreshCw,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react'

// Order interface matching Shopify API response
interface Order {
  id: number
  name: string
  order_number: number
  email: string
  created_at: string
  updated_at: string
  currency: string
  total_price: string
  subtotal_price: string
  total_tax: string
  financial_status: 'pending' | 'authorized' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded' | 'voided'
  fulfillment_status: 'fulfilled' | 'partial' | 'restocked' | null
  cancelled_at: string | null
  customer?: {
    id: number
    email: string
    first_name?: string
    last_name?: string
  }
  line_items: Array<{
    id: number
    title: string
    quantity: number
    price: string
  }>
}

// Sort configuration
type SortField = 'order_number' | 'created_at' | 'total_price' | 'customer_name' | 'financial_status' | 'fulfillment_status'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

// Helper function to format currency with NaN handling and currency validation
const formatCurrency = (amount: string | number, currency: string = 'USD'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(0)
  }
  // Validate currency code (must be 3 uppercase letters)
  const validCurrency = /^[A-Z]{3}$/.test(currency) ? currency : 'USD'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: validCurrency,
  }).format(numAmount)
}

// Helper function to format date with validation
const formatDate = (timestamp: string): string => {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return 'Invalid date'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

// Helper function to format time ago with validation
const formatTimeAgo = (timestamp: string): string => {
  if (!timestamp) return 'N/A'
  const now = new Date()
  const time = new Date(timestamp)
  if (isNaN(time.getTime())) return 'Invalid date'
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)

  if (diffInSeconds < 0) {
    return 'In the future'
  } else if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
}

// Get customer display name
const getCustomerName = (order: Order): string => {
  if (order.customer) {
    const firstName = order.customer.first_name || ''
    const lastName = order.customer.last_name || ''
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim()
    }
    return order.customer.email
  }
  return order.email || 'Guest'
}

// Get fulfillment status badge styling
const getFulfillmentBadge = (status: Order['fulfillment_status'], cancelled: boolean) => {
  if (cancelled) {
    return {
      className: 'bg-red-100 text-red-700 border-red-200',
      label: 'Cancelled'
    }
  }

  switch (status) {
    case 'fulfilled':
      return {
        className: 'bg-green-100 text-green-700 border-green-200',
        label: 'Fulfilled'
      }
    case 'partial':
      return {
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        label: 'Partially Fulfilled'
      }
    case 'restocked':
      return {
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        label: 'Restocked'
      }
    default:
      return {
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        label: 'Unfulfilled'
      }
  }
}

// Get payment status badge styling
const getPaymentBadge = (status: Order['financial_status']) => {
  switch (status) {
    case 'paid':
      return {
        className: 'bg-green-100 text-green-700 border-green-200',
        label: 'Paid'
      }
    case 'pending':
    case 'authorized':
      return {
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        label: status === 'pending' ? 'Pending' : 'Authorized'
      }
    case 'partially_paid':
      return {
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        label: 'Partially Paid'
      }
    case 'refunded':
      return {
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        label: 'Refunded'
      }
    case 'partially_refunded':
      return {
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        label: 'Partially Refunded'
      }
    case 'voided':
      return {
        className: 'bg-red-100 text-red-700 border-red-200',
        label: 'Voided'
      }
    default:
      return {
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        label: status
      }
  }
}

// Main component - no provider wrapper needed (provided by dashboard layout)
export default function OrdersPage() {
  return <OrdersPageContent />
}

function OrdersPageContent() {
  const { selectedStore, stores, loading: storesLoading } = useShopifyStore()

  // State
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'created_at', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const itemsPerPage = 10

  // Fetch orders when store changes with AbortController for race condition prevention
  useEffect(() => {
    if (!selectedStore?.id) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()

    const fetchOrdersInternal = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/shopify/stores/${selectedStore.id}/orders?limit=250`, {
          signal: abortController.signal
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to fetch orders')
        }

        const data = await response.json()
        // Only update state if the request wasn't aborted
        if (!abortController.signal.aborted) {
          setOrders(data.orders || [])
        }
      } catch (err) {
        // Don't set error state for aborted requests
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        console.error('Error fetching orders:', err)
        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch orders')
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchOrdersInternal()

    return () => {
      abortController.abort()
    }
  }, [selectedStore?.id])

  // Manual refresh function - guarded against rapid clicks
  const fetchOrders = useCallback(async () => {
    if (!selectedStore?.id || loading) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/shopify/stores/${selectedStore.id}/orders?limit=250`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch orders')
      }

      const data = await response.json()
      setOrders(data.orders || [])
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }, [selectedStore?.id, loading])

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let result = [...orders]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(order => {
        const customerName = getCustomerName(order).toLowerCase()
        const orderNumber = order.name.toLowerCase()
        const orderNum = order.order_number.toString()
        return customerName.includes(query) || orderNumber.includes(query) || orderNum.includes(query)
      })
    }

    // Apply fulfillment filter
    if (fulfillmentFilter !== 'all') {
      result = result.filter(order => {
        if (fulfillmentFilter === 'unfulfilled') {
          return !order.fulfillment_status && !order.cancelled_at
        }
        if (fulfillmentFilter === 'fulfilled') {
          return order.fulfillment_status === 'fulfilled'
        }
        if (fulfillmentFilter === 'partially_fulfilled') {
          return order.fulfillment_status === 'partial'
        }
        if (fulfillmentFilter === 'cancelled') {
          return !!order.cancelled_at
        }
        return true
      })
    }

    // Apply payment filter
    if (paymentFilter !== 'all') {
      result = result.filter(order => order.financial_status === paymentFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortConfig.field) {
        case 'order_number':
          aValue = a.order_number
          bValue = b.order_number
          break
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'total_price':
          aValue = parseFloat(a.total_price)
          bValue = parseFloat(b.total_price)
          break
        case 'customer_name':
          aValue = getCustomerName(a).toLowerCase()
          bValue = getCustomerName(b).toLowerCase()
          break
        case 'financial_status':
          aValue = a.financial_status
          bValue = b.financial_status
          break
        case 'fulfillment_status':
          aValue = a.fulfillment_status || ''
          bValue = b.fulfillment_status || ''
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [orders, searchQuery, fulfillmentFilter, paymentFilter, sortConfig])

  // Pagination - ensure at least 1 page
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedOrders.length / itemsPerPage))
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedOrders.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedOrders, currentPage])

  // Reset to page 1 and clear errors when filters change
  useEffect(() => {
    setCurrentPage(1)
    setError(null)
  }, [searchQuery, fulfillmentFilter, paymentFilter])

  // Handle sort
  const handleSort = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) {
      return <ChevronUp className="w-4 h-4 text-gray-300" />
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-4 h-4 text-green-500" />
      : <ChevronDown className="w-4 h-4 text-green-500" />
  }

  // State for order details modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // Action handlers
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setShowDetailsModal(true)
  }

  const handleFulfillOrder = async (orderId: number) => {
    if (!selectedStore?.id) return

    const confirmed = window.confirm('Are you sure you want to fulfill this order? The customer will be notified.')
    if (!confirmed) return

    setActionLoading(orderId)
    try {
      const response = await fetch(
        `/api/shopify/stores/${selectedStore.id}/orders/${orderId}/fulfill`,
        { method: 'POST' }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fulfill order')
      }

      // Update the order in local state
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, fulfillment_status: 'fulfilled' as const } : o
      ))

      console.log('Order fulfilled successfully:', orderId)
    } catch (err) {
      console.error('Error fulfilling order:', err)
      setError(err instanceof Error ? err.message : 'Failed to fulfill order')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelOrder = async (orderId: number) => {
    if (!selectedStore?.id) return

    const confirmed = window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')
    if (!confirmed) return

    setActionLoading(orderId)
    try {
      const response = await fetch(
        `/api/shopify/stores/${selectedStore.id}/orders/${orderId}/cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'other', notifyCustomer: true })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to cancel order')
      }

      // Update the order in local state
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, cancelled_at: new Date().toISOString() } : o
      ))

      console.log('Order cancelled successfully:', orderId)
    } catch (err) {
      console.error('Error cancelling order:', err)
      setError(err instanceof Error ? err.message : 'Failed to cancel order')
    } finally {
      setActionLoading(null)
    }
  }

  // If no stores connected, show connection prompt
  if (!storesLoading && stores.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600 mt-1">
              Connect a store to manage your orders.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Shopify Store</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Connect your Shopify store to view and manage orders, process fulfillments, and track customer purchases.
          </p>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
          >
            <Package className="w-5 h-5 mr-2" />
            Connect Store
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-1">
            {selectedStore ? `Managing: ${selectedStore.storeName || selectedStore.shopDomain}` : 'Select a store to view orders'}
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading || !selectedStore}
          className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by order number or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Fulfillment Filter */}
          <div className="w-full md:w-48">
            <Select value={fulfillmentFilter} onValueChange={setFulfillmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Fulfillment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fulfillment</SelectItem>
                <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="partially_fulfilled">Partially Fulfilled</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Filter */}
          <div className="w-full md:w-48">
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="partially_refunded">Partially Refunded</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(searchQuery || fulfillmentFilter !== 'all' || paymentFilter !== 'all') && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <span>Showing {filteredAndSortedOrders.length} of {orders.length} orders</span>
            <button
              onClick={() => {
                setSearchQuery('')
                setFulfillmentFilter('all')
                setPaymentFilter('all')
              }}
              className="text-green-500 hover:text-green-600 font-medium"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg animate-pulse">
                  <div className="w-24 h-6 bg-gray-200 rounded"></div>
                  <div className="flex-1 h-6 bg-gray-200 rounded"></div>
                  <div className="w-24 h-6 bg-gray-200 rounded"></div>
                  <div className="w-20 h-6 bg-gray-200 rounded"></div>
                  <div className="w-20 h-6 bg-gray-200 rounded"></div>
                  <div className="w-32 h-6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Orders</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredAndSortedOrders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {orders.length === 0 ? 'No Orders Yet' : 'No Matching Orders'}
            </h3>
            <p className="text-gray-600">
              {orders.length === 0
                ? 'Orders will appear here once customers start making purchases.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
              <button
                onClick={() => handleSort('order_number')}
                className="col-span-2 flex items-center space-x-1 hover:text-gray-900 transition-colors"
              >
                <span>Order</span>
                <SortIndicator field="order_number" />
              </button>
              <button
                onClick={() => handleSort('customer_name')}
                className="col-span-2 flex items-center space-x-1 hover:text-gray-900 transition-colors"
              >
                <span>Customer</span>
                <SortIndicator field="customer_name" />
              </button>
              <button
                onClick={() => handleSort('total_price')}
                className="col-span-1 flex items-center space-x-1 hover:text-gray-900 transition-colors"
              >
                <span>Total</span>
                <SortIndicator field="total_price" />
              </button>
              <button
                onClick={() => handleSort('fulfillment_status')}
                className="col-span-2 flex items-center space-x-1 hover:text-gray-900 transition-colors"
              >
                <span>Fulfillment</span>
                <SortIndicator field="fulfillment_status" />
              </button>
              <button
                onClick={() => handleSort('financial_status')}
                className="col-span-2 flex items-center space-x-1 hover:text-gray-900 transition-colors"
              >
                <span>Payment</span>
                <SortIndicator field="financial_status" />
              </button>
              <button
                onClick={() => handleSort('created_at')}
                className="col-span-2 flex items-center space-x-1 hover:text-gray-900 transition-colors"
              >
                <span>Date</span>
                <SortIndicator field="created_at" />
              </button>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {paginatedOrders.map((order) => {
                const customerName = getCustomerName(order)
                const fulfillmentBadge = getFulfillmentBadge(order.fulfillment_status, !!order.cancelled_at)
                const paymentBadge = getPaymentBadge(order.financial_status)
                const isCancelled = !!order.cancelled_at
                const isActionLoading = actionLoading === order.id

                return (
                  <div
                    key={order.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Order Number */}
                    <div className="md:col-span-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 md:hidden lg:flex">
                          <Package className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{order.name}</p>
                          <p className="text-xs text-gray-500 md:hidden">{formatTimeAgo(order.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Customer */}
                    <div className="md:col-span-2">
                      <p className="text-gray-900 truncate">{customerName}</p>
                      <p className="text-xs text-gray-500 truncate">{order.email}</p>
                    </div>

                    {/* Total */}
                    <div className="md:col-span-1">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(order.total_price, order.currency)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.line_items?.length || 0} item{(order.line_items?.length || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Fulfillment Status */}
                    <div className="md:col-span-2">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${fulfillmentBadge.className}`}>
                        {fulfillmentBadge.label}
                      </span>
                    </div>

                    {/* Payment Status */}
                    <div className="md:col-span-2">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${paymentBadge.className}`}>
                        {paymentBadge.label}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="hidden md:block md:col-span-2">
                      <p className="text-gray-900">{formatDate(order.created_at)}</p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(order.created_at)}</p>
                    </div>

                    {/* Actions */}
                    <div className="md:col-span-1 flex items-center justify-end space-x-1">
                      {/* View Details */}
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Fulfill Order */}
                      {!isCancelled && order.fulfillment_status !== 'fulfilled' && (
                        <button
                          onClick={() => handleFulfillOrder(order.id)}
                          disabled={isActionLoading}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Fulfill Order"
                        >
                          <Truck className={`w-4 h-4 ${isActionLoading ? 'animate-pulse' : ''}`} />
                        </button>
                      )}

                      {/* Cancel Order */}
                      {!isCancelled && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={isActionLoading}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Cancel Order"
                        >
                          <XCircle className={`w-4 h-4 ${isActionLoading ? 'animate-pulse' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedOrders.length)} of {filteredAndSortedOrders.length} orders
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-green-500 text-white'
                              : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary Stats */}
      {!loading && !error && orders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600">Unfulfilled</p>
            <p className="text-2xl font-bold text-yellow-600">
              {orders.filter(o => !o.fulfillment_status && !o.cancelled_at).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600">Fulfilled</p>
            <p className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.fulfillment_status === 'fulfilled').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(
                orders
                  .filter(o => !o.cancelled_at && o.financial_status !== 'refunded' && o.financial_status !== 'voided')
                  .reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0),
                selectedStore?.currency || 'USD'
              )}
            </p>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowDetailsModal(false)}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Order {selectedOrder.name}</h2>
                    <p className="text-sm text-gray-500">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getFulfillmentBadge(selectedOrder.fulfillment_status, !!selectedOrder.cancelled_at).className}`}>
                    {getFulfillmentBadge(selectedOrder.fulfillment_status, !!selectedOrder.cancelled_at).label}
                  </span>
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getPaymentBadge(selectedOrder.financial_status).className}`}>
                    {getPaymentBadge(selectedOrder.financial_status).label}
                  </span>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer</h3>
                  <div className="space-y-2">
                    <p className="text-gray-900">{getCustomerName(selectedOrder)}</p>
                    <p className="text-sm text-gray-600">{selectedOrder.email}</p>
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Items</h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    {selectedOrder.line_items && selectedOrder.line_items.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {selectedOrder.line_items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-4">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{item.title}</p>
                              <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                            </div>
                            <p className="font-medium text-gray-900">
                              {formatCurrency(parseFloat(item.price) * item.quantity, selectedOrder.currency)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">No line items</div>
                    )}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">{formatCurrency(selectedOrder.subtotal_price, selectedOrder.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span className="text-gray-900">{formatCurrency(selectedOrder.total_tax, selectedOrder.currency)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">{formatCurrency(selectedOrder.total_price, selectedOrder.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {!selectedOrder.cancelled_at && selectedOrder.fulfillment_status !== 'fulfilled' && (
                    <button
                      onClick={() => {
                        setShowDetailsModal(false)
                        handleFulfillOrder(selectedOrder.id)
                      }}
                      className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
                    >
                      Fulfill Order
                    </button>
                  )}
                  {!selectedOrder.cancelled_at && (
                    <button
                      onClick={() => {
                        setShowDetailsModal(false)
                        handleCancelOrder(selectedOrder.id)
                      }}
                      className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                    >
                      Cancel Order
                    </button>
                  )}
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
