'use client'

import React, { ReactNode } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface Column<T> {
  id: string
  header: string
  accessor: keyof T | ((row: T) => ReactNode)
  sortable?: boolean
  render?: (value: unknown, row: T) => ReactNode
  className?: string
  headerClassName?: string
}

export interface EmptyStateConfig {
  icon?: ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export interface PaginationConfig {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  onPageChange: (page: number) => void
}

export interface SortingConfig {
  field: string | null
  direction: 'asc' | 'desc'
  onSort: (field: string) => void
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyState?: EmptyStateConfig
  pagination?: PaginationConfig
  sorting?: SortingConfig
  onRowClick?: (row: T) => void
  rowKey: keyof T
  className?: string
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function LoadingSkeleton({ columns }: { columns: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {[...Array(5)].map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4 px-6 py-4"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            animationDelay: `${rowIndex * 100}ms`,
          }}
        >
          {[...Array(columns)].map((_, colIndex) => (
            <div
              key={colIndex}
              className="relative overflow-hidden rounded-md bg-gray-100"
              style={{
                height: colIndex === 0 ? '44px' : '24px',
                width: colIndex === 0 ? '80%' : `${60 + Math.random() * 30}%`,
              }}
            >
              <div
                className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`,
                }}
              />
            </div>
          ))}
        </div>
      ))}
      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// ERROR STATE
// ============================================================================

function ErrorState({
  message,
  onRetry
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {/* Abstract error illustration */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center transform rotate-3 shadow-lg">
          <svg
            className="w-10 h-10 text-red-500"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M12 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
          </svg>
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-red-500/20 transform rotate-12" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2 tracking-tight">
        Something went wrong
      </h3>
      <p className="text-gray-500 text-center max-w-sm mb-6 leading-relaxed">
        {message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="group relative px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/20 active:scale-[0.98]"
        >
          <span className="relative z-10 flex items-center gap-2">
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" viewBox="0 0 24 24" fill="none">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Try Again
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </button>
      )}
    </div>
  )
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ config }: { config: EmptyStateConfig }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {/* Custom icon or default */}
      <div className="relative mb-6">
        {config.icon || (
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-inner">
            <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        )}
        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-green-500/20" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-gray-200" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2 tracking-tight">
        {config.title}
      </h3>
      <p className="text-gray-500 text-center max-w-sm mb-6 leading-relaxed">
        {config.description}
      </p>

      {config.action && (
        <button
          onClick={config.action.onClick}
          className="group relative px-5 py-2.5 bg-green-500 text-white text-sm font-medium rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-green-500/30 active:scale-[0.98]"
        >
          <span className="relative z-10 flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {config.action.label}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </button>
      )}
    </div>
  )
}

// ============================================================================
// SORT INDICATOR
// ============================================================================

function SortIndicator({
  active,
  direction
}: {
  active: boolean
  direction: 'asc' | 'desc'
}) {
  return (
    <span className="ml-2 inline-flex flex-col items-center justify-center h-4 w-4">
      <svg
        className={`w-3 h-3 transition-all duration-200 ${
          active && direction === 'asc'
            ? 'text-green-500 transform scale-110'
            : 'text-gray-300'
        }`}
        viewBox="0 0 10 6"
        fill="none"
      >
        <path d="M1 5l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <svg
        className={`w-3 h-3 -mt-1 transition-all duration-200 ${
          active && direction === 'desc'
            ? 'text-green-500 transform scale-110'
            : 'text-gray-300'
        }`}
        viewBox="0 0 10 6"
        fill="none"
      >
        <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  )
}

// ============================================================================
// PAGINATION
// ============================================================================

function Pagination({ config }: { config: PaginationConfig }) {
  const { currentPage, totalPages, itemsPerPage, totalItems, onPageChange } = config

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    // Always show first page
    pages.push(1)

    if (currentPage > 3) {
      pages.push('ellipsis')
    }

    // Show pages around current
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i)
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis')
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
      {/* Item count */}
      <p className="text-sm text-gray-500 font-medium tabular-nums">
        Showing <span className="text-gray-900">{startItem}</span> to{' '}
        <span className="text-gray-900">{endItem}</span> of{' '}
        <span className="text-gray-900">{totalItems}</span> results
      </p>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none transition-all duration-200"
          aria-label="Previous page"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentPage === page
                    ? 'bg-green-500 text-white shadow-md shadow-green-500/30'
                    : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900'
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none transition-all duration-200"
          aria-label="Next page"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// MOBILE CARD VIEW
// ============================================================================

function MobileCard<T>({
  row,
  columns,
  onClick,
  rowKey
}: {
  row: T
  columns: Column<T>[]
  onClick?: (row: T) => void
  rowKey: keyof T
}) {
  const getCellValue = (column: Column<T>) => {
    const rawValue = typeof column.accessor === 'function'
      ? column.accessor(row)
      : row[column.accessor as keyof T]

    if (column.render) {
      return column.render(rawValue, row)
    }

    return rawValue as ReactNode
  }

  return (
    <div
      onClick={() => onClick?.(row)}
      className={`bg-white rounded-xl border border-gray-200 p-4 space-y-3 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-green-200 hover:shadow-md active:scale-[0.99]' : ''
      }`}
    >
      {columns.map((column) => (
        <div key={column.id} className="flex justify-between items-start gap-4">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider shrink-0">
            {column.header}
          </span>
          <span className={`text-sm text-gray-900 text-right ${column.className || ''}`}>
            {getCellValue(column)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  error = null,
  onRetry,
  emptyState,
  pagination,
  sorting,
  onRowClick,
  rowKey,
  className = '',
}: DataTableProps<T>) {

  const getCellValue = (row: T, column: Column<T>) => {
    const rawValue = typeof column.accessor === 'function'
      ? column.accessor(row)
      : row[column.accessor as keyof T]

    if (column.render) {
      return column.render(rawValue, row)
    }

    return rawValue as ReactNode
  }

  const defaultEmptyState: EmptyStateConfig = {
    title: 'No data found',
    description: 'There are no items to display at the moment.',
  }

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* Loading State */}
      {loading && <LoadingSkeleton columns={columns.length} />}

      {/* Error State */}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}

      {/* Empty State */}
      {!loading && !error && data.length === 0 && (
        <EmptyState config={emptyState || defaultEmptyState} />
      )}

      {/* Data Table */}
      {!loading && !error && data.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className={`px-6 py-4 text-left ${column.headerClassName || ''}`}
                    >
                      {column.sortable && sorting ? (
                        <button
                          onClick={() => sorting.onSort(column.id)}
                          className="group flex items-center text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors duration-200"
                        >
                          {column.header}
                          <SortIndicator
                            active={sorting.field === column.id}
                            direction={sorting.direction}
                          />
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          {column.header}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row) => (
                  <tr
                    key={String(row[rowKey])}
                    onClick={() => onRowClick?.(row)}
                    className={`group transition-colors duration-150 ${
                      onRowClick
                        ? 'cursor-pointer hover:bg-green-50/50'
                        : 'hover:bg-gray-50/50'
                    }`}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={`px-6 py-4 text-sm text-gray-900 ${column.className || ''}`}
                      >
                        <div className="relative">
                          {/* Accent bar on hover for clickable rows */}
                          {onRowClick && column.id === columns[0].id && (
                            <div className="absolute -left-6 top-0 bottom-0 w-1 bg-green-500 rounded-r opacity-0 transform -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                          )}
                          {getCellValue(row, column)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-3">
            {data.map((row) => (
              <MobileCard
                key={String(row[rowKey])}
                row={row}
                columns={columns}
                onClick={onRowClick}
                rowKey={rowKey}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <Pagination config={pagination} />
          )}
        </>
      )}
    </div>
  )
}

export default DataTable
