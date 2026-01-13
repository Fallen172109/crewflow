'use client'

import React, { useState, useImperativeHandle, forwardRef } from 'react'
import { X, Edit2, Package, DollarSign, Image, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export interface ProductDraft {
  id: string
  title: string
  description: string
  price: string
  imageUrl?: string
  status: 'draft' | 'publishing' | 'published' | 'error'
  errorMessage?: string
}

interface ProductPreviewDockProps {
  initialDrafts?: ProductDraft[]
  onPublished?: () => void
  storeId?: string
}

// Export the component with a ref to allow parent to add drafts
export interface ProductPreviewDockRef {
  addDraft: (draft: ProductDraft) => void
}

const ProductPreviewDock = forwardRef<ProductPreviewDockRef, ProductPreviewDockProps>(({
  initialDrafts = [],
  onPublished,
  storeId
}, ref) => {
  const [drafts, setDrafts] = useState<ProductDraft[]>(initialDrafts)
  const [editingField, setEditingField] = useState<{ draftId: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleStartEdit = (draftId: string, field: string, currentValue: string) => {
    setEditingField({ draftId, field })
    setEditValue(currentValue)
  }

  const handleSaveEdit = () => {
    if (!editingField) return

    setDrafts(prev => prev.map(draft =>
      draft.id === editingField.draftId
        ? { ...draft, [editingField.field]: editValue }
        : draft
    ))
    setEditingField(null)
    setEditValue('')
  }

  const handleCancelEdit = () => {
    setEditingField(null)
    setEditValue('')
  }

  const handleRemoveDraft = (id: string) => {
    setDrafts(prev => prev.filter(draft => draft.id !== id))
  }

  const handleUpdateDraft = (id: string, updates: Partial<ProductDraft>) => {
    setDrafts(prev => prev.map(draft =>
      draft.id === id ? { ...draft, ...updates } : draft
    ))
  }

  const addDraft = (draft: ProductDraft) => {
    setDrafts(prev => [draft, ...prev])
  }

  useImperativeHandle(ref, () => ({
    addDraft
  }))

  const handlePublish = async (draft: ProductDraft) => {
    try {
      handleUpdateDraft(draft.id, { status: 'publishing' })

      const response = await fetch('/api/shopify/actions/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: {
            type: 'product_create',
            payload: {
              title: draft.title,
              description: draft.description,
              price: parseFloat(draft.price),
              imageUrl: draft.imageUrl
            },
            confirmed: true,
            requiresUserConfirmation: true
          },
          storeId: storeId || 'current-store'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        handleUpdateDraft(draft.id, { status: 'published' })
        // Remove draft after successful publish (simulate "pushed to store")
        setTimeout(() => handleRemoveDraft(draft.id), 2000)
        onPublished?.()
      } else {
        throw new Error(result.error || 'Failed to create product')
      }
    } catch (error) {
      console.error('Failed to publish product:', error)
      handleUpdateDraft(draft.id, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  if (drafts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="text-sm">No product drafts yet</p>
        <p className="text-xs mt-1">Ask the AI to create a product to see previews here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {drafts.map((draft) => (
        <div key={draft.id} className="bg-slate-50 rounded-lg border border-slate-200 p-4 cf-float">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-800">Product Draft</span>
            </div>
            <button
              onClick={() => handleRemoveDraft(draft.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              disabled={draft.status === 'publishing'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title */}
          <div className="mb-3">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Title</label>
            {editingField?.draftId === draft.id && editingField?.field === 'title' ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit()
                    if (e.key === 'Escape') handleCancelEdit()
                  }}
                  autoFocus
                />
                <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-700">
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-800 flex-1">{draft.title}</span>
                <button
                  onClick={() => handleStartEdit(draft.id, 'title', draft.title)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={draft.status === 'publishing'}
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="mb-3">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Price</label>
            {editingField?.draftId === draft.id && editingField?.field === 'price' ? (
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <DollarSign className="w-4 h-4 absolute left-2 top-1.5 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded pl-8 pr-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit()
                      if (e.key === 'Escape') handleCancelEdit()
                    }}
                    autoFocus
                  />
                </div>
                <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-700">
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 flex-1">
                  <DollarSign className="w-3 h-3 text-slate-400" />
                  <span className="text-sm text-slate-800">{draft.price}</span>
                </div>
                <button
                  onClick={() => handleStartEdit(draft.id, 'price', draft.price)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={draft.status === 'publishing'}
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
            {editingField?.draftId === draft.id && editingField?.field === 'description' ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) handleSaveEdit()
                    if (e.key === 'Escape') handleCancelEdit()
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-700 text-xs">
                    Save (Ctrl+Enter)
                  </button>
                  <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600 text-xs">
                    Cancel (Esc)
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <p className="text-sm text-slate-600 flex-1 line-clamp-3">{draft.description}</p>
                <button
                  onClick={() => handleStartEdit(draft.id, 'description', draft.description)}
                  className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                  disabled={draft.status === 'publishing'}
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Image URL */}
          {draft.imageUrl && (
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Image</label>
              <div className="flex items-center gap-2">
                <Image className="w-3 h-3 text-slate-400" />
                <span className="text-xs text-slate-500 truncate flex-1">{draft.imageUrl}</span>
              </div>
            </div>
          )}

          {/* Status & Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2">
              {draft.status === 'draft' && (
                <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">Draft</span>
              )}
              {draft.status === 'publishing' && (
                <div className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-green-500" />
                  <span className="text-xs text-green-600">Publishing...</span>
                </div>
              )}
              {draft.status === 'published' && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">Published!</span>
                </div>
              )}
              {draft.status === 'error' && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  <span className="text-xs text-red-600">Error</span>
                </div>
              )}
            </div>

            {draft.status === 'draft' && (
              <button
                onClick={() => handlePublish(draft)}
                className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
              >
                <Send className="w-3 h-3" />
                Publish to Shopify
              </button>
            )}
          </div>

          {/* Error Message */}
          {draft.status === 'error' && draft.errorMessage && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {draft.errorMessage}
            </div>
          )}
        </div>
      ))}
    </div>
  )
})

ProductPreviewDock.displayName = 'ProductPreviewDock'

export default ProductPreviewDock
