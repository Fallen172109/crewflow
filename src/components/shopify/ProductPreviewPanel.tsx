'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, 
  DollarSign, 
  Tag, 
  Image as ImageIcon,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Ship,
  Anchor,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductPreview {
  title?: string
  description?: string
  price?: number
  images?: string[]
  category?: string
  tags?: string[]
  variants?: Array<{
    title: string
    price: number
    inventory: number
  }>
}

interface ProductPreviewPanelProps {
  className?: string
  productPreview?: ProductPreview | null
  isGenerating?: boolean
  onPublishToShopify?: (product: ProductPreview) => void
  recentProducts?: any[]
  loadingProducts?: boolean
}

export default function ProductPreviewPanel({
  className = '',
  productPreview,
  isGenerating = false,
  onPublishToShopify,
  recentProducts = [],
  loadingProducts = false
}: ProductPreviewPanelProps) {
  const [isPublishing, setIsPublishing] = useState(false)

  const handlePublish = async () => {
    if (!productPreview || !onPublishToShopify) return
    
    setIsPublishing(true)
    try {
      await onPublishToShopify(productPreview)
    } catch (error) {
      console.error('Error publishing product:', error)
    } finally {
      setIsPublishing(false)
    }
  }

  const hasContent = productPreview && (productPreview.title || productPreview.description)

  return (
    <div className={cn(
      "bg-white rounded-2xl border border-gray-200 shadow-xl flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black">Product Preview</h3>
              <p className="text-gray-600 text-sm">
                {isGenerating ? 'Generating product...' : hasContent ? 'Ready to publish' : 'Awaiting product creation'}
              </p>
            </div>
          </div>
          {isGenerating && (
            <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-4"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              </div>
              <div>
                <h4 className="text-black font-medium mb-2">Creating Product</h4>
                <p className="text-gray-600 text-sm">
                  Our AI is crafting your product listing...
                </p>
              </div>
            </motion.div>
          ) : hasContent ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Product Title */}
              {productPreview.title && (
                <div>
                  <label className="text-gray-700 text-sm font-medium mb-2 block">Product Title</label>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <h4 className="text-black font-medium">{productPreview.title}</h4>
                  </div>
                </div>
              )}

              {/* Product Description */}
              {productPreview.description && (
                <div>
                  <label className="text-gray-700 text-sm font-medium mb-2 block">Description</label>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 max-h-32 overflow-y-auto">
                    <p className="text-gray-800 text-sm leading-relaxed">
                      {productPreview.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Price and Category */}
              <div className="grid grid-cols-2 gap-4">
                {productPreview.price && (
                  <div>
                    <label className="text-gray-700 text-sm font-medium mb-2 block">Price</label>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-black font-medium">${productPreview.price}</span>
                    </div>
                  </div>
                )}

                {productPreview.category && (
                  <div>
                    <label className="text-gray-700 text-sm font-medium mb-2 block">Category</label>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-center space-x-2">
                      <Tag className="w-4 h-4 text-blue-600" />
                      <span className="text-black text-sm">{productPreview.category}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              {productPreview.tags && productPreview.tags.length > 0 && (
                <div>
                  <label className="text-gray-700 text-sm font-medium mb-2 block">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {productPreview.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs border border-orange-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Images */}
              {productPreview.images && productPreview.images.length > 0 ? (
                <div>
                  <label className="text-gray-700 text-sm font-medium mb-2 block flex items-center space-x-2">
                    <ImageIcon className="w-4 h-4" />
                    <span>Product Images ({productPreview.images.length})</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {productPreview.images.slice(0, 4).map((image, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 aspect-square overflow-hidden group relative">
                        <img
                          src={image}
                          alt={`Product ${index + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        {index === 0 && (
                          <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                            Main
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                    {productPreview.images.length > 4 && (
                      <div className="bg-gray-100 rounded-lg border border-gray-200 aspect-square flex items-center justify-center">
                        <div className="text-center">
                          <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                          <p className="text-xs text-gray-500">+{productPreview.images.length - 4} more</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-gray-700 text-sm font-medium mb-2 block">Product Images</label>
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 border-dashed text-center">
                    <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">No images available</p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : loadingProducts ? (
            <motion.div
              key="loading-products"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-4"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              </div>
              <div>
                <h4 className="text-black font-medium mb-2">Loading Products</h4>
                <p className="text-gray-600 text-sm">
                  Fetching your latest Shopify products...
                </p>
              </div>
            </motion.div>
          ) : recentProducts.length > 0 ? (
            <motion.div
              key="recent-products"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-black font-medium">Recent Products</h4>
                <div className="flex items-center space-x-1 text-gray-500 text-xs">
                  <Eye className="w-3 h-3" />
                  <span>From your store</span>
                </div>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentProducts.slice(0, 3).map((product, index) => (
                  <div key={product.id || index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-black font-medium text-sm truncate">
                          {product.title || 'Untitled Product'}
                        </h5>
                        <p className="text-gray-600 text-xs mt-1">
                          {product.product_type || 'General'}
                        </p>
                        {product.variants && product.variants[0] && (
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-green-600 font-medium text-sm">
                              ${product.variants[0].price}
                            </span>
                            <span className="text-gray-500 text-xs">
                              Stock: {product.variants[0].inventory_quantity || 0}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center pt-2">
                <p className="text-gray-500 text-xs">
                  Create new products using the AI chat above
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-4"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
                <Ship className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h4 className="text-black font-medium mb-2">Ready to Set Sail</h4>
                <p className="text-gray-600 text-sm max-w-xs">
                  Use the AI chat to create a new product and watch the preview appear here
                </p>
              </div>
              <div className="flex items-center space-x-2 text-gray-500 text-xs">
                <Anchor className="w-3 h-3" />
                <span>Maritime Product Creation</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Publish Button */}
      {hasContent && !isGenerating && (
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className={cn(
              "w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200",
              isPublishing
                ? "bg-orange-300 text-orange-700 cursor-not-allowed"
                : "bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            )}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing to Shopify...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Publish to Shopify</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
