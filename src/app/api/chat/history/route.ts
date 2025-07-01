import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)

    const agentName = searchParams.get('agent')
    const taskType = searchParams.get('taskType') || 'general'
    const threadId = searchParams.get('threadId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!agentName) {
      return NextResponse.json({ error: 'Agent name is required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    let query = supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('agent_name', agentName)
      .eq('archived', false)
      .order('timestamp', { ascending: true })
      .limit(limit)

    // If threadId is provided, get messages for that specific thread
    if (threadId) {
      query = query.eq('thread_id', threadId)
    } else {
      // Otherwise, get messages for the task type without a thread (legacy messages)
      query = query
        .eq('task_type', taskType)
        .is('thread_id', null)
    }

    // Only get messages from the last 30 days for performance
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    query = query.gte('timestamp', thirtyDaysAgo.toISOString())

    const { data: chatHistory, error } = await query

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
