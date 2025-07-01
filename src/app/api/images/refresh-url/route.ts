import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// POST /api/images/refresh-url - Refresh expired signed URLs for attachments
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { storagePath } = await request.json()

    if (!storagePath) {
      return NextResponse.json({ 
        error: 'Storage path is required' 
      }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Verify user has access to this file
    const expectedUserPath = `user-${user.id}/`
    const isPublicPath = storagePath.startsWith('public/')
    const isUserPath = storagePath.startsWith(expectedUserPath)
    
    if (!isPublicPath && !isUserPath) {
      return NextResponse.json({ 
        error: 'Unauthorized access to file' 
      }, { status: 403 })
    }

    // Check if file exists in storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('generated-images')
      .list(storagePath.split('/').slice(0, -1).join('/'), {
        search: storagePath.split('/').pop()
      })

    if (fileError || !fileData || fileData.length === 0) {
      // Try chat-attachments bucket if not found in generated-images
      const { data: chatFileData, error: chatFileError } = await supabase.storage
        .from('chat-attachments')
        .list(storagePath.split('/').slice(0, -1).join('/'), {
          search: storagePath.split('/').pop()
        })

      if (chatFileError || !chatFileData || chatFileData.length === 0) {
        return NextResponse.json({ 
          error: 'File not found in storage' 
        }, { status: 404 })
      }

      // Create signed URL for chat-attachments bucket
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(storagePath, 86400) // 24 hours

      if (signedUrlError) {
        console.error('Error creating signed URL for chat attachment:', signedUrlError)
        return NextResponse.json({ 
          error: 'Failed to create signed URL' 
        }, { status: 500 })
      }

      return NextResponse.json({ 
        url: signedUrlData.signedUrl,
        expiresAt: new Date(Date.now() + 86400 * 1000).toISOString()
      })
    }

    // Create signed URL for generated-images bucket (24 hours)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('generated-images')
      .createSignedUrl(storagePath, 86400)

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError)
      
      // Fallback to public URL if signed URL fails
      const { data: publicUrlData } = supabase.storage
        .from('generated-images')
        .getPublicUrl(storagePath)
      
      return NextResponse.json({ 
        url: publicUrlData.publicUrl,
        expiresAt: null // Public URLs don't expire
      })
    }

    return NextResponse.json({ 
      url: signedUrlData.signedUrl,
      expiresAt: new Date(Date.now() + 86400 * 1000).toISOString()
    })
  } catch (error) {
    console.error('URL refresh error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
