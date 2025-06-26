// Usage Analytics API Functions for Admin Dashboard
import { createSupabaseServerClient, createSupabaseAdminClient } from './supabase'
import { calculateTokenCost, getCostBreakdownByProvider, formatCost } from './ai-cost-calculator'

export interface UsageAnalyticsFilters {
  startDate?: string
  endDate?: string
  userId?: string
  agentId?: string
  framework?: string
  provider?: string
  messageType?: string
}

export interface UsageRecord {
  id: string
  timestamp: string
  user_id: string
  user_email: string
  agent_id: string
  agent_name: string
  framework: string
  provider: string
  message_type: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: number
  response_time_ms: number
  success: boolean
  error_message?: string
  request_metadata: any
}

export interface UsageSummary {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  totalTokens: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  averageResponseTimeMs: number
  successRate: number
  costByProvider: Record<string, number>
  usageByAgent: Record<string, number>
  usageByFramework: Record<string, number>
  topUsersByUsage: Array<{
    userId: string
    userEmail: string
    requests: number
    tokens: number
    cost: number
  }>
  dailyUsage: Array<{
    date: string
    requests: number
    tokens: number
    cost: number
  }>
}

// Get detailed usage records with filtering
export async function getUsageRecords(
  filters: UsageAnalyticsFilters = {},
  limit: number = 1000,
  offset: number = 0
): Promise<{ records: UsageRecord[], totalCount: number }> {
  const supabase = createSupabaseAdminClient()

  try {
    // Build the query
    let query = supabase
      .from('agent_usage_detailed')
      .select(`
        *,
        users!inner(email)
      `, { count: 'exact' })
      .order('timestamp', { ascending: false })

    // Apply filters
    if (filters.startDate) {
      query = query.gte('timestamp', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('timestamp', filters.endDate)
    }
    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }
    if (filters.agentId) {
      query = query.eq('agent_id', filters.agentId)
    }
    if (filters.framework) {
      query = query.eq('framework', filters.framework)
    }
    if (filters.provider) {
      query = query.eq('provider', filters.provider)
    }
    if (filters.messageType) {
      query = query.eq('message_type', filters.messageType)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching usage records:', error)
      throw error
    }

    // Transform the data
    const records: UsageRecord[] = (data || []).map(record => ({
      id: record.id,
      timestamp: record.timestamp,
      user_id: record.user_id,
      user_email: record.users?.email || 'Unknown',
      agent_id: record.agent_id,
      agent_name: record.agent_name,
      framework: record.framework,
      provider: record.provider,
      message_type: record.message_type,
      input_tokens: record.input_tokens,
      output_tokens: record.output_tokens,
      total_tokens: record.total_tokens,
      cost_usd: record.cost_usd,
      response_time_ms: record.response_time_ms,
      success: record.success,
      error_message: record.error_message,
      request_metadata: record.request_metadata
    }))

    return {
      records,
      totalCount: count || 0
    }
  } catch (error) {
    console.error('Error in getUsageRecords:', error)
    throw error
  }
}

