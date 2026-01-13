'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Edit3, 
  Save, 
  Eye, 
  Package, 
  DollarSign, 
  Tag, 
  FileText,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface ProductPreviewData {
  id?: string
  title: string
  description: string
  price: number
  compareAtPrice?: number
  images: string[]
  tags: string[]
  vendor?: string
  productType?: string
  variants?: Array<{
    title: string
    price: number
    sku?: string
    inventory_quantity?: number
  }>
  seo?: {
    title?: string
    description?: string
  }
  status: 'draft' | 'active' | 'archived'
}

interface ProductPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  productData: ProductPreviewData
  onSave: (updatedData: ProductPreviewData) => void
  onPublish: (productData: ProductPreviewData) => void
  isLoading?: boolean
  mode: 'preview' | 'edit'
}

export default function ProductPreviewModal({
  isOpen,
  onClose,
  productData,
  onSave,
  onPublish,
  isLoading = false,
  mode: initialMode = 'preview'
}: ProductPreviewModalProps) {
  const [mode, setMode] = useState<'preview' | 'edit'>(initialMode)
  const [editedData, setEditedData] = useState<ProductPreviewData>(productData)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setEditedData(productData)
    setHasChanges(false)
  }, [productData])

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  const handleFieldChange = (field: keyof ProductPreviewData, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const handleVariantChange = (index: number, field: string, value: any) => {
    setEditedData(prev => ({
      ...prev,
      variants: prev.variants?.map((variant, i) => 
        i === index ? { ...variant, [field]: value } : variant
      ) || []
    }))
    setHasChanges(true)
  }

  const handleSave = () => {
    onSave(editedData)
    setHasChanges(false)
  }

  const handlePublish = () => {
    onPublish(editedData)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {mode === 'edit' ? 'Edit Product' : 'Product Preview'}
                </h2>
                <p className="text-sm text-gray-600">
                  {mode === 'edit' ? 'Make changes before publishing' : 'Review product details'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {mode === 'preview' && (
                <button
                  onClick={() => setMode('edit')}
                  className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Images */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4" />
                  <span>Product Images</span>
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {editedData.images.length > 0 ? (
                    editedData.images.map((image, index) => (
                      <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={image}
                          alt={`Product image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">No images</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Details */}
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Title
                  </label>
                  {mode === 'edit' ? (
                    <input
                      type="text"
                      value={editedData.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">{editedData.title}</p>
                  )}
                </div>

                {/* Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price
                    </label>
                    {mode === 'edit' ? (
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          step="0.01"
                          value={editedData.price}
                          onChange={(e) => handleFieldChange('price', parseFloat(e.target.value) || 0)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    ) : (
                      <p className="text-lg font-semibold text-green-600">{formatPrice(editedData.price)}</p>
                    )}
                  </div>

                  {editedData.compareAtPrice && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Compare At Price
                      </label>
                      {mode === 'edit' ? (
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            value={editedData.compareAtPrice}
                            onChange={(e) => handleFieldChange('compareAtPrice', parseFloat(e.target.value) || undefined)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 line-through">{formatPrice(editedData.compareAtPrice)}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  {mode === 'edit' ? (
                    <textarea
                      value={editedData.description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="text-gray-700 whitespace-pre-wrap">{editedData.description}</div>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  {mode === 'edit' ? (
                    <input
                      type="text"
                      value={editedData.tags.join(', ')}
                      onChange={(e) => handleFieldChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
                      placeholder="Enter tags separated by commas"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {editedData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  {mode === 'edit' ? (
                    <select
                      value={editedData.status}
                      onChange={(e) => handleFieldChange('status', e.target.value as 'draft' | 'active' | 'archived')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      editedData.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : editedData.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {editedData.status.charAt(0).toUpperCase() + editedData.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2">
              {hasChanges && (
                <div className="flex items-center space-x-1 text-sm text-green-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>Unsaved changes</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              {mode === 'edit' && hasChanges && (
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center space-x-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              )}

              <button
                onClick={handlePublish}
                disabled={isLoading}
                className="flex items-center space-x-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <CheckCircle className="w-4 h-4" />
                <span>Publish Product</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
