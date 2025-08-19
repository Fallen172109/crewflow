// AI Action Detection
// Analyzes AI responses to detect and extract actionable Shopify commands

import { ShopifyAction } from './shopify-action-executor'

export interface DetectedAction {
  action: ShopifyAction
  confidence: number
  extractedFromText: string
  requiresUserConfirmation: boolean
}

export interface ActionDetectionResult {
  hasActions: boolean
  detectedActions: DetectedAction[]
  originalMessage: string
  processedMessage: string
}

// Action patterns that indicate executable commands
const ACTION_PATTERNS = {
  // Product actions
  product_create: [
    /create\s+(?:a\s+)?(?:new\s+)?product/i,
    /add\s+(?:a\s+)?(?:new\s+)?product/i,
    /make\s+(?:a\s+)?(?:new\s+)?product/i
  ],
  product_update: [
    /update\s+product/i,
    /modify\s+product/i,
    /change\s+product/i,
    /edit\s+product/i
  ],
  product_delete: [
    /delete\s+product/i,
    /remove\s+product/i,
    /archive\s+product/i
  ],
  
  // Inventory actions
  inventory_update: [
    /update\s+inventory/i,
    /adjust\s+inventory/i,
    /change\s+stock/i,
    /set\s+quantity/i,
    /restock/i
  ],
  inventory_bulk_update: [
    /bulk\s+update\s+inventory/i,
    /update\s+all\s+inventory/i,
    /mass\s+inventory\s+update/i
  ],
  
  // Order actions
  order_fulfill: [
    /fulfill\s+order/i,
    /ship\s+order/i,
    /process\s+order/i,
    /complete\s+order/i
  ],
  order_cancel: [
    /cancel\s+order/i,
    /void\s+order/i,
    /refund\s+order/i
  ],
  
  // Customer actions
  customer_create: [
    /create\s+customer/i,
    /add\s+customer/i,
    /new\s+customer/i
  ],
  customer_update: [
    /update\s+customer/i,
    /modify\s+customer/i,
    /change\s+customer/i
  ]
}

// High-risk actions that always require confirmation
const HIGH_RISK_ACTIONS = [
  'product_delete',
  'order_cancel',
  'inventory_bulk_update',
  'customer_delete',
  'product_create'  // Require confirmation for product creation to enable preview flow
]

// Parameter extraction patterns
const PARAMETER_PATTERNS = {
  productId: /product\s+(?:id\s+)?(\d+)/i,
  orderId: /order\s+(?:id\s+)?(\d+)/i,
  customerId: /customer\s+(?:id\s+)?(\d+)/i,
  quantity: /(?:quantity|stock|amount)\s+(?:to\s+)?(\d+)/i,
  price: /(?:price|cost)\s+(?:to\s+)?\$?(\d+(?:\.\d{2})?)/i,
  // More flexible title patterns
  title: /(?:title|name|named|called)\s+["']([^"']+)["']/i,
  // Alternative title pattern without quotes
  titleAlt: /(?:product|item)\s+(?:named|called)\s+([^,\n]+?)(?:\s+(?:price|cost|for))/i,
  description: /(?:description|desc)\s+["']([^"']+)["']/i
}

export class ActionDetector {
  /**
   * Analyze AI response text to detect actionable commands
   */
  detectActions(message: string, context?: any): ActionDetectionResult {
    console.log('🔍 ACTION DETECTOR: Analyzing message for actions', {
      messageLength: message.length,
      hasContext: !!context
    })

    const detectedActions: DetectedAction[] = []
    let processedMessage = message

    // Check each action pattern
    for (const [actionKey, patterns] of Object.entries(ACTION_PATTERNS)) {
      for (const pattern of patterns) {
        const match = message.match(pattern)
        if (match) {
          const action = this.createActionFromMatch(actionKey, match, message, context)
          if (action) {
            detectedActions.push({
              action,
              confidence: this.calculateConfidence(actionKey, match, message),
              extractedFromText: match[0],
              requiresUserConfirmation: this.requiresConfirmation(actionKey, action)
            })
            
            console.log('🎯 ACTION DETECTOR: Action detected', {
              actionType: actionKey,
              actionId: action.id,
              confidence: this.calculateConfidence(actionKey, match, message)
            })
          }
        }
      }
    }

    // Remove duplicate actions (same type and similar parameters)
    const uniqueActions = this.deduplicateActions(detectedActions)

    return {
      hasActions: uniqueActions.length > 0,
      detectedActions: uniqueActions,
      originalMessage: message,
      processedMessage
    }
  }

  /**
   * Create a ShopifyAction from a pattern match
   */
  private createActionFromMatch(
    actionKey: string,
    match: RegExpMatchArray,
    fullMessage: string,
    context?: any
  ): ShopifyAction | null {
    const [actionType, actionName] = actionKey.split('_')
    const actionId = `detected-${actionKey}-${Date.now()}`

    // Extract parameters from the message
    const parameters = this.extractParameters(fullMessage, actionType)

    // Add context parameters if available
    if (context?.storeId) {
      parameters.storeId = context.storeId
    }

    const action: ShopifyAction = {
      id: actionId,
      type: actionType as any,
      action: actionName,
      description: this.generateActionDescription(actionKey, parameters),
      parameters,
      requiresConfirmation: HIGH_RISK_ACTIONS.includes(actionKey),
      estimatedTime: this.estimateActionTime(actionKey),
      riskLevel: this.assessRiskLevel(actionKey)
    }

    return action
  }

