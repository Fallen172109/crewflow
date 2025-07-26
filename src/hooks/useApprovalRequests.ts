'use client'

import { useState, useEffect, useCallback } from 'react'

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
  estimatedImpact: {
    affectedItems: number
    estimatedCost?: number
    reversible: boolean
    description: string
  }
  context: any
}

interface UseApprovalRequestsOptions {
  agentId?: string
  status?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useApprovalRequests(options: UseApprovalRequestsOptions = {}) {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const {
    agentId,
    status = 'pending',
    autoRefresh = true,
    refreshInterval = 30000 // 30 seconds
  } = options

  const fetchApprovals = useCallback(async () => {
    try {
      setError(null)
      
      const params = new URLSearchParams({
        status,
        limit: '20'
      })
      
      if (agentId) {
        params.append('agentId', agentId)
      }

      const response = await fetch(`/api/agents/approvals?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch approvals: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      // Transform date strings back to Date objects
      const transformedApprovals = data.approvals.map((approval: any) => ({
        ...approval,
        requestedAt: new Date(approval.requestedAt),
        expiresAt: new Date(approval.expiresAt)
      }))

      setApprovals(transformedApprovals)
    } catch (err) {
      console.error('Error fetching approvals:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch approvals')
    } finally {
      setLoading(false)
    }
  }, [agentId, status])

  const respondToApproval = useCallback(async (
    requestId: string,
    approved: boolean,
    reason?: string,
    modifiedParams?: any
  ) => {
    try {
      setProcessingIds(prev => new Set(prev).add(requestId))
      setError(null)

      const response = await fetch(`/api/agents/approvals/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approved,
          reason,
          modifiedParams
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to respond to approval: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to process approval response')
      }

      // Update the approval in local state
      setApprovals(prev => prev.map(approval => 
        approval.id === requestId 
          ? { 
              ...approval, 
              status: approved ? 'approved' : 'rejected'
            }
          : approval
      ))

      // Remove from processing set
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })

      return data
    } catch (err) {
      console.error('Error responding to approval:', err)
      setError(err instanceof Error ? err.message : 'Failed to respond to approval')
      
      // Remove from processing set on error
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
      
      throw err
    }
  }, [])

  const approveRequest = useCallback((requestId: string, reason?: string, modifiedParams?: any) => {
    return respondToApproval(requestId, true, reason, modifiedParams)
  }, [respondToApproval])

  const rejectRequest = useCallback((requestId: string, reason: string) => {
    return respondToApproval(requestId, false, reason)
  }, [respondToApproval])

  const cancelRequest = useCallback(async (requestId: string) => {
    try {
      setProcessingIds(prev => new Set(prev).add(requestId))
      setError(null)

      const response = await fetch(`/api/agents/approvals?id=${requestId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to cancel approval: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel approval')
      }

      // Remove from local state
      setApprovals(prev => prev.filter(approval => approval.id !== requestId))

      // Remove from processing set
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })

      return data
    } catch (err) {
      console.error('Error cancelling approval:', err)
      setError(err instanceof Error ? err.message : 'Failed to cancel approval')
      
      // Remove from processing set on error
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
      
      throw err
    }
  }, [])

  const refresh = useCallback(() => {
    setLoading(true)
    fetchApprovals()
  }, [fetchApprovals])

  // Initial fetch
  useEffect(() => {
    fetchApprovals()
  }, [fetchApprovals])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchApprovals, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchApprovals])

  // Filter out expired approvals
  const activeApprovals = approvals.filter(approval => {
    const now = new Date()
    return approval.expiresAt > now && approval.status === 'pending'
  })

  return {
    approvals: activeApprovals,
    allApprovals: approvals,
    loading,
    error,
    processingIds,
    fetchApprovals,
    respondToApproval,
    approveRequest,
    rejectRequest,
    cancelRequest,
    refresh,
    hasActiveApprovals: activeApprovals.length > 0
  }
}
