/**
 * Referral Analytics System
 * Tracks cross-agent referrals for optimization and insights
 */

import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface ReferralEvent {
  id?: string
  user_id: string
  source_agent_id: string
  target_agent_id: string
  original_message: string
  domain_detected: string
  confidence_score: number
  referral_reason: string
  timestamp: string
  session_id?: string
  thread_id?: string
}

export interface ReferralAnalytics {
  totalReferrals: number
  topSourceAgents: Array<{ agentId: string; count: number }>
  topTargetAgents: Array<{ agentId: string; count: number }>
  domainDistribution: Array<{ domain: string; count: number }>
  averageConfidence: number
  referralsByTimeframe: Array<{ date: string; count: number }>
}

/**
 * Track a referral event in the database
 */
export async function trackReferral(referralEvent: Omit<ReferralEvent, 'id' | 'timestamp'>): Promise<void> {
  try {
    const supabase = createSupabaseServerClient()
    
    const { error } = await supabase
      .from('agent_referrals')
      .insert({
        ...referralEvent,
        timestamp: new Date().toISOString()
      })

    if (error) {
      console.error('Error tracking referral:', error)
    }
  } catch (error) {
    console.error('Failed to track referral:', error)
  }
}

/**
 * Get referral analytics for a specific time period
 */
export async function getReferralAnalytics(
  startDate: string,
  endDate: string,
  userId?: string
): Promise<ReferralAnalytics> {
  try {
    const supabase = createSupabaseServerClient()
    
    let query = supabase
      .from('agent_referrals')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: referrals, error } = await query

    if (error) {
      console.error('Error fetching referral analytics:', error)
      return getEmptyAnalytics()
    }

    if (!referrals || referrals.length === 0) {
      return getEmptyAnalytics()
    }

    // Calculate analytics
    const totalReferrals = referrals.length

    // Top source agents
    const sourceAgentCounts = referrals.reduce((acc, ref) => {
      acc[ref.source_agent_id] = (acc[ref.source_agent_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topSourceAgents = Object.entries(sourceAgentCounts)
      .map(([agentId, count]) => ({ agentId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Top target agents
    const targetAgentCounts = referrals.reduce((acc, ref) => {
      acc[ref.target_agent_id] = (acc[ref.target_agent_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topTargetAgents = Object.entries(targetAgentCounts)
      .map(([agentId, count]) => ({ agentId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Domain distribution
    const domainCounts = referrals.reduce((acc, ref) => {
      acc[ref.domain_detected] = (acc[ref.domain_detected] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const domainDistribution = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)

    // Average confidence
    const averageConfidence = referrals.reduce((sum, ref) => sum + ref.confidence_score, 0) / referrals.length

    // Referrals by timeframe (daily)
    const referralsByDate = referrals.reduce((acc, ref) => {
      const date = ref.timestamp.split('T')[0] // Get date part only
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const referralsByTimeframe = Object.entries(referralsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalReferrals,
      topSourceAgents,
      topTargetAgents,
      domainDistribution,
      averageConfidence,
      referralsByTimeframe
    }

  } catch (error) {
    console.error('Failed to get referral analytics:', error)
    return getEmptyAnalytics()
  }
}

/**
 * Get referral effectiveness metrics
 */
export async function getReferralEffectiveness(
  startDate: string,
  endDate: string
): Promise<{
  totalReferrals: number
  successfulReferrals: number
  averageConfidence: number
  topPerformingPairs: Array<{ source: string; target: string; count: number }>
}> {
  try {
    const supabase = createSupabaseServerClient()
    
    const { data: referrals, error } = await supabase
      .from('agent_referrals')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)

    if (error || !referrals) {
      return {
        totalReferrals: 0,
        successfulReferrals: 0,
        averageConfidence: 0,
        topPerformingPairs: []
      }
    }

    const totalReferrals = referrals.length
    const successfulReferrals = referrals.filter(ref => ref.confidence_score > 0.7).length
    const averageConfidence = referrals.reduce((sum, ref) => sum + ref.confidence_score, 0) / referrals.length

    // Top performing source-target pairs
    const pairCounts = referrals.reduce((acc, ref) => {
      const key = `${ref.source_agent_id}-${ref.target_agent_id}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topPerformingPairs = Object.entries(pairCounts)
      .map(([pair, count]) => {
        const [source, target] = pair.split('-')
        return { source, target, count }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalReferrals,
      successfulReferrals,
      averageConfidence,
      topPerformingPairs
    }

  } catch (error) {
    console.error('Failed to get referral effectiveness:', error)
    return {
      totalReferrals: 0,
      successfulReferrals: 0,
      averageConfidence: 0,
      topPerformingPairs: []
    }
  }
}

/**
 * Get empty analytics structure
 */
function getEmptyAnalytics(): ReferralAnalytics {
  return {
    totalReferrals: 0,
    topSourceAgents: [],
    topTargetAgents: [],
    domainDistribution: [],
    averageConfidence: 0,
    referralsByTimeframe: []
  }
}

/**
 * Create the agent_referrals table if it doesn't exist
 */
export async function ensureReferralTable(): Promise<void> {
  try {
    const supabase = createSupabaseServerClient()
    
    // Check if table exists by trying to select from it
    const { error } = await supabase
      .from('agent_referrals')
      .select('id')
      .limit(1)

    if (error && error.message.includes('does not exist')) {
      console.log('Creating agent_referrals table...')
      
      // Create the table using SQL
      const { error: createError } = await supabase.rpc('create_referral_table')
      
      if (createError) {
        console.error('Error creating referral table:', createError)
      } else {
        console.log('Agent referrals table created successfully')
      }
    }
  } catch (error) {
    console.error('Error ensuring referral table:', error)
  }
}
