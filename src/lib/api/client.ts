/**
 * Standardized API Client for CrewFlow
 * Handles the new standardized API response format with backward compatibility
 */

import { StandardApiResponse, ErrorDetails } from './response-formatter'

// API Client Error class
export class ApiError extends Error {
  public code: string
  public details?: any
  public status: number

  constructor(code: string, message: string, details?: any, status: number = 500) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
    this.status = status
  }
}

// API Client Response type
export interface ApiClientResponse<T = any> {
  data: T | null
  success: boolean
  message: string
  error: ErrorDetails | null
  timestamp: string
}

// API Client configuration
export interface ApiClientConfig {
  baseUrl?: string
  timeout?: number
  headers?: Record<string, string>
  retries?: number
}

/**
 * Standardized API Client
 */
export class ApiClient {
  private baseUrl: string
  private timeout: number
  private headers: Record<string, string>
  private retries: number

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || ''
    this.timeout = config.timeout || 30000
    this.headers = config.headers || {}
    this.retries = config.retries || 0
  }

  /**
   * Make an API request with standardized response handling
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiClientResponse<T>> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
          ...options.headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const responseData = await response.json()

      // Handle new standardized format
      if (this.isStandardizedResponse(responseData)) {
        if (!responseData.success) {
          throw new ApiError(
            responseData.error?.code || 'UNKNOWN_ERROR',
            responseData.error?.message || 'An error occurred',
            responseData.error?.details,
            response.status
          )
        }
        return responseData
      }

      // Handle legacy format for backward compatibility
      if (response.ok) {
        return {
          data: responseData,
          success: true,
          message: 'Request completed successfully',
          error: null,
          timestamp: new Date().toISOString()
        }
      } else {
        // Legacy error format
        const errorMessage = responseData.error || responseData.message || 'Request failed'
        throw new ApiError(
          responseData.code || 'LEGACY_ERROR',
          errorMessage,
          responseData.details,
          response.status
        )
      }
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof ApiError) {
        throw error
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('TIMEOUT', 'Request timeout', undefined, 408)
        }
        throw new ApiError('NETWORK_ERROR', error.message, undefined, 0)
      }

      throw new ApiError('UNKNOWN_ERROR', 'An unknown error occurred')
    }
  }

  /**
   * Check if response follows the new standardized format
   */
  private isStandardizedResponse(response: any): response is StandardApiResponse {
    return (
      typeof response === 'object' &&
      response !== null &&
      typeof response.success === 'boolean' &&
      'data' in response &&
      'message' in response &&
      'error' in response &&
      'timestamp' in response
    )
  }

  /**
   * GET request
   */
  async get<T>(url: string, params?: Record<string, string>): Promise<ApiClientResponse<T>> {
    const searchParams = params ? new URLSearchParams(params).toString() : ''
    const fullUrl = searchParams ? `${url}?${searchParams}` : url
    
    return this.makeRequest<T>(fullUrl, { method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any): Promise<ApiClientResponse<T>> {
    return this.makeRequest<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any): Promise<ApiClientResponse<T>> {
    return this.makeRequest<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any): Promise<ApiClientResponse<T>> {
    return this.makeRequest<T>(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string): Promise<ApiClientResponse<T>> {
    return this.makeRequest<T>(url, { method: 'DELETE' })
  }

  /**
   * Upload file with form data
   */
  async uploadFile<T>(url: string, file: File, additionalData?: Record<string, string>): Promise<ApiClientResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    return this.makeRequest<T>(url, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    })
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient()

/**
 * Utility function to handle API responses in components
 */
export function handleApiResponse<T>(
  response: ApiClientResponse<T>,
  onSuccess?: (data: T) => void,
  onError?: (error: ApiError) => void
): T | null {
  if (response.success && response.data) {
    onSuccess?.(response.data)
    return response.data
  } else if (response.error) {
    const error = new ApiError(
      response.error.code,
      response.error.message,
      response.error.details
    )
    onError?.(error)
  }
  return null
}

/**
 * React hook for API calls with standardized error handling
 */
export function useApiCall() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const call = async <T>(
    apiCall: () => Promise<ApiClientResponse<T>>,
    onSuccess?: (data: T) => void,
    onError?: (error: ApiError) => void
  ): Promise<T | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiCall()
      const result = handleApiResponse(response, onSuccess, onError)
      return result
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError('UNKNOWN_ERROR', 'An error occurred')
      setError(apiError)
      onError?.(apiError)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { call, loading, error }
}

// Import useState for the hook
import { useState } from 'react'
