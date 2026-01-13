'use client'

import { useState, useEffect } from 'react'
import { 
  Package, 
  Edit3, 
  MessageSquare, 
  Eye, 
  Save, 
  X,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Sparkles,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShopifyStore, useStorePermissions } from '@/contexts/ShopifyStoreContext'
import ProductEditor from './ProductEditor'
import ChatBasedProductEditor from './ChatBasedProductEditor'
import ProductCreationChat from './ProductCreationChat'

interface ProductData {
  id?: string
  title: string
  description: string
  price?: number
  category?: string
  tags?: string[]
  variants?: Array<{
    title: string
    price: number
    inventory_quantity?: number
  }>
  images?: string[]
  status?: 'draft' | 'active' | 'archived'
  created_at?: string
  updated_at?: string
}

interface AdvancedProductManagerProps {
  className?: string
}

export default function AdvancedProductManager({ className = '' }: AdvancedProductManagerProps) {
  const [products, setProducts] = useState<ProductData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'active' | 'archived'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null)
  const [editMode, setEditMode] = useState<'form' | 'chat' | 'create' | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { selectedStore } = useShopifyStore()
  const { canManageProducts, canViewProducts } = useStorePermissions()

  useEffect(() => {
    if (selectedStore && canViewProducts) {
      loadProducts()
    }
  }, [selectedStore, canViewProducts])

  const loadProducts = async () => {
    if (!selectedStore) return

    try {
      setLoading(true)
      const response = await fetch(`/api/shopify/products?storeId=${selectedStore.id}`)
      
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProductSave = async (product: ProductData) => {
    try {
      const response = await fetch('/api/shopify/products', {
        method: selectedProduct?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storeId: selectedStore?.id,
          product
        })
      })

      if (response.ok) {
        await loadProducts()
        setSelectedProduct(null)
        setEditMode(null)
      }
    } catch (error) {
      console.error('Error saving product:', error)
    }
  }

  const handleProductUpdate = (updatedProduct: ProductData) => {
    setSelectedProduct(updatedProduct)
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || product.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedStore?.currency || 'USD'
    }).format(amount)
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'draft':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'archived':
        return <AlertCircle className="w-4 h-4 text-gray-600" />
      default:
        return <Package className="w-4 h-4 text-gray-400" />
    }
  }

  if (!selectedStore) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Store Selected</h3>
        <p className="text-gray-600">Please select a store to manage products.</p>
      </div>
    )
  }

  if (!canViewProducts) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to view products for this store.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
          <p className="text-gray-600 mt-1">
            Manage your {selectedStore.store_name} product catalog
          </p>
        </div>
        
        {canManageProducts && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Product</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-green-100 text-green-600' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' 
                  ? 'bg-green-100 text-green-600' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid/List */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterStatus !== 'all' 
              ? 'No products match your current filters.' 
              : 'Start by creating your first product.'}
          </p>
          {canManageProducts && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <Sparkles className="w-5 h-5" />
              <span>Create with AI</span>
            </button>
          )}
        </div>
      ) : (
        <div className={`bg-white rounded-lg border border-gray-200 p-6 ${
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
        }`}>
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
                viewMode === 'list' ? 'flex items-center space-x-4' : ''
              }`}
            >
              {/* Product Image */}
              <div className={`${viewMode === 'list' ? 'w-16 h-16' : 'w-full h-32'} bg-gray-100 rounded-lg flex items-center justify-center mb-3 ${viewMode === 'list' ? 'mb-0' : ''}`}>
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Package className="w-8 h-8 text-gray-400" />
                )}
              </div>

              {/* Product Info */}
              <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">{product.title}</h3>
                  {getStatusIcon(product.status)}
                </div>
                
                <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                  {product.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div>
                    {product.price && (
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(product.price)}
                      </span>
                    )}
                    {product.variants && product.variants.length > 1 && (
                      <span className="text-sm text-gray-500 ml-2">
                        +{product.variants.length - 1} variants
                      </span>
                    )}
                  </div>
                  
                  {canManageProducts && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedProduct(product)
                          setEditMode('chat')
                        }}
                        className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                        title="Chat Edit"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProduct(product)
                          setEditMode('form')
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Form Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Product Creation Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col"
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Create New Product</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1">
                <ProductCreationChat 
                  className="h-full"
                  onProductCreated={(product) => {
                    setShowCreateModal(false)
                    loadProducts()
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Editor Modal */}
      <AnimatePresence>
        {selectedProduct && editMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col"
            >
              <div className="flex-1">
                {editMode === 'form' ? (
                  <ProductEditor
                    product={selectedProduct}
                    onSave={handleProductSave}
                    onCancel={() => {
                      setSelectedProduct(null)
                      setEditMode(null)
                    }}
                    className="h-full"
                  />
                ) : editMode === 'chat' ? (
                  <ChatBasedProductEditor
                    product={selectedProduct}
                    onProductUpdate={handleProductUpdate}
                    onSave={handleProductSave}
                    className="h-full"
                  />
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
