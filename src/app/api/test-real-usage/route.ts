import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if there's any real usage data
    const { data: usageData, error } = await supabase
      .from('agent_usage_detailed')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(5)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check if real usage tracking is working
    const realUsageCount = usageData?.filter(record => 
      record.request_metadata?.real_usage === true || 
      record.request_metadata?.apiResponse
    ).length || 0

    return NextResponse.json({
      success: true,
      totalRecords: usageData?.length || 0,
      realUsageRecords: realUsageCount,
      isRealTrackingWorking: realUsageCount > 0,
      latestRecords: usageData?.map(record => ({
        agent: record.agent_name,
        provider: record.provider,
        cost: record.cost_usd,
        tokens: (record.input_tokens || 0) + (record.output_tokens || 0),
        timestamp: record.timestamp,
        hasRealData: !!(record.request_metadata?.real_usage || record.request_metadata?.apiResponse)
      })) || [],
      message: usageData?.length === 0 
        ? 'No usage data found. Try using the Coral agent to generate real usage data.'
        : `Found ${usageData.length} usage records, ${realUsageCount} with real tracking.`
    })
  } catch (error) {
    console.error('Error checking real usage:', error)
    return NextResponse.json(
      { error: 'Failed to check usage data' },
      { status: 500 }
    )
  }
}
