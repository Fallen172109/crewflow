/**
 * Tests for the standardized API response formatter
 */

import { NextResponse } from 'next/server'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createAuthErrorResponse,
  createAuthorizationErrorResponse,
  createNotFoundErrorResponse,
  createRateLimitErrorResponse,
  createServerErrorResponse,
  ERROR_CODES,
  HTTP_STATUS
} from '../response-formatter'

describe('Response Formatter', () => {
  describe('createSuccessResponse', () => {
    it('should create a standardized success response', async () => {
      const data = { id: 1, name: 'Test' }
      const message = 'Operation successful'
      
      const response = createSuccessResponse(data, message)
      const json = await response.json()
      
      expect(json).toEqual({
        success: true,
        data,
        message,
        error: null,
        timestamp: expect.any(String)
      })
      expect(response.status).toBe(200)
    })

    it('should use default message when not provided', async () => {
      const data = { test: true }
      
      const response = createSuccessResponse(data)
      const json = await response.json()
      
      expect(json.message).toBe('Request completed successfully')
    })

    it('should accept custom status code', async () => {
      const data = { created: true }
      
      const response = createSuccessResponse(data, 'Created', { status: 201 })
      
      expect(response.status).toBe(201)
    })
  })

  describe('createErrorResponse', () => {
    it('should create a standardized error response', async () => {
      const code = ERROR_CODES.VALIDATION_ERROR
      const message = 'Validation failed'
      const details = { field: 'email' }
      
      const response = createErrorResponse(code, message, details)
      const json = await response.json()
      
      expect(json).toEqual({
        success: false,
        data: null,
        message: 'Request failed',
        error: {
          code,
          message,
          details
        },
        timestamp: expect.any(String)
      })
      expect(response.status).toBe(500)
    })

    it('should accept custom status code', async () => {
      const response = createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        'Resource not found',
        undefined,
        { status: HTTP_STATUS.NOT_FOUND }
      )
      
      expect(response.status).toBe(404)
    })

    it('should include stack trace in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const error = new Error('Test error')
      const response = createErrorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Server error',
        error,
        { includeStack: true }
      )
      const json = await response.json()
      
      expect(json.error.stack).toBeDefined()
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('createValidationErrorResponse', () => {
    it('should create a validation error response', async () => {
      const errors = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password too short' }
      ]
      
      const response = createValidationErrorResponse(errors)
      const json = await response.json()
      
      expect(json).toEqual({
        success: false,
        data: null,
        message: 'Request validation failed',
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          details: errors
        },
        timestamp: expect.any(String)
      })
      expect(response.status).toBe(400)
    })
  })

  describe('createAuthErrorResponse', () => {
    it('should create an authentication error response', async () => {
      const response = createAuthErrorResponse()
      const json = await response.json()
      
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ERROR_CODES.AUTH_ERROR)
      expect(json.error.message).toBe('Authentication required')
      expect(response.status).toBe(401)
    })

    it('should accept custom message', async () => {
      const customMessage = 'Invalid credentials'
      const response = createAuthErrorResponse(customMessage)
      const json = await response.json()
      
      expect(json.error.message).toBe(customMessage)
    })
  })

  describe('createAuthorizationErrorResponse', () => {
    it('should create an authorization error response', async () => {
      const response = createAuthorizationErrorResponse()
      const json = await response.json()
      
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ERROR_CODES.AUTHORIZATION_ERROR)
      expect(json.error.message).toBe('Insufficient permissions')
      expect(response.status).toBe(403)
    })
  })

  describe('createNotFoundErrorResponse', () => {
    it('should create a not found error response', async () => {
      const resource = 'User'
      const response = createNotFoundErrorResponse(resource)
      const json = await response.json()
      
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ERROR_CODES.NOT_FOUND)
      expect(json.error.message).toBe('User not found')
      expect(response.status).toBe(404)
    })
  })

  describe('createRateLimitErrorResponse', () => {
    it('should create a rate limit error response', async () => {
      const response = createRateLimitErrorResponse()
      const json = await response.json()
      
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED)
      expect(json.error.message).toBe('Rate limit exceeded')
      expect(response.status).toBe(429)
    })
  })

  describe('createServerErrorResponse', () => {
    it('should create a server error response', async () => {
      const error = new Error('Database connection failed')
      const response = createServerErrorResponse('Database error', error)
      const json = await response.json()
      
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR)
      expect(json.error.message).toBe('Database error')
      expect(response.status).toBe(500)
    })
  })

  describe('Response structure validation', () => {
    it('should always include required fields', async () => {
      const response = createSuccessResponse({ test: true })
      const json = await response.json()
      
      expect(json).toHaveProperty('success')
      expect(json).toHaveProperty('data')
      expect(json).toHaveProperty('message')
      expect(json).toHaveProperty('error')
      expect(json).toHaveProperty('timestamp')
      
      expect(typeof json.success).toBe('boolean')
      expect(typeof json.message).toBe('string')
      expect(typeof json.timestamp).toBe('string')
      
      // Validate timestamp format (ISO 8601)
      expect(new Date(json.timestamp).toISOString()).toBe(json.timestamp)
    })

    it('should have consistent error structure', async () => {
      const response = createErrorResponse(ERROR_CODES.VALIDATION_ERROR, 'Test error')
      const json = await response.json()
      
      expect(json.success).toBe(false)
      expect(json.data).toBe(null)
      expect(json.error).toHaveProperty('code')
      expect(json.error).toHaveProperty('message')
      expect(typeof json.error.code).toBe('string')
      expect(typeof json.error.message).toBe('string')
    })
  })
})
