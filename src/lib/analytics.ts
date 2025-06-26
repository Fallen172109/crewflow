// Analytics and Usage Tracking Utilities
import { createSupabaseServerClient } from './supabase/server'

export interface UsageMetrics {
  totalRequests: number
  totalCost: number
  averageResponseTime: number
  successRate: number
  mostUsedAgent: string
  agentBreakdown: AgentUsageData[]
  frameworkPerformance: FrameworkPerformance[]
  dailyUsage: DailyUsage[]
  trends: UsageTrends
}

export interface AgentUsageData {
  agentId: string
  agentName: string
  requests: number
  cost: number
  averageResponseTime: number
  successRate: number
  framework: string
  lastUsed: string
}

export interface FrameworkPerformance {
  framework: string
  requests: number
  averageResponseTime: number
  successRate: number
  totalCost: number
}

export interface DailyUsage {
  date: string
  requests: number
  cost: number
  uniqueAgents: number
}

export interface UsageTrends {
  requestsChange: number // percentage change
  costChange: number
  responseTimeChange: number
  successRateChange: number
}

export interface AgentPerformanceMetrics {
  agentId: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  totalCost: number
  lastUsed: Date
  popularActions: string[]
}

// Track agent usage
export async function trackAgentUsage(
  userId: string,
  agentId: string,
  messageType: 'chat' | 'preset_action',
  tokensUsed: number,
  cost: number,
  responseTime: number,
  success: boolean,
  metadata?: any
) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Insert detailed usage record
    const { error: insertError } = await supabase
      .from('agent_usage_detailed')
      .insert({
        user_id: userId,
        agent_id: agentId,
        message_type: messageType,
        tokens_used: tokensUsed,
        cost: cost,
        response_time: responseTime,
        success: success,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error tracking detailed usage:', insertError)
    }

    // Update monthly summary
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const { error: summaryError } = await supabase.rpc('increment_agent_usage', {
      p_user_id: userId,
      p_agent_name: agentId
    })

    if (summaryError) {
      console.error('Error updating usage summary:', summaryError)
    }

    return { success: true }
  } catch (error) {
    console.error('Error in trackAgentUsage:', error)
    return { success: false, error }
  }
}

// Get comprehensive usage analytics
export async function getUserAnalytics(
  userId: string,
  timeRange: '7d' | '30d' | '90d' = '30d'
): Promise<UsageMetrics | null> {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Calculate date range
    const now = new Date()
    const daysBack = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    // Get detailed usage data
    const { data: detailedUsage, error: detailedError } = await supabase
      .from('agent_usage_detailed')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false })

    if (detailedError) {
      console.error('Error fetching detailed usage:', detailedError)
      return null
    }

    // Get monthly summary data
    const { data: monthlyUsage, error: monthlyError } = await supabase
      .from('agent_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())

    if (monthlyError) {
      console.error('Error fetching monthly usage:', monthlyError)
    }

    // Process the data
    return processUsageData(detailedUsage || [], monthlyUsage || [], timeRange)
  } catch (error) {
    console.error('Error in getUserAnalytics:', error)
    // Return empty metrics instead of null
    return {
      totalRequests: 0,
      totalCost: 0,
      averageResponseTime: 0,
      successRate: 0,
      mostUsedAgent: 'None',
      agentBreakdown: [],
      frameworkPerformance: [],
      dailyUsage: [],
      trends: {
        requestsChange: 0,
        costChange: 0,
        responseTimeChange: 0,
        successRateChange: 0
      }
    }
  }
}

