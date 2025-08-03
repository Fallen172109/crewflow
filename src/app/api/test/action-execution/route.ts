// Test Action Execution Integration
// Test endpoint to verify the ShopifyActionExecutor integration works correctly

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { actionDetector } from '@/lib/ai/action-detection'
import { ShopifyActionExecutor } from '@/lib/ai/shopify-action-executor'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth()
    
    const body = await request.json()
    const { testMessage, storeId } = body

    console.log('🧪 ACTION EXECUTION TEST: Starting test', {
      testMessage: testMessage?.substring(0, 100) + '...',
      storeId,
      userId: user.id
    })

    // Test 1: Action Detection
    const detectionResult = actionDetector.detectActions(testMessage || 'Create a new product called "Test Product" with price $29.99', {
      storeId: storeId || 'test-store-id',
      userId: user.id
    })

    console.log('🧪 ACTION EXECUTION TEST: Detection result', {
      hasActions: detectionResult.hasActions,
      actionsCount: detectionResult.detectedActions.length,
      actions: detectionResult.detectedActions.map(a => ({
        id: a.action.id,
        type: a.action.type,
        confidence: a.confidence,
        requiresConfirmation: a.requiresUserConfirmation
      }))
    })

    // Test 2: Action Executor Initialization
    const executor = new ShopifyActionExecutor()
    
    // Test 3: Get Suggested Actions
    let suggestedActions = []
    if (storeId) {
      try {
        suggestedActions = await executor.getSuggestedActions(user.id, storeId, {
          testMode: true
        })
        console.log('🧪 ACTION EXECUTION TEST: Suggested actions', {
          suggestedCount: suggestedActions.length
        })
      } catch (error) {
        console.log('🧪 ACTION EXECUTION TEST: Suggested actions error (expected in test mode):', error)
      }
    }

    // Test 4: Action Preview (if actions detected)
    let previewResults = []
    if (detectionResult.hasActions && storeId) {
      for (const detectedAction of detectionResult.detectedActions.slice(0, 2)) { // Test first 2 actions
        try {
          const preview = await executor.previewAction(user.id, storeId, detectedAction.action)
          previewResults.push({
            actionId: detectedAction.action.id,
            preview,
            success: true
          })
          console.log('🧪 ACTION EXECUTION TEST: Preview successful', {
            actionId: detectedAction.action.id
          })
        } catch (error) {
          previewResults.push({
            actionId: detectedAction.action.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false
          })
          console.log('🧪 ACTION EXECUTION TEST: Preview error (expected in test mode):', error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      testResults: {
        actionDetection: {
          success: true,
          hasActions: detectionResult.hasActions,
          detectedActions: detectionResult.detectedActions.map(a => ({
            id: a.action.id,
            type: a.action.type,
            action: a.action.action,
            description: a.action.description,
            confidence: a.confidence,
            requiresConfirmation: a.requiresUserConfirmation,
            riskLevel: a.action.riskLevel,
            estimatedTime: a.action.estimatedTime,
            parameters: a.action.parameters
          })),
          originalMessage: detectionResult.originalMessage,
          processedMessage: detectionResult.processedMessage
        },
        actionExecutor: {
          success: true,
          initialized: true,
          suggestedActions: suggestedActions.map(a => ({
            id: a.id,
            type: a.type,
            description: a.description,
            riskLevel: a.riskLevel
          }))
        },
        actionPreviews: previewResults
      },
      message: 'Action execution integration test completed successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('🧪 ACTION EXECUTION TEST: Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Action execution integration test failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    return NextResponse.json({
      success: true,
      message: 'Action Execution Integration Test Endpoint',
      endpoints: {
        'POST /api/test/action-execution': {
          description: 'Test the complete action execution integration',
          parameters: {
            testMessage: 'Message to test action detection (optional)',
            storeId: 'Store ID for testing (optional)'
          },
          example: {
            testMessage: 'Create a new product called "Test Product" with price $29.99 and update inventory to 50 units',
            storeId: 'store_123'
          }
        }
      },
      testScenarios: [
        {
          name: 'Product Creation',
          message: 'Create a new product called "Premium Widget" with price $49.99'
        },
        {
          name: 'Inventory Update',
          message: 'Update inventory for product ID 123 to 100 units'
        },
        {
          name: 'Order Fulfillment',
          message: 'Fulfill order #1001 and ship to customer'
        },
        {
          name: 'Multiple Actions',
          message: 'Create product "Test Item" for $25, update inventory to 50, and fulfill pending orders'
        }
      ],
      integrationComponents: [
        'ActionDetector - Analyzes text for actionable commands',
        'ShopifyActionExecutor - Executes Shopify operations',
        'ActionExecutionPanel - UI component for action management',
        'ShopifyAIChat - Integrated chat with real-time actions'
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('🧪 ACTION EXECUTION TEST: Info error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to get test information'
    }, { status: 500 })
  }
}
