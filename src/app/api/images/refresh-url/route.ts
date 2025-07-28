import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAPI } from '@/lib/auth'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

// POST /api/images/refresh-url - Refresh expired signed URLs for attachments
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthAPI()
    const { storagePath } = await request.json()

    if (!storagePath) {
      return NextResponse.json({ 
        error: 'Storage path is required' 
      }, { status: 400 })
    }

    const supabase = await createSupabaseServerClientWithCookies()

    // Verify user has access to this file
    const expectedUserPath = `user-${user.id}/`
    const isPublicPath = storagePath.startsWith('public/')
    const isUserPath = storagePath.startsWith(expectedUserPath)
    const isChatAttachment = storagePath.startsWith('chat-attachments/') || !storagePath.includes('/')

    if (!isPublicPath && !isUserPath && !isChatAttachment) {
      return NextResponse.json({
        error: 'Unauthorized access to file'
      }, { status: 403 })
    }

    // Determine which bucket to use based on storage path
    let bucketName = 'generated-images'
    let actualPath = storagePath

    if (isChatAttachment) {
      bucketName = 'chat-attachments'
      // Remove chat-attachments/ prefix if present (for backward compatibility)
      actualPath = storagePath.startsWith('chat-attachments/')
        ? storagePath.replace('chat-attachments/', '')
        : storagePath
    }

    console.log('🔄 Refreshing URL for:', { storagePath, actualPath, bucketName })

    // Check if file exists in the appropriate bucket
    const pathParts = actualPath.split('/')
    const searchPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : ''
    const fileName = pathParts[pathParts.length - 1]

    const { data: fileData, error: fileError } = await supabase.storage
      .from(bucketName)
      .list(searchPath, {
        search: fileName
      })

    if (fileError || !fileData || fileData.length === 0) {
      console.error('File not found in storage:', { storagePath, actualPath, bucketName, fileError })
      return NextResponse.json({
        error: 'File not found in storage'
      }, { status: 404 })
    }

    // Create signed URL for the appropriate bucket
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(actualPath, 86400) // 24 hours

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError)
      return NextResponse.json({
        error: 'Failed to create signed URL'
      }, { status: 500 })
    }

    console.log('✅ Successfully created signed URL for:', actualPath)
    return NextResponse.json({
      url: signedUrlData.signedUrl,
      expiresAt: new Date(Date.now() + 86400 * 1000).toISOString()
    })


  } catch (error) {
    console.error('URL refresh error:', error)

    // Handle authentication errors specifically
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
