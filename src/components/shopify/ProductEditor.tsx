'use client'

import { useState, useEffect } from 'react'
import { 
  Edit3, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  DollarSign,
  Tag,
  Package,
  Type,
  FileText,
  Sparkles,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShopifyStore } from '@/contexts/ShopifyStoreContext'

interface ProductVariant {
  id?: string
  title: string
  price: number
  inventory_quantity?: number
  sku?: string
  weight?: number
  requires_shipping?: boolean
}

interface ProductData {
  id?: string
  title: string
  description: string
  price?: number
  category?: string
  tags?: string[]
  variants?: ProductVariant[]
  images?: string[]
  status?: 'draft' | 'active' | 'archived'
}

interface ProductEditorProps {
  product: ProductData
  onSave: (product: ProductData) => void
  onCancel: () => void
  isLoading?: boolean
  className?: string
}

export default function ProductEditor({ 
  product, 
  onSave, 
  onCancel, 
  isLoading = false,
  className = '' 
}: ProductEditorProps) {
  const [editedProduct, setEditedProduct] = useState<ProductData>(product)
  const [activeSection, setActiveSection] = useState<string>('basic')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const { selectedStore } = useShopifyStore()

  useEffect(() => {
    setEditedProduct(product)
    setHasChanges(false)
    setErrors({})
  }, [product])

  useEffect(() => {
    const hasChanged = JSON.stringify(editedProduct) !== JSON.stringify(product)
    setHasChanges(hasChanged)
  }, [editedProduct, product])

  const validateProduct = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!editedProduct.title?.trim()) {
      newErrors.title = 'Product title is required'
    } else if (editedProduct.title.length > 255) {
      newErrors.title = 'Title must be less than 255 characters'
    }

    if (!editedProduct.description?.trim()) {
      newErrors.description = 'Product description is required'
    }

    if (editedProduct.variants && editedProduct.variants.length > 0) {
      editedProduct.variants.forEach((variant, index) => {
        if (!variant.title?.trim()) {
          newErrors[`variant_${index}_title`] = 'Variant title is required'
        }
        if (variant.price <= 0) {
          newErrors[`variant_${index}_price`] = 'Price must be greater than 0'
        }
      })
    } else if (!editedProduct.price || editedProduct.price <= 0) {
      newErrors.price = 'Price must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validateProduct()) {
      onSave(editedProduct)
    }
  }

  const updateField = (field: keyof ProductData, value: any) => {
    setEditedProduct(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addVariant = () => {
    const newVariant: ProductVariant = {
      title: 'Default Title',
      price: editedProduct.price || 0,
      inventory_quantity: 0
    }
    
    setEditedProduct(prev => ({
      ...prev,
      variants: [...(prev.variants || []), newVariant]
    }))
  }

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setEditedProduct(prev => ({
      ...prev,
      variants: prev.variants?.map((variant, i) => 
        i === index ? { ...variant, [field]: value } : variant
      ) || []
    }))
  }

  const removeVariant = (index: number) => {
    setEditedProduct(prev => ({
      ...prev,
      variants: prev.variants?.filter((_, i) => i !== index) || []
    }))
  }

  const addTag = (tag: string) => {
    if (tag.trim() && !editedProduct.tags?.includes(tag.trim())) {
      setEditedProduct(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag.trim()]
      }))
    }
  }

  const removeTag = (index: number) => {
    setEditedProduct(prev => ({
      ...prev,
      tags: prev.tags?.filter((_, i) => i !== index) || []
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedStore?.currency || 'USD'
    }).format(amount)
  }

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: Type },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'variants', label: 'Variants', icon: Package },
    { id: 'images', label: 'Images', icon: ImageIcon },
    { id: 'seo', label: 'SEO & Tags', icon: Tag }
  ]

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Product Editor</h2>
              <p className="text-sm text-gray-600">
                {hasChanges ? 'Unsaved changes' : 'No changes'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>Preview</span>
            </button>
            
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={!hasChanges || isLoading || Object.keys(errors).length > 0}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 border-r border-gray-200 p-4">
          <nav className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon
              const hasError = Object.keys(errors).some(key => 
                key.startsWith(section.id) || 
                (section.id === 'basic' && ['title', 'description'].includes(key)) ||
                (section.id === 'pricing' && key === 'price')
              )
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{section.label}</span>
                  {hasError && (
                    <AlertCircle className="w-4 h-4 text-red-500 ml-auto" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Basic Info Section */}
          {activeSection === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Title *
                </label>
                <input
                  type="text"
                  value={editedProduct.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter product title..."
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={editedProduct.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={6}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Describe your product..."
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={editedProduct.category || ''}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Product category..."
                />
              </div>
            </div>
          )}

          {/* Pricing Section */}
          {activeSection === 'pricing' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Price *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editedProduct.price || ''}
                    onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.price && (
                  <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                )}
                {editedProduct.price && (
                  <p className="text-sm text-gray-600 mt-1">
                    Display price: {formatCurrency(editedProduct.price)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Variants Section */}
          {activeSection === 'variants' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Product Variants</h3>
                <button
                  onClick={addVariant}
                  className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Variant</span>
                </button>
              </div>

              {editedProduct.variants && editedProduct.variants.length > 0 ? (
                <div className="space-y-4">
                  {editedProduct.variants.map((variant, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">Variant {index + 1}</h4>
                        <button
                          onClick={() => removeVariant(index)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title *
                          </label>
                          <input
                            type="text"
                            value={variant.title}
                            onChange={(e) => updateVariant(index, 'title', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                              errors[`variant_${index}_title`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Variant title..."
                          />
                          {errors[`variant_${index}_title`] && (
                            <p className="text-red-500 text-xs mt-1">{errors[`variant_${index}_title`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.price}
                            onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                              errors[`variant_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="0.00"
                          />
                          {errors[`variant_${index}_price`] && (
                            <p className="text-red-500 text-xs mt-1">{errors[`variant_${index}_price`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Inventory
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={variant.inventory_quantity || 0}
                            onChange={(e) => updateVariant(index, 'inventory_quantity', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SKU
                          </label>
                          <input
                            type="text"
                            value={variant.sku || ''}
                            onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="SKU..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No variants added yet</p>
                  <p className="text-sm">Add variants for different sizes, colors, or options</p>
                </div>
              )}
            </div>
          )}

          {/* Images Section */}
          {activeSection === 'images' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Product Images</h3>
              
              {editedProduct.images && editedProduct.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {editedProduct.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Product image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        onClick={() => {
                          const newImages = editedProduct.images?.filter((_, i) => i !== index) || []
                          updateField('images', newImages)
                        }}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No images added yet</p>
                  <p className="text-sm">Upload images to showcase your product</p>
                </div>
              )}
            </div>
          )}

          {/* SEO & Tags Section */}
          {activeSection === 'seo' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editedProduct.tags?.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center space-x-2"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => removeTag(index)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add a tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const input = e.target as HTMLInputElement
                        addTag(input.value)
                        input.value = ''
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement
                      addTag(input.value)
                      input.value = ''
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
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
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Product Preview</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">{editedProduct.title}</h4>
                    {editedProduct.price && (
                      <div className="text-3xl font-bold text-green-600 mt-2">
                        {formatCurrency(editedProduct.price)}
                      </div>
                    )}
                  </div>

                  {editedProduct.images && editedProduct.images.length > 0 && (
                    <div>
                      <img
                        src={editedProduct.images[0]}
                        alt={editedProduct.title}
                        className="w-full h-64 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}

                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Description</h5>
                    <p className="text-gray-600 whitespace-pre-wrap">{editedProduct.description}</p>
                  </div>

                  {editedProduct.variants && editedProduct.variants.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Variants</h5>
                      <div className="space-y-2">
                        {editedProduct.variants.map((variant, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium">{variant.title}</span>
                            <span className="text-green-600 font-medium">
                              {formatCurrency(variant.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {editedProduct.tags && editedProduct.tags.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Tags</h5>
                      <div className="flex flex-wrap gap-2">
                        {editedProduct.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
