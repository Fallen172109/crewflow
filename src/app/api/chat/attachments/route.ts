import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

// GET /api/chat/attachments - Get attachments for a thread or message
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const threadId = searchParams.get('threadId')
    const messageId = searchParams.get('messageId')
    
    if (!threadId && !messageId) {
      return NextResponse.json({ 
        error: 'Either threadId or messageId is required' 
      }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    let query = supabase
      .from('chat_attachments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (threadId) {
      query = query.eq('thread_id', threadId)
    } else if (messageId) {
      query = query.eq('message_id', messageId)
    }

    const { data: attachments, error } = await query

    if (error) {
      console.error('Error fetching attachments:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch attachments' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      attachments: attachments || [] 
    })
  } catch (error) {
    console.error('Attachments API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST /api/chat/attachments - Create new attachment record
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { 
      threadId, 
      messageId, 
      fileName, 
      fileType, 
      fileSize, 
      storagePath, 
      publicUrl, 
      metadata 
    } = await request.json()
    
    if (!fileName || !fileType || !fileSize || !storagePath) {
      return NextResponse.json({ 
        error: 'Missing required file information' 
      }, { status: 400 })
    }

    if (!threadId && !messageId) {
      return NextResponse.json({ 
        error: 'Either threadId or messageId is required' 
      }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Verify thread/message ownership
    if (threadId) {
      const { data: thread, error: threadError } = await supabase
        .from('chat_threads')
        .select('id')
        .eq('id', threadId)
        .eq('user_id', user.id)
        .single()

      if (threadError || !thread) {
        return NextResponse.json({ 
          error: 'Thread not found or access denied' 
        }, { status: 404 })
      }
    }

    if (messageId) {
      const { data: message, error: messageError } = await supabase
        .from('chat_history')
        .select('id')
        .eq('id', messageId)
        .eq('user_id', user.id)
        .single()

      if (messageError || !message) {
        return NextResponse.json({ 
          error: 'Message not found or access denied' 
        }, { status: 404 })
      }
    }

    // Create attachment record
    const { data: attachment, error } = await supabase
      .from('chat_attachments')
      .insert({
        user_id: user.id,
        thread_id: threadId || null,
        message_id: messageId || null,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        storage_path: storagePath,
        public_url: publicUrl,
        upload_status: 'completed',
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating attachment:', error)
      return NextResponse.json({ 
        error: 'Failed to create attachment record' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      attachment,
      success: true 
    })
  } catch (error) {
    console.error('Attachment creation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// DELETE /api/chat/attachments - Delete attachment
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const attachmentId = searchParams.get('id')
    
    if (!attachmentId) {
      return NextResponse.json({ 
        error: 'Attachment ID is required' 
      }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Get attachment to verify ownership and get storage path
    const { data: attachment, error: fetchError } = await supabase
      .from('chat_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json({ 
        error: 'Attachment not found or access denied' 
      }, { status: 404 })
    }

    // Delete from storage
    if (attachment.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('generated-images') // TODO: Use proper bucket when created
        .remove([attachment.storage_path])

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError)
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('chat_attachments')
      .delete()
      .eq('id', attachmentId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting attachment:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete attachment' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true 
    })
  } catch (error) {
    console.error('Attachment deletion error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
