'use client'

import { useState, useEffect } from 'react'
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Eye, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  DollarSign,
  User,
  Calendar,
  Package,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  RefreshCw,
  Download,
  Ship,
  Anchor
} from 'lucide-react'
import { useShopifyStore, useStorePermissions } from '@/contexts/ShopifyStoreContext'
import { fetchOrders } from '@/lib/api/shopify-client'

interface Order {
  id: number
  order_number: string
  name: string
  email: string
  created_at: string
  updated_at: string
  total_price: number
  currency: string
  financial_status: 'pending' | 'authorized' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded' | 'voided'
  fulfillment_status: 'unfulfilled' | 'partial' | 'fulfilled' | 'restocked'
  customer: {
    id: number
    first_name: string
    last_name: string
    email: string
    phone?: string
  }
  shipping_address: {
    first_name: string
    last_name: string
    address1: string
    city: string
    province: string
    country: string
    zip: string
  }
  line_items: Array<{
    id: number
    title: string
    quantity: number
    price: number
    variant_title?: string
  }>
  tags: string
  note?: string
}

interface OrderFilters {
  financial_status: string
  fulfillment_status: string
  date_range: string
  customer_type: string
  order_value: string
}

export default function OrderManagement() {
  const { selectedStore } = useShopifyStore()
  const { canViewOrders, canManageOrders } = useStorePermissions()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrders, setSelectedOrders] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [filters, setFilters] = useState<OrderFilters>({
    financial_status: 'all',
    fulfillment_status: 'all',
    date_range: 'all',
    customer_type: 'all',
    order_value: 'all'
  })

  useEffect(() => {
    loadOrders()
  }, [filters, searchQuery])

  const loadOrders = async () => {
    if (!selectedStore) {
      console.warn('No store selected')
      return
    }

    if (!canViewOrders) {
      setError('You do not have permission to view orders for this store')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('🔄 Loading orders for store:', selectedStore.id)

      // Use authenticated API client
      const response = await fetchOrders(selectedStore.id, {
        limit: 50,
        status: filters.financial_status !== 'all' ? filters.financial_status : undefined
      })

      if (response.success && response.data?.orders) {

      const data = await response.json()

      if (data.success && data.orders) {
        // Transform Shopify orders to match our Order interface
        const transformedOrders: Order[] = data.orders.map((shopifyOrder: any) => ({
          id: shopifyOrder.id,
          order_number: shopifyOrder.order_number || shopifyOrder.name,
          name: shopifyOrder.name,
          email: shopifyOrder.email || shopifyOrder.customer?.email || '',
          created_at: shopifyOrder.created_at,
          updated_at: shopifyOrder.updated_at,
          total_price: parseFloat(shopifyOrder.total_price || '0'),
          currency: shopifyOrder.currency || 'USD',
          financial_status: shopifyOrder.financial_status || 'pending',
          fulfillment_status: shopifyOrder.fulfillment_status || 'unfulfilled',
          customer: {
            id: shopifyOrder.customer?.id || 0,
            first_name: shopifyOrder.customer?.first_name || '',
            last_name: shopifyOrder.customer?.last_name || '',
            email: shopifyOrder.customer?.email || shopifyOrder.email || '',
            phone: shopifyOrder.customer?.phone || ''
          },
          shipping_address: shopifyOrder.shipping_address ? {
            first_name: shopifyOrder.shipping_address.first_name || '',
            last_name: shopifyOrder.shipping_address.last_name || '',
            address1: shopifyOrder.shipping_address.address1 || '',
            city: shopifyOrder.shipping_address.city || '',
            province: shopifyOrder.shipping_address.province || '',
            country: shopifyOrder.shipping_address.country || '',
            zip: shopifyOrder.shipping_address.zip || ''
          } : undefined,
          line_items: shopifyOrder.line_items?.map((item: any) => ({
            id: item.id,
            title: item.title || item.name,
            quantity: item.quantity || 1,
            price: parseFloat(item.price || '0'),
            variant_title: item.variant_title
          })) || [],
          tags: shopifyOrder.tags || '',
          note: shopifyOrder.note || ''
        }))

        setOrders(transformedOrders)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Failed to load orders:', error)
      setError(error instanceof Error ? error.message : 'Failed to load orders')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const getFinancialStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'authorized': return 'bg-blue-100 text-blue-700'
      case 'partially_paid': return 'bg-orange-100 text-orange-700'
      case 'refunded': return 'bg-red-100 text-red-700'
      case 'voided': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getFulfillmentStatusColor = (status: string) => {
    switch (status) {
      case 'fulfilled': return 'bg-green-100 text-green-700'
      case 'unfulfilled': return 'bg-red-100 text-red-700'
      case 'partial': return 'bg-yellow-100 text-yellow-700'
      case 'restocked': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getFinancialStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return CheckCircle
      case 'pending': return Clock
      case 'authorized': return CreditCard
      default: return AlertCircle
    }
  }

  const getFulfillmentStatusIcon = (status: string) => {
    switch (status) {
      case 'fulfilled': return CheckCircle
      case 'unfulfilled': return Clock
      case 'partial': return Truck
      default: return Package
    }
  }

  const handleSelectOrder = (orderId: number) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(orders.map(o => o.id))
    }
  }

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
  }

  const handleFulfillOrder = (orderId: number) => {
    console.log('Fulfilling order:', orderId)
    // TODO: Implement fulfillment logic
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         `${order.customer.first_name} ${order.customer.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFinancial = filters.financial_status === 'all' || order.financial_status === filters.financial_status
    const matchesFulfillment = filters.fulfillment_status === 'all' || order.fulfillment_status === filters.fulfillment_status
    
    return matchesSearch && matchesFinancial && matchesFulfillment
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ShoppingCart className="w-12 h-12 text-orange-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading ship orders...</p>
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
            <ShoppingCart className="w-8 h-8 text-orange-600" />
            <span>Ship Orders</span>
          </h2>
          <p className="text-gray-600 mt-1">Manage order processing and fulfillment</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={loadOrders}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search orders by number, customer name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters ? 'bg-orange-50 border-orange-200 text-orange-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <select
              value={filters.financial_status}
              onChange={(e) => setFilters(prev => ({ ...prev, financial_status: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Payment Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="authorized">Authorized</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="refunded">Refunded</option>
            </select>

            <select
              value={filters.fulfillment_status}
              onChange={(e) => setFilters(prev => ({ ...prev, fulfillment_status: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Fulfillment Status</option>
              <option value="unfulfilled">Unfulfilled</option>
              <option value="partial">Partially Fulfilled</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="restocked">Restocked</option>
            </select>

            <select
              value={filters.date_range}
              onChange={(e) => setFilters(prev => ({ ...prev, date_range: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>

            <select
              value={filters.order_value}
              onChange={(e) => setFilters(prev => ({ ...prev, order_value: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Order Values</option>
              <option value="under_50">Under $50</option>
              <option value="50_200">$50 - $200</option>
              <option value="200_500">$200 - $500</option>
              <option value="over_500">Over $500</option>
            </select>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-orange-700 font-medium">
              {selectedOrders.length} order(s) selected
            </span>
            <div className="flex items-center space-x-3">
              <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                Mark as Fulfilled
              </button>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Print Labels
              </button>
              <button className="text-gray-600 hover:text-gray-700 text-sm font-medium">
                Export Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === orders.length && orders.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fulfillment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => {
                const FinancialIcon = getFinancialStatusIcon(order.financial_status)
                const FulfillmentIcon = getFulfillmentStatusIcon(order.fulfillment_status)

                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{order.order_number}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                        {order.tags && (
                          <div className="text-xs text-gray-400 mt-1">
                            {order.tags}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {order.customer.first_name} {order.customer.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{order.customer.email}</div>
                        <div className="text-xs text-gray-400">
                          {order.shipping_address.city}, {order.shipping_address.province}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getFinancialStatusColor(order.financial_status)}`}>
                        <FinancialIcon className="w-3 h-3" />
                        <span className="capitalize">{order.financial_status.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getFulfillmentStatusColor(order.fulfillment_status)}`}>
                        <FulfillmentIcon className="w-3 h-3" />
                        <span className="capitalize">{order.fulfillment_status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        ${order.total_price.toFixed(2)} {order.currency}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.line_items.length} item(s)
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="text-gray-400 hover:text-gray-600"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {order.fulfillment_status === 'unfulfilled' && order.financial_status === 'paid' && (
                          <button
                            onClick={() => handleFulfillOrder(order.id)}
                            className="text-green-400 hover:text-green-600"
                            title="Fulfill Order"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">
              {searchQuery || Object.values(filters).some(f => f !== 'all') 
                ? 'Try adjusting your search or filters'
                : 'Orders will appear here once customers start placing them'
              }
            </p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Order {selectedOrder.order_number} Details
                </h3>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Customer Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{selectedOrder.customer.first_name} {selectedOrder.customer.last_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{selectedOrder.customer.email}</span>
                    </div>
                    {selectedOrder.customer.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{selectedOrder.customer.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Shipping Address</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <div>{selectedOrder.shipping_address.first_name} {selectedOrder.shipping_address.last_name}</div>
                        <div>{selectedOrder.shipping_address.address1}</div>
                        <div>
                          {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.province} {selectedOrder.shipping_address.zip}
                        </div>
                        <div>{selectedOrder.shipping_address.country}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="font-medium text-gray-900">Order Items</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedOrder.line_items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2">
                              <div>
                                <div className="font-medium text-gray-900">{item.title}</div>
                                {item.variant_title && (
                                  <div className="text-sm text-gray-500">{item.variant_title}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-2 text-gray-900">${item.price.toFixed(2)}</td>
                            <td className="px-4 py-2 text-gray-900">${(item.quantity * item.price).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        Total: ${selectedOrder.total_price.toFixed(2)} {selectedOrder.currency}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Notes */}
                {selectedOrder.note && (
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="font-medium text-gray-900">Order Notes</h4>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                      {selectedOrder.note}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
