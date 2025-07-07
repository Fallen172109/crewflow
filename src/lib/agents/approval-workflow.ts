// Approval Workflow System
// Handles high-risk actions that require user approval before execution

import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface ApprovalRequest {
  id: string
  userId: string
  agentId: string
  integrationId: string
  actionType: string
  actionDescription: string
  actionData: any
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requestedAt: Date
  expiresAt: Date
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'executed'
  approvedAt?: Date
  rejectedAt?: Date
  executedAt?: Date
  rejectionReason?: string
  estimatedImpact: {
    affectedItems: number
    estimatedCost?: number
    reversible: boolean
    description: string
  }
  context: {
    triggerEvent?: string
    relatedData?: any
    userLocation?: string
    deviceInfo?: string
  }
}

export interface ApprovalResponse {
  approved: boolean
  reason?: string
  conditions?: string[]
  modifiedParams?: any
}

// Create a new approval request
export async function createApprovalRequest(
  userId: string,
  agentId: string,
  integrationId: string,
  actionType: string,
  actionData: any,
  context?: any
): Promise<ApprovalRequest> {
  const supabase = createSupabaseServerClient()
  
  // Calculate risk level and impact
  const riskAssessment = assessActionRisk(actionType, actionData)
  const impact = estimateActionImpact(actionType, actionData)
  
  // Set expiration time based on risk level
  const expirationHours = getExpirationHours(riskAssessment.riskLevel)
  const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000)
  
  const approvalRequest: ApprovalRequest = {
    id: crypto.randomUUID(),
    userId,
    agentId,
    integrationId,
    actionType,
    actionDescription: generateActionDescription(actionType, actionData),
    actionData,
    riskLevel: riskAssessment.riskLevel,
    requestedAt: new Date(),
    expiresAt,
    status: 'pending',
    estimatedImpact: impact,
    context: context || {}
  }
  
  // Store in database
  const { error } = await supabase.from('approval_requests').insert({
    id: approvalRequest.id,
    user_id: userId,
    agent_id: agentId,
    integration_id: integrationId,
    action_type: actionType,
    action_description: approvalRequest.actionDescription,
    action_data: actionData,
    risk_level: riskAssessment.riskLevel,
    requested_at: approvalRequest.requestedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'pending',
    estimated_impact: impact,
    context: context || {},
    risk_factors: riskAssessment.factors
  })
  
  if (error) {
    throw new Error(`Failed to create approval request: ${error.message}`)
  }
  
  // Send notification to user
  await sendApprovalNotification(approvalRequest)
  
  return approvalRequest
}

