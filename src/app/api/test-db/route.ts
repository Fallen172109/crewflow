import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Test database connection
    const { data: tables, error: tablesError } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (tablesError) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: tablesError.message
      }, { status: 500 })
    }

    // Test functions
    const { data: functions, error: functionsError } = await supabase
      .rpc('increment_agent_usage', {
        p_user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
        p_agent_name: 'test'
      })

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      database: {
        tables: 'Connected',
        functions: functionsError ? 'Error' : 'Working',
        functionError: functionsError?.message || null
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
