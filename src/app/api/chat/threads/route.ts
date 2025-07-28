import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

// GET /api/chat/threads - Get all threads for a user/agent/taskType
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

    const supabase = await createSupabaseServerClientWithCookies()

    // Fetch threads with message counts
    const { data: threads, error } = await supabase
      .from('chat_threads')
      .select(`
        *,
        chat_history(count)
      `)
      .eq('user_id', user.id)
      .eq('agent_name', agentName)
      .eq('task_type', taskType)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching threads:', error)
      return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 })
    }

    // Transform the data to include message counts
    const threadsWithCounts = threads?.map(thread => ({
      ...thread,
      message_count: thread.chat_history?.[0]?.count || 0
    })) || []

    return NextResponse.json({ threads: threadsWithCounts })

  } catch (error) {
    console.error('Error in threads GET:', error)
    return NextResponse.json(
      { error: 'Failed to fetch threads' },
      { status: 500 }
    )
  }
}

// POST /api/chat/threads - Create a new thread
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { agentName, taskType, title, context, attachments } = await request.json()
    
    if (!agentName || !title) {
      return NextResponse.json({ 
        error: 'Agent name and title are required' 
      }, { status: 400 })
    }

    const supabase = await createSupabaseServerClientWithCookies()

    // Create new thread
    const { data: thread, error } = await supabase
      .from('chat_threads')
      .insert({
        user_id: user.id,
        agent_name: agentName,
        task_type: taskType || 'general',
        title: title.trim(),
        context: context?.trim() || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating thread:', error)
      return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 })
    }

    // Add welcome message to the new thread if context is provided
    if (context?.trim()) {
      const welcomeMessage = `Welcome to your new conversation thread: "${title}"

Context: ${context.trim()}

I'm ${agentName}, and I'll remember this context throughout our conversation. How can I help you get started?`

      await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          agent_name: agentName,
          message_type: 'agent',
          content: welcomeMessage,
          task_type: taskType || 'general',
          thread_id: thread.id
        })
    }

    // Save attachments if provided
    if (attachments && attachments.length > 0) {
      const attachmentRecords = attachments.map((att: any) => ({
        user_id: user.id,
        thread_id: thread.id,
        file_name: att.name,
        file_type: att.type,
        file_size: att.size,
        storage_path: att.url,
        public_url: att.url,
        upload_status: 'completed' as const,
        metadata: att.metadata || {}
      }))

      const { error: attachmentError } = await supabase
        .from('chat_attachments')
        .insert(attachmentRecords)

      if (attachmentError) {
        console.error('Error saving thread attachments:', attachmentError)
        // Don't fail the whole request for attachment errors
      }
    }

    return NextResponse.json({ thread })

  } catch (error) {
    console.error('Error in threads POST:', error)
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500 }
    )
  }
}
