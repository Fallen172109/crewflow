'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface ShopifyProductImage {
  id: number
  src: string
  alt?: string
}

export interface ShopifyProductVariant {
  id: number
  title: string
  price: string
  sku?: string
  inventory_quantity: number
  compare_at_price?: string
}

export interface ShopifyProduct {
  id: number
  title: string
  body_html?: string
  vendor: string
  product_type: string
  created_at: string
  handle: string
  updated_at: string
  published_at?: string
  status: 'active' | 'archived' | 'draft'
  tags: string
  variants: ShopifyProductVariant[]
  images: ShopifyProductImage[]
  image?: ShopifyProductImage
}

export type ProductSortField = 'title' | 'price' | 'status' | 'inventory' | 'updated_at'
export type SortDirection = 'asc' | 'desc'
export type ProductStatusFilter = 'all' | 'active' | 'draft' | 'archived'

export interface UseProductsOptions {
  storeId: string | null
  itemsPerPage?: number
}

export interface UseProductsReturn {
  // Data
  products: ShopifyProduct[]
  filteredProducts: ShopifyProduct[]
  paginatedProducts: ShopifyProduct[]

  // State
  loading: boolean
  error: string | null

  // Filters
  searchQuery: string
  setSearchQuery: (query: string) => void
  statusFilter: ProductStatusFilter
  setStatusFilter: (filter: ProductStatusFilter) => void

  // Sorting
  sortField: ProductSortField
  sortDirection: SortDirection
  handleSort: (field: ProductSortField) => void

  // Pagination
  currentPage: number
  setCurrentPage: (page: number) => void
  totalPages: number
  totalItems: number
  itemsPerPage: number

  // Actions
  refresh: () => Promise<void>
  duplicateProduct: (product: ShopifyProduct) => Promise<boolean>

  // Helpers
  getTotalInventory: (variants: ShopifyProductVariant[] | undefined | null) => number
  getLowestPrice: (variants: ShopifyProductVariant[] | undefined | null) => string
  formatCurrency: (amount: string | number, currency?: string) => string
  formatDate: (dateString: string) => string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getTotalInventory = (variants: ShopifyProductVariant[] | undefined | null): number => {
  if (!variants || !Array.isArray(variants)) return 0
  return variants.reduce((total, variant) => total + (variant?.inventory_quantity || 0), 0)
}

export const getLowestPrice = (variants: ShopifyProductVariant[] | undefined | null): string => {
  if (!variants || !Array.isArray(variants) || variants.length === 0) return '0.00'
  const prices = variants
    .map(v => parseFloat(v?.price || '0'))
    .filter(p => !isNaN(p))
  if (prices.length === 0) return '0.00'
  return Math.min(...prices).toFixed(2)
}

export const formatCurrency = (amount: string | number, currency: string = 'USD'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(0)
  }
  const validCurrency = /^[A-Z]{3}$/.test(currency) ? currency : 'USD'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: validCurrency,
  }).format(numAmount)
}

export const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid date'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ============================================================================
// HOOK
// ============================================================================

export function useProducts({
  storeId,
  itemsPerPage = 10
}: UseProductsOptions): UseProductsReturn {
  // Data state
  const [products, setProducts] = useState<ShopifyProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('all')

  // Sort state
  const [sortField, setSortField] = useState<ProductSortField>('updated_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch products with AbortController for race condition prevention
  useEffect(() => {
    if (!storeId) {
      setLoading(false)
      setProducts([])
      return
    }

    const abortController = new AbortController()

    const fetchProducts = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/shopify/stores/${storeId}/products`, {
          signal: abortController.signal
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to fetch products')
        }

        const data = await response.json()
        if (!abortController.signal.aborted) {
          setProducts(data.products || [])
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        console.error('Error fetching products:', err)
        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load products')
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchProducts()

    return () => {
      abortController.abort()
    }
  }, [storeId])

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!storeId) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/shopify/stores/${storeId}/products`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch products')
      }

      const data = await response.json()
      setProducts(data.products || [])
    } catch (err) {
      console.error('Error fetching products:', err)
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [storeId])

  // Duplicate product
  const duplicateProduct = useCallback(async (product: ShopifyProduct): Promise<boolean> => {
    if (!storeId) return false

    try {
      const response = await fetch(`/api/shopify/stores/${storeId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            title: `${product.title} (Copy)`,
            body_html: product.body_html,
            product_type: product.product_type,
            tags: product.tags,
            price: getLowestPrice(product.variants),
            inventory_quantity: 0,
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate product')
      }

      await refresh()
      return true
    } catch (err) {
      console.error('Error duplicating product:', err)
      return false
    }
  }, [storeId, refresh])

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = [...products]

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.vendor?.toLowerCase().includes(query) ||
        p.product_type?.toLowerCase().includes(query) ||
        p.tags?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'price':
          aValue = parseFloat(getLowestPrice(a.variants))
          bValue = parseFloat(getLowestPrice(b.variants))
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'inventory':
          aValue = getTotalInventory(a.variants)
          bValue = getTotalInventory(b.variants)
          break
        case 'updated_at':
          aValue = new Date(a.updated_at).getTime()
          bValue = new Date(b.updated_at).getTime()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [products, statusFilter, searchQuery, sortField, sortDirection])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage))

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredProducts, currentPage, itemsPerPage])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  // Handle sort click
  const handleSort = useCallback((field: ProductSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }, [sortField])

  return {
    // Data
    products,
    filteredProducts,
    paginatedProducts,

    // State
    loading,
    error,

    // Filters
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,

    // Sorting
    sortField,
    sortDirection,
    handleSort,

    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems: filteredProducts.length,
    itemsPerPage,

    // Actions
    refresh,
    duplicateProduct,

    // Helpers
    getTotalInventory,
    getLowestPrice,
    formatCurrency,
    formatDate,
  }
}

export default useProducts