// Process approval response
export async function processApprovalResponse(
  requestId: string,
  userId: string,
  response: ApprovalResponse
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient()
  
  try {
    // Get the approval request
    const { data: request, error: fetchError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', userId)
      .single()
    
    if (fetchError || !request) {
      return { success: false, error: 'Approval request not found' }
    }
    
    if (request.status !== 'pending') {
      return { success: false, error: 'Approval request is no longer pending' }
    }
    
    // Check if expired
    if (new Date() > new Date(request.expires_at)) {
      await supabase
        .from('approval_requests')
        .update({ status: 'expired' })
        .eq('id', requestId)
      
      return { success: false, error: 'Approval request has expired' }
    }
    
    // Update request status
    const updateData: any = {
      status: response.approved ? 'approved' : 'rejected',
      response_reason: response.reason,
      response_conditions: response.conditions,
      modified_params: response.modifiedParams
    }
    
    if (response.approved) {
      updateData.approved_at = new Date().toISOString()
    } else {
      updateData.rejected_at = new Date().toISOString()
    }
    
    const { error: updateError } = await supabase
      .from('approval_requests')
      .update(updateData)
      .eq('id', requestId)
    
    if (updateError) {
      return { success: false, error: 'Failed to update approval request' }
    }
    
    // If approved, execute the action
    if (response.approved) {
      await executeApprovedAction(request, response)
    }
    
    // Log the approval decision
    await supabase.from('agent_actions').insert({
      user_id: userId,
      agent_id: request.agent_id,
      integration_id: request.integration_id,
      action_type: 'approval_decision',
      action_description: `${response.approved ? 'Approved' : 'Rejected'} ${request.action_type}`,
      status: 'completed',
      metadata: {
        approval_request_id: requestId,
        decision: response.approved ? 'approved' : 'rejected',
        reason: response.reason,
        conditions: response.conditions
      }
    })
    
    return { success: true }
  } catch (error) {
    console.error('Error processing approval response:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Get pending approval requests for a user
export async function getPendingApprovals(userId: string): Promise<ApprovalRequest[]> {
  const supabase = createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('requested_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching pending approvals:', error)
    return []
  }
  
  return (data || []).map(record => ({
    id: record.id,
    userId: record.user_id,
    agentId: record.agent_id,
    integrationId: record.integration_id,
    actionType: record.action_type,
    actionDescription: record.action_description,
    actionData: record.action_data,
    riskLevel: record.risk_level,
    requestedAt: new Date(record.requested_at),
    expiresAt: new Date(record.expires_at),
    status: record.status,
    estimatedImpact: record.estimated_impact,
    context: record.context || {}
  }))
}

// Get approval history for a user
export async function getApprovalHistory(
  userId: string, 
  limit: number = 50
): Promise<ApprovalRequest[]> {
  const supabase = createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['approved', 'rejected', 'expired', 'executed'])
    .order('requested_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching approval history:', error)
    return []
  }
  
  return (data || []).map(record => ({
    id: record.id,
    userId: record.user_id,
    agentId: record.agent_id,
    integrationId: record.integration_id,
    actionType: record.action_type,
    actionDescription: record.action_description,
    actionData: record.action_data,
    riskLevel: record.risk_level,
    requestedAt: new Date(record.requested_at),
    expiresAt: new Date(record.expires_at),
    status: record.status,
    approvedAt: record.approved_at ? new Date(record.approved_at) : undefined,
    rejectedAt: record.rejected_at ? new Date(record.rejected_at) : undefined,
    executedAt: record.executed_at ? new Date(record.executed_at) : undefined,
    rejectionReason: record.response_reason,
    estimatedImpact: record.estimated_impact,
    context: record.context || {}
  }))
}

// Assess the risk level of an action
function assessActionRisk(actionType: string, actionData: any): { 
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  factors: string[]
} {
  const factors: string[] = []
  let riskScore = 0
  
  // Base risk by action type
  const actionRisks: Record<string, number> = {
    'product_create': 2,
    'product_update': 1,
    'price_update': 4,
    'inventory_update': 1,
    'order_fulfill': 2,
    'bulk_operations': 5,
    'customer_create': 1,
    'marketing_campaign': 3,
    'discount_create': 3,
    'webhook_create': 2
  }
  
  riskScore += actionRisks[actionType] || 3
  
  // Additional risk factors
  if (actionData.bulk || actionData.quantity > 10) {
    riskScore += 2
    factors.push('Bulk operation')
  }
  
  if (actionData.price_change && Math.abs(actionData.price_change) > 20) {
    riskScore += 3
    factors.push('Significant price change')
  }
  
  if (actionData.irreversible) {
    riskScore += 2
    factors.push('Irreversible action')
  }
  
  if (actionData.financial_impact && actionData.financial_impact > 1000) {
    riskScore += 3
    factors.push('High financial impact')
  }
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical'
  if (riskScore <= 2) riskLevel = 'low'
  else if (riskScore <= 4) riskLevel = 'medium'
  else if (riskScore <= 6) riskLevel = 'high'
  else riskLevel = 'critical'
  
  return { riskLevel, factors }
}

// Estimate the impact of an action
function estimateActionImpact(actionType: string, actionData: any) {
  let affectedItems = 1
  let estimatedCost = 0
  let reversible = true
  let description = ''
  
  switch (actionType) {
    case 'price_update':
      affectedItems = actionData.product_ids?.length || 1
      estimatedCost = actionData.revenue_impact || 0
      reversible = true
      description = `Update pricing for ${affectedItems} product(s)`
      break
      
    case 'bulk_operations':
      affectedItems = actionData.item_count || actionData.items?.length || 0
      reversible = actionData.reversible !== false
      description = `Bulk operation affecting ${affectedItems} items`
      break
      
    case 'marketing_campaign':
      estimatedCost = actionData.budget || 0
      reversible = false
      description = `Launch marketing campaign with $${estimatedCost} budget`
      break
      
    case 'inventory_update':
      affectedItems = actionData.variants?.length || 1
      reversible = true
      description = `Update inventory for ${affectedItems} variant(s)`
      break
      
    default:
      description = `Execute ${actionType.replace('_', ' ')}`
  }
  
  return {
    affectedItems,
    estimatedCost,
    reversible,
    description
  }
}

// Generate human-readable action description
function generateActionDescription(actionType: string, actionData: any): string {
  switch (actionType) {
    case 'price_update':
      return `Update product pricing (${actionData.product_count || 1} products)`
    case 'bulk_operations':
      return `Perform bulk operation on ${actionData.item_count || 'multiple'} items`
    case 'marketing_campaign':
      return `Launch marketing campaign: ${actionData.campaign_name || 'Untitled'}`
    case 'inventory_update':
      return `Update inventory levels for ${actionData.product_title || 'product'}`
    case 'order_fulfill':
      return `Fulfill order ${actionData.order_number || actionData.order_id}`
    default:
      return `Execute ${actionType.replace('_', ' ')}`
  }
}

// Get expiration hours based on risk level
function getExpirationHours(riskLevel: string): number {
  switch (riskLevel) {
    case 'low': return 24
    case 'medium': return 12
    case 'high': return 4
    case 'critical': return 1
    default: return 12
  }
}

// Send approval notification to user
async function sendApprovalNotification(request: ApprovalRequest): Promise<void> {
  // TODO: Implement actual notification sending (email, SMS, push)
  console.log(`Approval notification sent for ${request.actionType} to user ${request.userId}`)
}

// Execute approved action
async function executeApprovedAction(
  request: any, 
  response: ApprovalResponse
): Promise<void> {
  const supabase = createSupabaseServerClient()
  
  try {
    // Use modified parameters if provided
    const actionData = response.modifiedParams || request.action_data
    
    // TODO: Implement actual action execution based on integration and action type
    // This would call the appropriate service (Shopify API, etc.)
    
    console.log(`Executing approved action: ${request.action_type}`, actionData)
    
    // Mark as executed
    await supabase
      .from('approval_requests')
      .update({ 
        status: 'executed',
        executed_at: new Date().toISOString()
      })
      .eq('id', request.id)
    
    // Log execution
    await supabase.from('agent_actions').insert({
      user_id: request.user_id,
      agent_id: request.agent_id,
      integration_id: request.integration_id,
      action_type: request.action_type,
      action_description: `Executed approved action: ${request.action_description}`,
      status: 'completed',
      metadata: {
        approval_request_id: request.id,
        original_data: request.action_data,
        modified_data: response.modifiedParams,
        conditions: response.conditions
      }
    })
    
  } catch (error) {
    console.error('Error executing approved action:', error)
    
    // Mark as failed
    await supabase
      .from('approval_requests')
      .update({ 
        status: 'failed',
        execution_error: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', request.id)
  }
}

// Clean up expired approval requests
export async function cleanupExpiredApprovals(): Promise<void> {
  const supabase = createSupabaseServerClient()
  
  const { error } = await supabase
    .from('approval_requests')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
  
  if (error) {
    console.error('Error cleaning up expired approvals:', error)
  }
}

// Get approval statistics for a user
export async function getApprovalStats(userId: string): Promise<{
  pending: number
  approved: number
  rejected: number
  expired: number
  averageResponseTime: number
}> {
  const supabase = createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('approval_requests')
    .select('status, requested_at, approved_at, rejected_at')
    .eq('user_id', userId)
    .gte('requested_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
  
  if (error) {
    console.error('Error fetching approval stats:', error)
    return { pending: 0, approved: 0, rejected: 0, expired: 0, averageResponseTime: 0 }
  }
  
  const stats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    averageResponseTime: 0
  }
  
  let totalResponseTime = 0
  let responseCount = 0
  
  for (const record of data || []) {
    stats[record.status as keyof typeof stats]++
    
    if (record.approved_at || record.rejected_at) {
      const requestTime = new Date(record.requested_at).getTime()
      const responseTime = new Date(record.approved_at || record.rejected_at).getTime()
      totalResponseTime += responseTime - requestTime
      responseCount++
    }
  }
  
  if (responseCount > 0) {
    stats.averageResponseTime = totalResponseTime / responseCount / (1000 * 60 * 60) // Convert to hours
  }
  
  return stats
}
