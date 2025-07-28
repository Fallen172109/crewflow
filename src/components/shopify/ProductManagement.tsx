'use client'

import { useState, useEffect } from 'react'
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  DollarSign,
  Tag,
  Image as ImageIcon,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  Archive,
  Star,
  TrendingUp,
  TrendingDown,
  Anchor
} from 'lucide-react'

interface Product {
  id: number
  title: string
  handle: string
  vendor: string
  product_type: string
  status: 'active' | 'archived' | 'draft'
  created_at: string
  updated_at: string
  published_at?: string
  tags: string
  variants_count: number
  images_count: number
  total_inventory: number
  price_range: {
    min: number
    max: number
  }
  sales_velocity: 'high' | 'medium' | 'low' | 'unknown'
  revenue_30d: number
}

interface ProductFilters {
  status: string
  vendor: string
  product_type: string
  price_min: string
  price_max: string
  inventory_status: string
  sales_velocity: string
}

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState<ProductFilters>({
    status: 'all',
    vendor: 'all',
    product_type: 'all',
    price_min: '',
    price_max: '',
    inventory_status: 'all',
    sales_velocity: 'all'
  })

  useEffect(() => {
    loadProducts()
  }, [currentPage, filters, searchQuery])

  const loadProducts = async () => {
    if (!selectedStore) {
      console.warn('No store selected')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch products from the API
      const response = await fetch(`/api/shopify/stores/${selectedStore.id}/products`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch products')
      }

      const data = await response.json()

      if (data.success && data.products) {
        // Transform Shopify products to match our Product interface
        const transformedProducts: Product[] = data.products.map((shopifyProduct: any) => ({
          id: shopifyProduct.id,
          title: shopifyProduct.title,
          handle: shopifyProduct.handle,
          vendor: shopifyProduct.vendor || 'Unknown',
          product_type: shopifyProduct.product_type || 'General',
          status: shopifyProduct.status,
          created_at: shopifyProduct.created_at,
          updated_at: shopifyProduct.updated_at,
          published_at: shopifyProduct.published_at,
          tags: shopifyProduct.tags || '',
          variants_count: shopifyProduct.variants?.length || 0,
          images_count: shopifyProduct.images?.length || 0,
          total_inventory: shopifyProduct.variants?.reduce((sum: number, variant: any) =>
            sum + (variant.inventory_quantity || 0), 0) || 0,
          price_range: {
            min: Math.min(...(shopifyProduct.variants?.map((v: any) => parseFloat(v.price || '0')) || [0])),
            max: Math.max(...(shopifyProduct.variants?.map((v: any) => parseFloat(v.price || '0')) || [0]))
          },
          sales_velocity: 'unknown', // This would need to be calculated from analytics
          revenue_30d: 0 // This would need to be calculated from order data
        }))

        setProducts(transformedProducts)
      } else {
        throw new Error('Invalid response format')
      }

        setProducts(transformedProducts)
        setTotalPages(Math.ceil(transformedProducts.length / 10)) // Assuming 10 products per page
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Failed to load products:', error)
      setError(error instanceof Error ? error.message : 'Failed to load products')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'draft': return 'bg-yellow-100 text-yellow-700'
      case 'archived': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle
      case 'draft': return Clock
      case 'archived': return Archive
      default: return AlertCircle
    }
  }

  const getSalesVelocityColor = (velocity: string) => {
    switch (velocity) {
      case 'high': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getSalesVelocityIcon = (velocity: string) => {
    switch (velocity) {
      case 'high': return TrendingUp
      case 'medium': return BarChart3
      case 'low': return TrendingDown
      default: return BarChart3
    }
  }

  const getInventoryStatus = (inventory: number) => {
    if (inventory === 0) return { label: 'Out of Stock', color: 'text-red-600' }
    if (inventory < 10) return { label: 'Low Stock', color: 'text-yellow-600' }
    return { label: 'In Stock', color: 'text-green-600' }
  }

  const handleSelectProduct = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map(p => p.id))
    }
  }

  const handleBulkAction = (action: string) => {
    console.log(`Bulk action: ${action} on products:`, selectedProducts)
    // TODO: Implement bulk actions
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.tags.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filters.status === 'all' || product.status === filters.status
    const matchesVendor = filters.vendor === 'all' || product.vendor === filters.vendor
    const matchesType = filters.product_type === 'all' || product.product_type === filters.product_type
    const matchesVelocity = filters.sales_velocity === 'all' || product.sales_velocity === filters.sales_velocity
    
    return matchesSearch && matchesStatus && matchesVendor && matchesType && matchesVelocity
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Package className="w-12 h-12 text-orange-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading cargo manifest...</p>
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
            <Package className="w-8 h-8 text-orange-600" />
            <span>Cargo Manifest</span>
          </h2>
          <p className="text-gray-600 mt-1">Manage your maritime product inventory</p>
        </div>
        <button className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2">
          <Plus className="w-5 h-5" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products by name, vendor, or tags..."
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-gray-200">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={filters.vendor}
              onChange={(e) => setFilters(prev => ({ ...prev, vendor: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Vendors</option>
              <option value="SeaGear Pro">SeaGear Pro</option>
              <option value="Maritime Supply Co">Maritime Supply Co</option>
              <option value="Ocean Supplies">Ocean Supplies</option>
            </select>

            <select
              value={filters.product_type}
              onChange={(e) => setFilters(prev => ({ ...prev, product_type: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="Navigation Equipment">Navigation Equipment</option>
              <option value="Anchoring">Anchoring</option>
              <option value="Rigging">Rigging</option>
            </select>

            <select
              value={filters.sales_velocity}
              onChange={(e) => setFilters(prev => ({ ...prev, sales_velocity: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Velocity</option>
              <option value="high">High Sales</option>
              <option value="medium">Medium Sales</option>
              <option value="low">Low Sales</option>
            </select>

            <input
              type="number"
              placeholder="Min Price"
              value={filters.price_min}
              onChange={(e) => setFilters(prev => ({ ...prev, price_min: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />

            <input
              type="number"
              placeholder="Max Price"
              value={filters.price_max}
              onChange={(e) => setFilters(prev => ({ ...prev, price_max: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-orange-700 font-medium">
              {selectedProducts.length} product(s) selected
            </span>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleBulkAction('publish')}
                className="text-green-600 hover:text-green-700 text-sm font-medium"
              >
                Publish
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                className="text-gray-600 hover:text-gray-700 text-sm font-medium"
              >
                Archive
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === products.length && products.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inventory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const StatusIcon = getStatusIcon(product.status)
                const VelocityIcon = getSalesVelocityIcon(product.sales_velocity)
                const inventoryStatus = getInventoryStatus(product.total_inventory)

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{product.title}</div>
                          <div className="text-sm text-gray-500">{product.vendor} • {product.product_type}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {product.variants_count} variant(s) • {product.images_count} image(s)
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span className="capitalize">{product.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className={`font-medium ${inventoryStatus.color}`}>
                          {product.total_inventory} units
                        </div>
                        <div className={`text-xs ${inventoryStatus.color}`}>
                          {inventoryStatus.label}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          ${product.price_range.min} - ${product.price_range.max}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <VelocityIcon className={`w-4 h-4 ${getSalesVelocityColor(product.sales_velocity)}`} />
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            ${product.revenue_30d.toLocaleString()}
                          </div>
                          <div className={`text-xs capitalize ${getSalesVelocityColor(product.sales_velocity)}`}>
                            {product.sales_velocity} velocity
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button className="text-gray-400 hover:text-gray-600">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || Object.values(filters).some(f => f !== 'all' && f !== '') 
                ? 'Try adjusting your search or filters'
                : 'Start by adding your first product to the cargo manifest'
              }
            </p>
            {!searchQuery && Object.values(filters).every(f => f === 'all' || f === '') && (
              <button className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 mx-auto">
                <Plus className="w-5 h-5" />
                <span>Add First Product</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, filteredProducts.length)} of {filteredProducts.length} products
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
