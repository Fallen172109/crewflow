'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import AIStoreAssistantLayout from '@/components/assistant/AIStoreAssistantLayout'
import ProductPreviewDock from '@/components/assistant/ProductPreviewDock'
import StoreChatPanel from '@/components/assistant/StoreChatPanel'

interface ProductDraft {
  id: string
  title: string
  description: string
  price: string
  imageUrl?: string
  status: 'draft' | 'publishing' | 'published' | 'error'
  errorMessage?: string
}

export default function StoreAssistantPage() {
  const params = useParams()
  const storeId = params.storeId as string
  const [productDrafts, setProductDrafts] = useState<ProductDraft[]>([])
  const [threadId] = useState(() => `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

  // Handle new draft from chat
  const handleNewDraft = (draft: ProductDraft) => {
    setProductDrafts(prev => [...prev, draft])
  }

  // Handle draft removal
  const handleRemoveDraft = (id: string) => {
    setProductDrafts(prev => prev.filter(draft => draft.id !== id))
  }

  // Handle draft updates
  const handleUpdateDraft = (id: string, updates: Partial<ProductDraft>) => {
    setProductDrafts(prev =>
      prev.map(draft =>
        draft.id === id ? { ...draft, ...updates } : draft
      )
    )
  }

  // Handle draft publishing
  const handlePublishDraft = async (draft: ProductDraft) => {
    // This is handled within ProductPreviewDock component
    // but we could add additional logic here if needed
  }

  // Validate storeId
  useEffect(() => {
    if (!storeId) {
      console.error('No storeId provided')
      return
    }
    
    console.log('AI Store Assistant initialized for store:', storeId)
  }, [storeId])

  if (!storeId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Invalid Store</h2>
          <p className="text-slate-600">No store ID provided. Please select a valid store.</p>
        </div>
      </div>
    )
  }

  return (
    <AIStoreAssistantLayout
      storeId={storeId}
      productPreviewDock={
        <ProductPreviewDock
          drafts={productDrafts}
          onRemoveDraft={handleRemoveDraft}
          onUpdateDraft={handleUpdateDraft}
          onPublishDraft={handlePublishDraft}
          storeId={storeId}
        />
      }
    >
      <StoreChatPanel
        storeId={storeId}
        threadId={threadId}
        onNewDraft={handleNewDraft}
      />
    </AIStoreAssistantLayout>
  )
}
