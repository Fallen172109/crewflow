'use client'

import { useState, useCallback } from 'react'
import { ProductPreviewData } from '@/components/shopify/ProductPreviewModal'

interface UseProductPreviewOptions {
  onPublish?: (productData: ProductPreviewData) => Promise<void>
  onSave?: (productData: ProductPreviewData) => Promise<void>
}

export function useProductPreview(options: UseProductPreviewOptions = {}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<ProductPreviewData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'preview' | 'edit'>('preview')

  const { onPublish, onSave } = options

  const openPreview = useCallback((productData: ProductPreviewData, mode: 'preview' | 'edit' = 'preview') => {
    setPreviewData(productData)
    setPreviewMode(mode)
    setIsPreviewOpen(true)
    setError(null)
  }, [])

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false)
    setPreviewData(null)
    setError(null)
    setIsLoading(false)
  }, [])

  const handleSave = useCallback(async (updatedData: ProductPreviewData) => {
    if (!onSave) return

    try {
      setIsLoading(true)
      setError(null)
      
      await onSave(updatedData)
      setPreviewData(updatedData)
      
      // Switch to preview mode after saving
      setPreviewMode('preview')
    } catch (err) {
      console.error('Error saving product:', err)
      setError(err instanceof Error ? err.message : 'Failed to save product')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [onSave])

  const handlePublish = useCallback(async (productData: ProductPreviewData) => {
    if (!onPublish) return

    try {
      setIsLoading(true)
      setError(null)
      
      await onPublish(productData)
      
      // Close preview after successful publish
      closePreview()
    } catch (err) {
      console.error('Error publishing product:', err)
      setError(err instanceof Error ? err.message : 'Failed to publish product')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [onPublish, closePreview])

  const createProductFromAI = useCallback((aiGeneratedData: any): ProductPreviewData => {
    // Transform AI-generated data into ProductPreviewData format
    return {
      title: aiGeneratedData.title || 'Untitled Product',
      description: aiGeneratedData.description || '',
      price: parseFloat(aiGeneratedData.price) || 0,
      compareAtPrice: aiGeneratedData.compareAtPrice ? parseFloat(aiGeneratedData.compareAtPrice) : undefined,
      images: Array.isArray(aiGeneratedData.images) ? aiGeneratedData.images : [],
      tags: Array.isArray(aiGeneratedData.tags) ? aiGeneratedData.tags : [],
      vendor: aiGeneratedData.vendor || '',
      productType: aiGeneratedData.productType || aiGeneratedData.product_type || '',
      variants: aiGeneratedData.variants || [{
        title: 'Default Title',
        price: parseFloat(aiGeneratedData.price) || 0,
        sku: aiGeneratedData.sku || '',
        inventory_quantity: aiGeneratedData.inventory_quantity || 0
      }],
      seo: {
        title: aiGeneratedData.seo_title || aiGeneratedData.title,
        description: aiGeneratedData.seo_description || aiGeneratedData.description
      },
      status: aiGeneratedData.status || 'draft'
    }
  }, [])

  const previewFromApprovalRequest = useCallback((approvalRequest: any) => {
    // Extract product data from approval request
    const actionData = approvalRequest.actionData || {}
    
    let productData: ProductPreviewData

    if (approvalRequest.actionType === 'create_product') {
      productData = createProductFromAI(actionData)
    } else if (approvalRequest.actionType === 'update_product') {
      productData = {
        id: actionData.id,
        title: actionData.title || 'Product',
        description: actionData.description || '',
        price: parseFloat(actionData.price) || 0,
        compareAtPrice: actionData.compareAtPrice ? parseFloat(actionData.compareAtPrice) : undefined,
        images: actionData.images || [],
        tags: actionData.tags || [],
        vendor: actionData.vendor || '',
        productType: actionData.productType || '',
        variants: actionData.variants || [],
        seo: actionData.seo || {},
        status: actionData.status || 'draft'
      }
    } else {
      // Default fallback
      productData = createProductFromAI(actionData)
    }

    openPreview(productData, 'preview')
  }, [createProductFromAI, openPreview])

  const editFromApprovalRequest = useCallback((approvalRequest: any) => {
    previewFromApprovalRequest(approvalRequest)
    setPreviewMode('edit')
  }, [previewFromApprovalRequest])

  return {
    // State
    isPreviewOpen,
    previewData,
    isLoading,
    error,
    previewMode,

    // Actions
    openPreview,
    closePreview,
    handleSave,
    handlePublish,
    createProductFromAI,
    previewFromApprovalRequest,
    editFromApprovalRequest,

    // Utilities
    setPreviewMode,
    clearError: () => setError(null)
  }
}
