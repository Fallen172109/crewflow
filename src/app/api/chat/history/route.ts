import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const agentName = searchParams.get('agent')
    const taskType = searchParams.get('taskType') || 'general'
    const limit = parseInt(searchParams.get('limit') || '50')
    
    if (!agentName) {
      return NextResponse.json({ error: 'Agent name is required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Fetch chat history for the specific agent and task type
    // Only get messages from the last 30 days for performance
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: chatHistory, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('agent_name', agentName)
      .eq('task_type', taskType)
      .eq('archived', false)
      .gte('timestamp', thirtyDaysAgo.toISOString())
      .order('timestamp', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching chat history:', error)
      return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 })
    }

    // Transform the data to match the frontend Message interface
    const messages = chatHistory.map(msg => ({
      id: msg.id,
      type: msg.message_type,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      taskType: msg.task_type
    }))

    return NextResponse.json({ messages })

  } catch (error) {
    console.error('Error in chat history API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    )
  }
}

// Archive old chat messages (30+ days old)
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const agentName = searchParams.get('agent')
    const taskType = searchParams.get('taskType')
    
    if (!agentName) {
      return NextResponse.json({ error: 'Agent name is required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Archive messages older than 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    let query = supabase
      .from('chat_history')
      .update({ archived: true })
      .eq('user_id', user.id)
      .eq('agent_name', agentName)
      .lt('timestamp', thirtyDaysAgo.toISOString())

    if (taskType) {
      query = query.eq('task_type', taskType)
    }

    const { error } = await query

    if (error) {
      console.error('Error archiving chat history:', error)
      return NextResponse.json({ error: 'Failed to archive chat history' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in chat history archive API:', error)
    return NextResponse.json(
      { error: 'Failed to archive chat history' },
      { status: 500 }
    )
  }
}
