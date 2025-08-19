'use client'

import React, { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface ProductDraft {
  id: string
  title: string
  description: string
  price: string
  imageUrl?: string
  status: 'draft' | 'publishing' | 'published' | 'error'
  errorMessage?: string
}

interface AIStoreAssistantLayoutProps {
  children: React.ReactNode
  productPreviewDock: React.ReactNode
  storeId: string
}

export default function AIStoreAssistantLayout({
  children,
  productPreviewDock,
  storeId
}: AIStoreAssistantLayoutProps) {
  const [isPreviewVisible, setIsPreviewVisible] = useState(true)

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Mobile Layout: Preview Dock Above Chat */}
      <div className="lg:hidden flex flex-col gap-4 h-full">
        {/* Preview Dock Toggle */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <button
            onClick={() => setIsPreviewVisible(!isPreviewVisible)}
            className="w-full flex items-center justify-between p-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="cf-beacon">
                <span className="text-orange-500">⚓</span>
              </div>
              <span>Product Preview Dock</span>
            </div>
            {isPreviewVisible ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          {isPreviewVisible && (
            <div className="border-t border-slate-200 p-4">
              <div className="cf-scroll max-h-64">
                {productPreviewDock}
              </div>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        <div className="flex-1 min-h-0 bg-white rounded-lg shadow-sm border border-slate-200 cf-float">
          <div className="h-full cf-scroll">
            {children}
          </div>
        </div>
      </div>

      {/* Desktop Layout: Chat Left, Preview Right */}
      <div className="hidden lg:flex gap-4 h-full w-full">
        {/* Chat Panel - Primary (2fr) */}
        <div className="flex-[2] min-w-0 bg-white rounded-lg shadow-sm border border-slate-200 cf-float">
          <div className="h-full cf-scroll">
            {children}
          </div>
        </div>

        {/* Product Preview Dock - Secondary (1fr) */}
        <div className="flex-1 min-w-0 bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="sticky top-0 bg-white border-b border-slate-200 p-4 rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className="cf-beacon">
                <span className="text-orange-500">⚓</span>
              </div>
              <h3 className="font-semibold text-slate-800">Product Preview</h3>
              <div className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                Store: {storeId.slice(-8)}
              </div>
            </div>
          </div>
          
          <div className="p-4 cf-scroll" style={{ height: 'calc(100% - 73px)' }}>
            {productPreviewDock}
          </div>
        </div>
      </div>

      {/* Floating Toolbar (Optional) */}
      <div className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-50">
        <div className="bg-white rounded-full shadow-lg border border-slate-200 p-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="hidden sm:inline">AI Assistant Active</span>
          </div>
        </div>
      </div>
    </div>
  )
}
