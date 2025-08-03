import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// GET /api/chat/threads/[threadId]/messages - Get messages for a specific thread
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = await params
    const threadId = resolvedParams.threadId

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createSupabaseServerClient()

    // First verify the thread belongs to the user
    const { data: thread, error: threadError } = await supabase
      .from('chat_threads')
      .select('id')
      .eq('id', threadId)
      .eq('user_id', user.id)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Fetch messages for the thread
    const { data: messages, error: messagesError } = await supabase
      .from('chat_history')
      .select(`
        id,
        message_type,
        content,
        timestamp,
        attachments:chat_attachments(
          id,
          file_name,
          file_type,
          public_url,
          metadata
        )
      `)
      .eq('thread_id', threadId)
      .order('timestamp', { ascending: true })
      .range(offset, offset + limit - 1)

    if (messagesError) {
      console.error('Error fetching thread messages:', messagesError)
      return NextResponse.json({ 
        error: 'Failed to fetch messages' 
      }, { status: 500 })
    }

    // Transform attachments to match expected format
    const transformedMessages = messages.map(message => ({
      ...message,
      attachments: message.attachments?.map((att: any) => ({
        id: att.id,
        fileName: att.file_name,
        fileType: att.file_type,
        publicUrl: att.public_url,
        metadata: att.metadata
      })) || []
    }))

    return NextResponse.json({
      messages: transformedMessages,
      total: transformedMessages.length,
      threadId
    })

  } catch (error) {
    console.error('Error in thread messages API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST /api/chat/threads/[threadId]/messages - Add a new message to a thread
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = await params
    const threadId = resolvedParams.threadId
    const { content, messageType, attachments } = await request.json()

    if (!content || !messageType) {
      return NextResponse.json({ 
        error: 'Content and message type are required' 
      }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Verify thread ownership
    const { data: thread, error: threadError } = await supabase
      .from('chat_threads')
      .select('id')
      .eq('id', threadId)
      .eq('user_id', user.id)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Insert the message
    const { data: message, error: messageError } = await supabase
      .from('chat_history')
      .insert({
        user_id: user.id,
        agent_name: 'ai-store-manager',
        message_type: messageType,
        content: content.trim(),
        thread_id: threadId
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return NextResponse.json({ 
        error: 'Failed to create message' 
      }, { status: 500 })
    }

    // Handle attachments if provided
    if (attachments && attachments.length > 0) {
      const attachmentInserts = attachments.map((att: any) => ({
        user_id: user.id,
        message_id: message.id,
        file_name: att.fileName,
        file_type: att.fileType,
        file_size: att.fileSize || 0,
        storage_path: att.storagePath || '',
        public_url: att.publicUrl || '',
        upload_status: 'completed',
        metadata: att.metadata || {}
      }))

      const { error: attachmentError } = await supabase
        .from('chat_attachments')
        .insert(attachmentInserts)

      if (attachmentError) {
        console.error('Error creating attachments:', attachmentError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      message: {
        ...message,
        attachments: attachments || []
      }
    })

  } catch (error) {
    console.error('Error in create thread message API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