  /**
   * Extract parameters from message text
   */
  private extractParameters(message: string, actionType: string): Record<string, any> {
    const parameters: Record<string, any> = {}

    // Extract common parameters
    for (const [paramName, pattern] of Object.entries(PARAMETER_PATTERNS)) {
      const match = message.match(pattern)
      if (match && match[1]) {
        parameters[paramName] = match[1].trim()
      }
    }

    // Try alternative title pattern if title not found
    if (!parameters.title && PARAMETER_PATTERNS.titleAlt) {
      const altMatch = message.match(PARAMETER_PATTERNS.titleAlt)
      if (altMatch && altMatch[1]) {
        parameters.title = altMatch[1].trim()
      }
    }

    // Type-specific parameter extraction
    switch (actionType) {
      case 'product':
        // Extract product-specific parameters
        if (!parameters.title) {
          // Try to extract product name from context
          const productMatch = message.match(/(?:product|item)\s+["']?([^"'\n]+)["']?/i)
          if (productMatch) {
            parameters.title = productMatch[1].trim()
          }
        }
        break
        
      case 'inventory':
        // Extract inventory-specific parameters
        if (!parameters.quantity) {
          const qtyMatch = message.match(/(\d+)\s+(?:units?|pieces?|items?)/i)
          if (qtyMatch) {
            parameters.quantity = parseInt(qtyMatch[1])
          }
        }
        break
    }

    return parameters
  }

  /**
   * Calculate confidence score for detected action
   */
  private calculateConfidence(actionKey: string, match: RegExpMatchArray, message: string): number {
    let confidence = 0.7 // Base confidence

    // Increase confidence for exact matches
    if (match[0].toLowerCase().includes(actionKey.split('_')[1])) {
      confidence += 0.2
    }

    // Increase confidence if parameters are present
    const paramCount = Object.keys(this.extractParameters(message, actionKey.split('_')[0])).length
    confidence += Math.min(paramCount * 0.05, 0.2)

    // Decrease confidence for ambiguous context
    if (message.includes('maybe') || message.includes('perhaps') || message.includes('might')) {
      confidence -= 0.3
    }

    return Math.min(Math.max(confidence, 0.1), 1.0)
  }

  /**
   * Check if action requires user confirmation
   */
  private requiresConfirmation(actionKey: string, action: ShopifyAction): boolean {
    // High-risk actions always require confirmation
    if (HIGH_RISK_ACTIONS.includes(actionKey)) {
      return true
    }

    // Actions affecting multiple items require confirmation
    if (action.parameters.bulk || action.parameters.all) {
      return true
    }

    // Actions with high monetary impact require confirmation
    if (action.parameters.price && parseFloat(action.parameters.price) > 100) {
      return true
    }

    return action.requiresConfirmation
  }

  /**
   * Generate human-readable action description
   */
  private generateActionDescription(actionKey: string, parameters: Record<string, any>): string {
    const [actionType, actionName] = actionKey.split('_')
    
    switch (actionKey) {
      case 'product_create':
        return `Create new product${parameters.title ? ` "${parameters.title}"` : ''}`
      case 'product_update':
        return `Update product${parameters.productId ? ` #${parameters.productId}` : ''}`
      case 'inventory_update':
        return `Update inventory${parameters.quantity ? ` to ${parameters.quantity} units` : ''}`
      case 'order_fulfill':
        return `Fulfill order${parameters.orderId ? ` #${parameters.orderId}` : ''}`
      default:
        return `${actionName.charAt(0).toUpperCase() + actionName.slice(1)} ${actionType}`
    }
  }

  /**
   * Estimate action execution time
   */
  private estimateActionTime(actionKey: string): string {
    const timeEstimates: Record<string, string> = {
      product_create: '2-3 minutes',
      product_update: '1-2 minutes',
      product_delete: '30 seconds',
      inventory_update: '1 minute',
      inventory_bulk_update: '5-10 minutes',
      order_fulfill: '2-3 minutes',
      order_cancel: '1-2 minutes',
      customer_create: '1 minute',
      customer_update: '1 minute'
    }

    return timeEstimates[actionKey] || '1-2 minutes'
  }

  /**
   * Assess risk level of action
   */
  private assessRiskLevel(actionKey: string): 'low' | 'medium' | 'high' {
    if (HIGH_RISK_ACTIONS.includes(actionKey)) {
      return 'high'
    }

    const mediumRiskActions = ['product_update', 'inventory_bulk_update', 'order_fulfill']
    if (mediumRiskActions.includes(actionKey)) {
      return 'medium'
    }

    return 'low'
  }

  /**
   * Remove duplicate actions
   */
  private deduplicateActions(actions: DetectedAction[]): DetectedAction[] {
    const seen = new Set<string>()
    return actions.filter(detectedAction => {
      const key = `${detectedAction.action.type}-${detectedAction.action.action}-${JSON.stringify(detectedAction.action.parameters)}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }
}

// Export singleton instance
export const actionDetector = new ActionDetector()
