import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// GET /api/chat/threads/[threadId] - Get specific thread details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = await params
    const threadId = resolvedParams.threadId

    const supabase = await createSupabaseServerClient()

    // Fetch thread details
    const { data: thread, error } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('id', threadId)
      .eq('user_id', user.id)
      .single()

    if (error || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    return NextResponse.json({ thread })

  } catch (error) {
    console.error('Error fetching thread:', error)
    return NextResponse.json(
      { error: 'Failed to fetch thread' },
      { status: 500 }
    )
  }
}

// PATCH /api/chat/threads/[threadId] - Update thread details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = await params
    const threadId = resolvedParams.threadId
    const { title, context, is_active, attachments } = await request.json()

    const supabase = await createSupabaseServerClient()

    // Build update object
    const updates: any = { updated_at: new Date().toISOString() }
    if (title !== undefined) updates.title = title.trim()
    if (context !== undefined) updates.context = context?.trim() || null
    if (is_active !== undefined) updates.is_active = is_active

    // Update thread
    const { data: thread, error } = await supabase
      .from('chat_threads')
      .update(updates)
      .eq('id', threadId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !thread) {
      return NextResponse.json({ error: 'Thread not found or update failed' }, { status: 404 })
    }

    // Handle attachments if provided
    if (attachments && Array.isArray(attachments)) {
      // Remove existing thread attachments
      await supabase
        .from('chat_attachments')
        .delete()
        .eq('thread_id', threadId)
        .eq('user_id', user.id)

      // Add new attachments
      const completedAttachments = attachments.filter(att =>
        att.uploadStatus === 'completed' && att.url
      )

      if (completedAttachments.length > 0) {
        const attachmentRecords = completedAttachments.map(att => ({
          user_id: user.id,
          thread_id: threadId,
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
          console.error('Error saving attachments:', attachmentError)
          // Don't fail the whole request for attachment errors
        }
      }
    }

    return NextResponse.json({ thread })

  } catch (error) {
    console.error('Error updating thread:', error)
    return NextResponse.json(
      { error: 'Failed to update thread' },
      { status: 500 }
    )
  }
}

// DELETE /api/chat/threads/[threadId] - Delete thread and all its messages
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = await params
    const threadId = resolvedParams.threadId

    const supabase = await createSupabaseServerClient()

    // First, delete all messages in the thread
    const { error: messagesError } = await supabase
      .from('chat_history')
      .delete()
      .eq('thread_id', threadId)
      .eq('user_id', user.id)

    if (messagesError) {
      console.error('Error deleting thread messages:', messagesError)
      return NextResponse.json({ error: 'Failed to delete thread messages' }, { status: 500 })
    }

    // Then delete the thread itself
    const { error: threadError } = await supabase
      .from('chat_threads')
      .delete()
      .eq('id', threadId)
      .eq('user_id', user.id)

    if (threadError) {
      console.error('Error deleting thread:', threadError)
      return NextResponse.json({ error: 'Failed to delete thread' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in thread DELETE:', error)
    return NextResponse.json(
      { error: 'Failed to delete thread' },
      { status: 500 }
    )
  }
}
