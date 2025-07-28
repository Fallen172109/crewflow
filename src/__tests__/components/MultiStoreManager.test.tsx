import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import MultiStoreManager from '@/components/shopify/MultiStoreManager'

// Mock fetch globally
global.fetch = jest.fn()

// Mock window.confirm and window.alert
global.confirm = jest.fn()
global.alert = jest.fn()

const mockStores = [
  {
    id: 'store-1',
    shop_domain: 'test-store-1.myshopify.com',
    store_name: 'Test Store 1',
    store_email: 'test1@example.com',
    currency: 'USD',
    timezone: 'America/New_York',
    plan_name: 'Basic Shopify',
    is_active: true,
    is_primary: true,
    connected_at: '2024-01-01T00:00:00Z',
    sync_status: 'synced' as const,
    metadata: {
      shop_id: 12345,
      total_products: 100,
      total_customers: 50,
      monthly_revenue: 5000
    },
    permissions: {
      read_products: true,
      write_products: true,
      read_orders: true,
      write_orders: true,
      read_customers: true,
      read_analytics: true,
      read_inventory: true,
      write_inventory: true
    },
    agent_access: {}
  },
  {
    id: 'store-2',
    shop_domain: 'test-store-2.myshopify.com',
    store_name: 'Test Store 2',
    store_email: 'test2@example.com',
    currency: 'USD',
    timezone: 'America/New_York',
    plan_name: 'Shopify',
    is_active: true,
    is_primary: false,
    connected_at: '2024-01-02T00:00:00Z',
    sync_status: 'synced' as const,
    metadata: {
      shop_id: 67890,
      total_products: 75,
      total_customers: 30,
      monthly_revenue: 3000
    },
    permissions: {
      read_products: true,
      write_products: true,
      read_orders: true,
      write_orders: true,
      read_customers: true,
      read_analytics: true,
      read_inventory: true,
      write_inventory: true
    },
    agent_access: {}
  }
]

describe('MultiStoreManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful API responses
    ;(global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url === '/api/shopify/stores' && (!options || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ stores: mockStores })
        })
      }
      
      if (url === '/api/shopify/stores' && options?.method === 'POST') {
        const body = JSON.parse(options.body)
        if (body.action === 'remove') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          })
        }
      }
      
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' })
      })
    })
  })

  it('renders store list correctly', async () => {
    render(<MultiStoreManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Store 1')).toBeInTheDocument()
      expect(screen.getByText('Test Store 2')).toBeInTheDocument()
    })
  })

  it('shows remove button for each store', async () => {
    render(<MultiStoreManager />)
    
    await waitFor(() => {
      const removeButtons = screen.getAllByTitle('Remove store')
      expect(removeButtons).toHaveLength(2)
    })
  })

  it('shows confirmation dialog when remove button is clicked', async () => {
    ;(global.confirm as jest.Mock).mockReturnValue(false)

    render(<MultiStoreManager />)

    await waitFor(() => {
      const removeButtons = screen.getAllByTitle('Remove store')
      // Click the second store (non-primary) to avoid the primary store protection
      fireEvent.click(removeButtons[1])
    })

    expect(global.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Are you sure you want to remove "Test Store 2"?')
    )
  })

  it('calls remove API when user confirms removal', async () => {
    ;(global.confirm as jest.Mock).mockReturnValue(true)

    render(<MultiStoreManager />)

    await waitFor(() => {
      const removeButtons = screen.getAllByTitle('Remove store')
      // Click the second store (non-primary) to avoid the primary store protection
      fireEvent.click(removeButtons[1])
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/shopify/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          storeId: 'store-2'
        })
      })
    })
  })

  it('does not call remove API when user cancels removal', async () => {
    ;(global.confirm as jest.Mock).mockReturnValue(false)

    render(<MultiStoreManager />)

    await waitFor(() => {
      const removeButtons = screen.getAllByTitle('Remove store')
      // Click the second store (non-primary) to avoid the primary store protection
      fireEvent.click(removeButtons[1])
    })

    // Should not call the remove API
    expect(global.fetch).not.toHaveBeenCalledWith('/api/shopify/stores',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('remove')
      })
    )
  })

  it('reloads stores after successful removal', async () => {
    ;(global.confirm as jest.Mock).mockReturnValue(true)

    render(<MultiStoreManager />)

    await waitFor(() => {
      const removeButtons = screen.getAllByTitle('Remove store')
      // Click the second store (non-primary) to avoid the primary store protection
      fireEvent.click(removeButtons[1])
    })

    // Should call the stores API twice - once for initial load, once for reload after removal
    await waitFor(() => {
      const getStoreCalls = (global.fetch as jest.Mock).mock.calls.filter(
        call => call[0] === '/api/shopify/stores' && (!call[1] || call[1].method !== 'POST')
      )
      expect(getStoreCalls.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('prevents removing primary store when multiple stores exist', async () => {
    ;(global.confirm as jest.Mock).mockReturnValue(true)

    render(<MultiStoreManager />)

    await waitFor(() => {
      // Click remove button for the primary store (first store in mock data)
      const removeButtons = screen.getAllByTitle('Remove store')
      fireEvent.click(removeButtons[0])
    })

    expect(global.alert).toHaveBeenCalledWith(
      'Cannot remove the primary store. Please set another store as primary first.'
    )

    // Should not call the remove API
    expect(global.fetch).not.toHaveBeenCalledWith('/api/shopify/stores',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('remove')
      })
    )
  })

  it('shows loading state during removal', async () => {
    ;(global.confirm as jest.Mock).mockReturnValue(true)

    // Mock a delayed response
    ;(global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url === '/api/shopify/stores' && (!options || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ stores: mockStores })
        })
      }

      if (url === '/api/shopify/stores' && options?.method === 'POST') {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ success: true })
            })
          }, 100)
        })
      }

      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' })
      })
    })

    render(<MultiStoreManager />)

    await waitFor(() => {
      // Click remove button for the non-primary store (second store)
      const removeButtons = screen.getAllByTitle('Remove store')
      fireEvent.click(removeButtons[1])
    })

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByTitle('Removing store...')).toBeInTheDocument()
    })
  })
})