// Get usage summary with aggregated metrics
export async function getUsageSummary(
  filters: UsageAnalyticsFilters = {}
): Promise<UsageSummary> {
  const supabase = createSupabaseAdminClient()

  try {
    // Build the query for detailed records
    let query = supabase
      .from('agent_usage_detailed')
      .select(`
        *,
        users!inner(email)
      `)

    // Apply filters
    if (filters.startDate) {
      query = query.gte('timestamp', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('timestamp', filters.endDate)
    }
    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }
    if (filters.agentId) {
      query = query.eq('agent_id', filters.agentId)
    }
    if (filters.framework) {
      query = query.eq('framework', filters.framework)
    }
    if (filters.provider) {
      query = query.eq('provider', filters.provider)
    }
    if (filters.messageType) {
      query = query.eq('message_type', filters.messageType)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching usage summary:', error)
      throw error
    }

    const records = data || []

    // Calculate aggregated metrics
    const totalRequests = records.length
    const successfulRequests = records.filter(r => r.success).length
    const failedRequests = totalRequests - successfulRequests
    const totalTokens = records.reduce((sum, r) => sum + (r.total_tokens || 0), 0)
    const totalInputTokens = records.reduce((sum, r) => sum + (r.input_tokens || 0), 0)
    const totalOutputTokens = records.reduce((sum, r) => sum + (r.output_tokens || 0), 0)
    const totalCostUsd = records.reduce((sum, r) => sum + (r.cost_usd || 0), 0)
    const totalResponseTime = records.reduce((sum, r) => sum + (r.response_time_ms || 0), 0)
    const averageResponseTimeMs = totalRequests > 0 ? totalResponseTime / totalRequests : 0
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0

    // Cost by provider
    const costByProvider: Record<string, number> = {}
    records.forEach(record => {
      if (!costByProvider[record.provider]) {
        costByProvider[record.provider] = 0
      }
      costByProvider[record.provider] += record.cost_usd || 0
    })

    // Usage by agent
    const usageByAgent: Record<string, number> = {}
    records.forEach(record => {
      if (!usageByAgent[record.agent_name]) {
        usageByAgent[record.agent_name] = 0
      }
      usageByAgent[record.agent_name] += 1
    })

    // Usage by framework
    const usageByFramework: Record<string, number> = {}
    records.forEach(record => {
      if (!usageByFramework[record.framework]) {
        usageByFramework[record.framework] = 0
      }
      usageByFramework[record.framework] += 1
    })

    // Top users by usage
    const userStats: Record<string, {
      userId: string
      userEmail: string
      requests: number
      tokens: number
      cost: number
    }> = {}

    records.forEach(record => {
      const userId = record.user_id
      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          userEmail: record.users?.email || 'Unknown',
          requests: 0,
          tokens: 0,
          cost: 0
        }
      }
      userStats[userId].requests += 1
      userStats[userId].tokens += record.total_tokens || 0
      userStats[userId].cost += record.cost_usd || 0
    })

    const topUsersByUsage = Object.values(userStats)
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10)

    // Daily usage
    const dailyStats: Record<string, {
      date: string
      requests: number
      tokens: number
      cost: number
    }> = {}

    records.forEach(record => {
      const date = record.timestamp.split('T')[0]
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          requests: 0,
          tokens: 0,
          cost: 0
        }
      }
      dailyStats[date].requests += 1
      dailyStats[date].tokens += record.total_tokens || 0
      dailyStats[date].cost += record.cost_usd || 0
    })

    const dailyUsage = Object.values(dailyStats)
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      totalCostUsd,
      averageResponseTimeMs,
      successRate,
      costByProvider,
      usageByAgent,
      usageByFramework,
      topUsersByUsage,
      dailyUsage
    }
  } catch (error) {
    console.error('Error in getUsageSummary:', error)
    throw error
  }
}

// Track detailed usage (called from agent APIs)
export async function trackDetailedUsage(
  userId: string,
  agentId: string,
  agentName: string,
  framework: string,
  provider: string,
  messageType: 'chat' | 'preset_action' | 'tool_execution',
  inputTokens: number,
  outputTokens: number,
  responseTimeMs: number,
  success: boolean,
  errorMessage?: string,
  requestMetadata?: any,
  model?: string
): Promise<void> {
  const supabase = createSupabaseAdminClient()

  try {
    // Calculate cost
    const costCalculation = calculateTokenCost(provider, model, {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens
    })

    // Insert detailed usage record
    const { error } = await supabase
      .from('agent_usage_detailed')
      .insert({
        user_id: userId,
        agent_id: agentId,
        agent_name: agentName,
        framework,
        provider,
        message_type: messageType,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costCalculation.totalCost,
        response_time_ms: responseTimeMs,
        success,
        error_message: errorMessage,
        request_metadata: requestMetadata || {},
        timestamp: new Date().toISOString()
      })

    if (error) {
      console.error('Error tracking detailed usage:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in trackDetailedUsage:', error)
    throw error
  }
}

// Export usage data to CSV format
export function exportUsageToCSV(records: UsageRecord[]): string {
  const headers = [
    'Timestamp',
    'User Email',
    'Agent Name',
    'Framework',
    'Provider',
    'Request Type',
    'Input Tokens',
    'Output Tokens',
    'Total Tokens',
    'Cost (USD)',
    'Response Time (ms)',
    'Success',
    'Error Message'
  ]

  const csvRows = [
    headers.join(','),
    ...records.map(record => [
      record.timestamp,
      record.user_email,
      record.agent_name,
      record.framework,
      record.provider,
      record.message_type,
      record.input_tokens,
      record.output_tokens,
      record.total_tokens,
      record.cost_usd,
      record.response_time_ms,
      record.success,
      record.error_message || ''
    ].map(field => `"${field}"`).join(','))
  ]

  return csvRows.join('\n')
}
