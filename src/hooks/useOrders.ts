'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface OrderCustomer {
  id: number
  email: string
  first_name?: string
  last_name?: string
}

export interface OrderLineItem {
  id: number
  title: string
  quantity: number
  price: string
}

export interface Order {
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
  customer?: OrderCustomer
  line_items: OrderLineItem[]
}

export type OrderSortField = 'order_number' | 'created_at' | 'total_price' | 'customer_name' | 'financial_status' | 'fulfillment_status'
export type SortDirection = 'asc' | 'desc'
export type FulfillmentFilter = 'all' | 'unfulfilled' | 'fulfilled' | 'partially_fulfilled' | 'cancelled'
export type PaymentFilter = 'all' | 'paid' | 'pending' | 'refunded' | 'partially_refunded' | 'voided'

export interface UseOrdersOptions {
  storeId: string | null
  itemsPerPage?: number
}

export interface UseOrdersReturn {
  // Data
  orders: Order[]
  filteredOrders: Order[]
  paginatedOrders: Order[]

  // State
  loading: boolean
  error: string | null

  // Filters
  searchQuery: string
  setSearchQuery: (query: string) => void
  fulfillmentFilter: FulfillmentFilter
  setFulfillmentFilter: (filter: FulfillmentFilter) => void
  paymentFilter: PaymentFilter
  setPaymentFilter: (filter: PaymentFilter) => void

  // Sorting
  sortField: OrderSortField
  sortDirection: SortDirection
  handleSort: (field: OrderSortField) => void

  // Pagination
  currentPage: number
  setCurrentPage: (page: number) => void
  totalPages: number
  totalItems: number
  itemsPerPage: number

  // Actions
  refresh: () => Promise<void>
  clearFilters: () => void

  // Helpers
  getCustomerName: (order: Order) => string
  formatCurrency: (amount: string | number, currency?: string) => string
  formatDate: (dateString: string) => string
  formatTimeAgo: (timestamp: string) => string

  // Stats
  stats: {
    total: number
    unfulfilled: number
    fulfilled: number
    totalRevenue: number
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getCustomerName = (order: Order): string => {
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

export const formatCurrency = (amount: string | number, currency: string = 'USD'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(0)
  }
  const validCurrency = /^[A-Z]{3}$/.test(currency) ? currency : 'USD'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: validCurrency,
  }).format(numAmount)
}

export const formatDate = (timestamp: string): string => {
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

export const formatTimeAgo = (timestamp: string): string => {
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

// ============================================================================
// HOOK
// ============================================================================

export function useOrders({
  storeId,
  itemsPerPage = 10
}: UseOrdersOptions): UseOrdersReturn {
  // Data state
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')

  // Sort state
  const [sortField, setSortField] = useState<OrderSortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch orders with AbortController for race condition prevention
  useEffect(() => {
    if (!storeId) {
      setLoading(false)
      setOrders([])
      return
    }

    const abortController = new AbortController()

    const fetchOrders = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/shopify/stores/${storeId}/orders?limit=250`, {
          signal: abortController.signal
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to fetch orders')
        }

        const data = await response.json()
        if (!abortController.signal.aborted) {
          setOrders(data.orders || [])
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        console.error('Error fetching orders:', err)
        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load orders')
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchOrders()

    return () => {
      abortController.abort()
    }
  }, [storeId])

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!storeId) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/shopify/stores/${storeId}/orders?limit=250`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch orders')
      }

      const data = await response.json()
      setOrders(data.orders || [])
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [storeId])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setFulfillmentFilter('all')
    setPaymentFilter('all')
    setCurrentPage(1)
  }, [])

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
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

      switch (sortField) {
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

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [orders, searchQuery, fulfillmentFilter, paymentFilter, sortField, sortDirection])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage))

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredOrders, currentPage, itemsPerPage])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, fulfillmentFilter, paymentFilter])

  // Handle sort click
  const handleSort = useCallback((field: OrderSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }, [sortField])

  // Calculate stats
  const stats = useMemo(() => ({
    total: orders.length,
    unfulfilled: orders.filter(o => !o.fulfillment_status && !o.cancelled_at).length,
    fulfilled: orders.filter(o => o.fulfillment_status === 'fulfilled').length,
    totalRevenue: orders.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0),
  }), [orders])

  return {
    // Data
    orders,
    filteredOrders,
    paginatedOrders,

    // State
    loading,
    error,

    // Filters
    searchQuery,
    setSearchQuery,
    fulfillmentFilter,
    setFulfillmentFilter,
    paymentFilter,
    setPaymentFilter,

    // Sorting
    sortField,
    sortDirection,
    handleSort,

    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems: filteredOrders.length,
    itemsPerPage,

    // Actions
    refresh,
    clearFilters,

    // Helpers
    getCustomerName,
    formatCurrency,
    formatDate,
    formatTimeAgo,

    // Stats
    stats,
  }
}

export default useOrders