// Process raw usage data into analytics
function processUsageData(
  detailedUsage: any[],
  monthlyUsage: any[],
  timeRange: string
): UsageMetrics {
  // Calculate totals
  const totalRequests = detailedUsage.length
  const totalCost = detailedUsage.reduce((sum, record) => sum + (record.cost || 0), 0)
  const successfulRequests = detailedUsage.filter(record => record.success).length
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0
  
  const totalResponseTime = detailedUsage.reduce((sum, record) => sum + (record.response_time || 0), 0)
  const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0

  // Agent breakdown
  const agentStats = detailedUsage.reduce((acc, record) => {
    const agentId = record.agent_id
    if (!acc[agentId]) {
      acc[agentId] = {
        agentId,
        agentName: getAgentName(agentId),
        requests: 0,
        cost: 0,
        responseTime: 0,
        successCount: 0,
        framework: getAgentFramework(agentId),
        lastUsed: record.timestamp
      }
    }
    
    acc[agentId].requests += 1
    acc[agentId].cost += record.cost || 0
    acc[agentId].responseTime += record.response_time || 0
    if (record.success) acc[agentId].successCount += 1
    if (new Date(record.timestamp) > new Date(acc[agentId].lastUsed)) {
      acc[agentId].lastUsed = record.timestamp
    }
    
    return acc
  }, {} as Record<string, any>)

  const agentBreakdown: AgentUsageData[] = Object.values(agentStats).map((agent: any) => ({
    agentId: agent.agentId,
    agentName: agent.agentName,
    requests: agent.requests,
    cost: agent.cost,
    averageResponseTime: agent.requests > 0 ? agent.responseTime / agent.requests : 0,
    successRate: agent.requests > 0 ? (agent.successCount / agent.requests) * 100 : 0,
    framework: agent.framework,
    lastUsed: agent.lastUsed
  })).sort((a, b) => b.requests - a.requests)

  // Most used agent
  const mostUsedAgent = agentBreakdown.length > 0 ? agentBreakdown[0].agentName : 'None'

  // Framework performance
  const frameworkStats = agentBreakdown.reduce((acc, agent) => {
    if (!acc[agent.framework]) {
      acc[agent.framework] = {
        framework: agent.framework,
        requests: 0,
        totalResponseTime: 0,
        totalCost: 0,
        successCount: 0
      }
    }
    
    acc[agent.framework].requests += agent.requests
    acc[agent.framework].totalResponseTime += agent.averageResponseTime * agent.requests
    acc[agent.framework].totalCost += agent.cost
    acc[agent.framework].successCount += (agent.successRate / 100) * agent.requests
    
    return acc
  }, {} as Record<string, any>)

  const frameworkPerformance: FrameworkPerformance[] = Object.values(frameworkStats).map((framework: any) => ({
    framework: framework.framework,
    requests: framework.requests,
    averageResponseTime: framework.requests > 0 ? framework.totalResponseTime / framework.requests : 0,
    successRate: framework.requests > 0 ? (framework.successCount / framework.requests) * 100 : 0,
    totalCost: framework.totalCost
  }))

  // Daily usage (simplified - group by date)
  const dailyStats = detailedUsage.reduce((acc, record) => {
    const date = record.timestamp.split('T')[0]
    if (!acc[date]) {
      acc[date] = { date, requests: 0, cost: 0, agents: new Set() }
    }
    acc[date].requests += 1
    acc[date].cost += record.cost || 0
    acc[date].agents.add(record.agent_id)
    return acc
  }, {} as Record<string, any>)

  const dailyUsage: DailyUsage[] = Object.values(dailyStats).map((day: any) => ({
    date: day.date,
    requests: day.requests,
    cost: day.cost,
    uniqueAgents: day.agents.size
  })).sort((a, b) => a.date.localeCompare(b.date))

  // Mock trends (in production, compare with previous period)
  const trends: UsageTrends = {
    requestsChange: 12,
    costChange: 8,
    responseTimeChange: -5,
    successRateChange: 1.2
  }

  return {
    totalRequests,
    totalCost: Math.round(totalCost * 100) / 100,
    averageResponseTime: Math.round(averageResponseTime * 100) / 100,
    successRate: Math.round(successRate * 10) / 10,
    mostUsedAgent,
    agentBreakdown,
    frameworkPerformance,
    dailyUsage,
    trends
  }
}

// Helper functions
function getAgentName(agentId: string): string {
  const names: Record<string, string> = {
    coral: 'Coral',
    mariner: 'Mariner',
    tide: 'Tide',
    morgan: 'Morgan',
    pearl: 'Pearl',
    splash: 'Splash',
    flint: 'Flint',
    drake: 'Drake',
    sage: 'Sage',
    anchor: 'Anchor',
    beacon: 'Beacon',
    helm: 'Helm',
    ledger: 'Ledger',
    patch: 'Patch'
  }
  return names[agentId] || agentId
}

function getAgentFramework(agentId: string): string {
  const frameworks: Record<string, string> = {
    coral: 'langchain',
    mariner: 'hybrid',
    tide: 'autogen',
    morgan: 'langchain',
    pearl: 'perplexity',
    splash: 'hybrid',
    flint: 'autogen',
    drake: 'hybrid',
    sage: 'langchain',
    anchor: 'hybrid',
    beacon: 'autogen',
    helm: 'langchain',
    ledger: 'langchain',
    patch: 'langchain'
  }
  return frameworks[agentId] || 'langchain'
}
