import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// GET /api/settings/agent-permissions - Get user's agent permission settings
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's agent permission settings
    const { data: settings, error } = await supabase
      .from('agent_permission_settings')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching agent permission settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Transform data to match frontend interface
    const transformedSettings = settings?.map(setting => ({
      agentId: setting.agent_id,
      agentName: setting.agent_name,
      integrationId: setting.integration_id,
      integrationName: setting.integration_name,
      settings: {
        alwaysRequireConfirmation: setting.always_require_confirmation || false,
        autoApproveLowRisk: setting.auto_approve_low_risk || true,
        autoApproveMediumRisk: setting.auto_approve_medium_risk || false,
        maxAutonomousActions: setting.max_autonomous_actions || 10,
        autonomousActionFrequency: setting.autonomous_action_frequency || 'daily',
        restrictedActions: setting.restricted_actions || [],
        emergencyStopEnabled: setting.emergency_stop_enabled || true
      }
    })) || []

    return NextResponse.json({ settings: transformedSettings })

  } catch (error) {
    console.error('Error in GET /api/settings/agent-permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/settings/agent-permissions - Save user's agent permission settings
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { settings } = body

    if (!Array.isArray(settings)) {
      return NextResponse.json({ error: 'Settings must be an array' }, { status: 400 })
    }

    // Transform settings for database storage
    const dbSettings = settings.map(setting => ({
      user_id: user.id,
      agent_id: setting.agentId,
      agent_name: setting.agentName,
      integration_id: setting.integrationId,
      integration_name: setting.integrationName,
      always_require_confirmation: setting.settings.alwaysRequireConfirmation,
      auto_approve_low_risk: setting.settings.autoApproveLowRisk,
      auto_approve_medium_risk: setting.settings.autoApproveMediumRisk,
      max_autonomous_actions: setting.settings.maxAutonomousActions,
      autonomous_action_frequency: setting.settings.autonomousActionFrequency,
      restricted_actions: setting.settings.restrictedActions,
      emergency_stop_enabled: setting.settings.emergencyStopEnabled,
      updated_at: new Date().toISOString()
    }))

    // Delete existing settings for this user
    const { error: deleteError } = await supabase
      .from('agent_permission_settings')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting existing settings:', deleteError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    // Insert new settings
    const { error: insertError } = await supabase
      .from('agent_permission_settings')
      .insert(dbSettings)

    if (insertError) {
      console.error('Error inserting settings:', insertError)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Agent permission settings saved successfully' 
    })

  } catch (error) {
    console.error('Error in POST /api/settings/agent-permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/settings/agent-permissions - Update specific agent permission setting
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { agentId, integrationId, settingKey, settingValue } = body

    if (!agentId || !integrationId || !settingKey) {
      return NextResponse.json({ 
        error: 'agentId, integrationId, and settingKey are required' 
      }, { status: 400 })
    }

    // Map frontend setting keys to database columns
    const settingKeyMap: Record<string, string> = {
      'alwaysRequireConfirmation': 'always_require_confirmation',
      'autoApproveLowRisk': 'auto_approve_low_risk',
      'autoApproveMediumRisk': 'auto_approve_medium_risk',
      'maxAutonomousActions': 'max_autonomous_actions',
      'autonomousActionFrequency': 'autonomous_action_frequency',
      'restrictedActions': 'restricted_actions',
      'emergencyStopEnabled': 'emergency_stop_enabled'
    }

    const dbColumn = settingKeyMap[settingKey]
    if (!dbColumn) {
      return NextResponse.json({ error: 'Invalid setting key' }, { status: 400 })
    }

    // Update the specific setting
    const { error } = await supabase
      .from('agent_permission_settings')
      .update({ 
        [dbColumn]: settingValue,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('agent_id', agentId)
      .eq('integration_id', integrationId)

    if (error) {
      console.error('Error updating setting:', error)
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Setting updated successfully' 
    })

  } catch (error) {
    console.error('Error in PUT /api/settings/agent-permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/settings/agent-permissions - Reset agent permissions to defaults
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const integrationId = searchParams.get('integrationId')

    let query = supabase
      .from('agent_permission_settings')
      .delete()
      .eq('user_id', user.id)

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    if (integrationId) {
      query = query.eq('integration_id', integrationId)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting settings:', error)
      return NextResponse.json({ error: 'Failed to reset settings' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Agent permission settings reset to defaults' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/settings/agent-permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
