// Shopify Action Execution API
// Real-time action execution endpoint for immediate Shopify operations

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { ShopifyActionExecutor, ShopifyAction, ActionResult } from '@/lib/ai/shopify-action-executor'
import {
  createSuccessResponse,
  createErrorResponse,
  createAuthErrorResponse,
  withStandardErrorHandling,
  ERROR_CODES,
  HTTP_STATUS
} from '@/lib/api/response-formatter'

interface ActionExecutionRequest {
  action: ShopifyAction
  storeId: string
  confirmed?: boolean
  preview?: boolean
}

interface ActionExecutionResponse {
  success: boolean
  result?: ActionResult
  preview?: any
  error?: string
  maritimeMessage?: string
}

export async function POST(request: NextRequest) {
  return withStandardErrorHandling(
    request,
    async (request: NextRequest) => {
      try {
        // Authenticate user
        const user = await requireAuth()
        
        const body: ActionExecutionRequest = await request.json()
        const { action, storeId, confirmed = false, preview = false } = body

        console.log('⚡ SHOPIFY ACTION EXECUTOR: Request received', {
          actionId: action.id,
          actionType: action.type,
          storeId,
          confirmed,
          preview,
          userId: user.id
        })

        // Validate required fields
        if (!action || !storeId) {
          return createErrorResponse(
            'Action and storeId are required',
            ERROR_CODES.VALIDATION_ERROR,
            HTTP_STATUS.BAD_REQUEST
          )
        }

        // Validate action structure
        if (!action.id || !action.type || !action.action) {
          return createErrorResponse(
            'Invalid action structure. Required fields: id, type, action',
            ERROR_CODES.VALIDATION_ERROR,
            HTTP_STATUS.BAD_REQUEST
          )
        }

        // Initialize action executor
        const executor = new ShopifyActionExecutor()

        if (preview) {
          // Preview mode - show what would happen without executing
          console.log('🔍 SHOPIFY ACTION EXECUTOR: Preview mode')
          
          const previewResult = await executor.previewAction(user.id, storeId, action)
          
          return createSuccessResponse({
            success: true,
            preview: previewResult,
            maritimeMessage: `🔍 **Action Preview** - Here's what would happen if we execute this action.`
          })
        } else {
          // Execute mode - perform the actual action
          console.log('⚡ SHOPIFY ACTION EXECUTOR: Execute mode', { confirmed })
          
          const result = await executor.executeAction(user.id, storeId, action, confirmed)
          
          console.log('⚡ SHOPIFY ACTION EXECUTOR: Action completed', {
            success: result.success,
            actionId: result.actionId,
            hasError: !!result.error
          })

          return createSuccessResponse({
            success: result.success,
            result,
            maritimeMessage: result.maritimeMessage
          })
        }

      } catch (error) {
        console.error('⚡ SHOPIFY ACTION EXECUTOR: Error:', error)
        
        return createErrorResponse(
          `Action execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ERROR_CODES.INTERNAL_ERROR,
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        )
      }
    },
    {
      requireAuth: true,
      rateLimitByUser: true,
      rateLimitByIP: true,
      validateOrigin: true,
      logRequests: true,
      allowedMethods: ['POST']
    }
  )
}

// GET endpoint for action suggestions and capabilities
export async function GET(request: NextRequest) {
  return withStandardErrorHandling(
    request,
    async (request: NextRequest) => {
      try {
        const user = await requireAuth()
        const { searchParams } = new URL(request.url)
        const storeId = searchParams.get('storeId')
        const context = searchParams.get('context')

        if (!storeId) {
          return createErrorResponse(
            'storeId parameter is required',
            ERROR_CODES.VALIDATION_ERROR,
            HTTP_STATUS.BAD_REQUEST
          )
        }

        const executor = new ShopifyActionExecutor()
        const contextData = context ? JSON.parse(context) : {}
        
        const suggestedActions = await executor.getSuggestedActions(
          user.id,
          storeId,
          contextData
        )

        return createSuccessResponse({
          success: true,
          suggestedActions,
          storeId,
          maritimeMessage: '⚓ **Action Suggestions** - Here are some recommended actions for your store.'
        })

      } catch (error) {
        console.error('⚡ SHOPIFY ACTION EXECUTOR: Suggestions error:', error)
        
        return createErrorResponse(
          `Failed to get action suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ERROR_CODES.INTERNAL_ERROR,
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        )
      }
    },
    {
      requireAuth: true,
      rateLimitByUser: true,
      rateLimitByIP: true,
      validateOrigin: true,
      logRequests: true,
      allowedMethods: ['GET']
    }
  )
}
