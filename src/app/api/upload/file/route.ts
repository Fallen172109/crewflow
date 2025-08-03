import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { requireAuthAPI } from '@/lib/auth'
import {
  createSuccessResponse,
  createErrorResponse,
  createAuthErrorResponse,
  withStandardErrorHandling,
  ERROR_CODES,
  HTTP_STATUS
} from '@/lib/api/response-formatter'
import { handleFileUploadError } from '@/lib/api/error-handlers'

// POST /api/upload/file - Upload file to storage with authentication (fixed auth v2)
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 File upload request received')

    // Check if we're in maintenance mode and handle accordingly
    const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true'

    let user
    try {
      user = await requireAuthAPI()
      console.log('✅ User authenticated:', user.id)
    } catch (authError) {
      // If in maintenance mode, provide a more helpful error message
      if (isMaintenanceMode) {
        console.log('❌ Authentication failed in maintenance mode')
        return createAuthErrorResponse(
          'Authentication required. Please log in to upload files.'
        )
      }

      // Re-throw the error for normal operation
      throw authError
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return createErrorResponse(
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        'No file provided',
        { field: 'file' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Validate file size (25MB limit)
    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      return createErrorResponse(
        ERROR_CODES.FILE_TOO_LARGE,
        'File size exceeds 25MB limit',
        { maxSize: '25MB', actualSize: `${Math.round(file.size / 1024 / 1024)}MB` },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'File type not allowed' 
      }, { status: 400 })
    }

    const supabase = await createSupabaseServerClientWithCookies()

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
    const filePath = fileName // Just the filename, bucket name is specified separately

    console.log('Uploading file:', file.name, 'to path:', filePath, 'for user:', user.id)

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({ 
        error: `Upload failed: ${error.message}` 
      }, { status: 500 })
    }

    console.log('Upload successful:', data)

    // Try to create a signed URL first, fallback to public URL
    let finalUrl = ''

    try {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(filePath, 86400) // 24 hours

      if (signedUrlError) {
        console.log('Signed URL failed, using public URL:', signedUrlError)
        const { data: publicUrlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath)
        finalUrl = publicUrlData.publicUrl
      } else {
        finalUrl = signedUrlData.signedUrl
        console.log('Using signed URL for:', filePath)
      }
    } catch (error) {
      console.log('URL generation error, using public URL:', error)
      const { data: publicUrlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath)
      finalUrl = publicUrlData.publicUrl
    }

    console.log('Final image URL:', finalUrl)

    return NextResponse.json({
      success: true,
      path: filePath,
      storagePath: filePath, // This is just the filename now
      publicUrl: finalUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    })

  } catch (error) {
    console.error('❌ File upload error:', error)

    // Handle authentication errors specifically
    if (error instanceof Error && error.message === 'Authentication required') {
      console.error('❌ Authentication error')
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 })
    }

    console.error('❌ Internal server error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
