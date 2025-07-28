import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { requireAuthAPI } from '@/lib/auth'

// GET /api/images/download - Secure image download with authentication
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const imagePath = searchParams.get('path')
    const filename = searchParams.get('filename')

    if (!imagePath) {
      return NextResponse.json({ 
        error: 'Image path is required' 
      }, { status: 400 })
    }

    // Verify user has access to this image
    // Images should be in user-specific folders: user-{userId}/filename
    const expectedUserPath = `user-${user.id}/`
    if (!imagePath.startsWith(expectedUserPath) && !imagePath.startsWith('public/')) {
      return NextResponse.json({ 
        error: 'Unauthorized access to image' 
      }, { status: 403 })
    }

    const supabase = await createSupabaseServerClient()

    // Get the image data from Supabase storage
    const { data, error } = await supabase.storage
      .from('generated-images')
      .download(imagePath)

    if (error) {
      console.error('Error downloading image:', error)
      return NextResponse.json({ 
        error: 'Image not found or access denied' 
      }, { status: 404 })
    }

    // Convert blob to array buffer
    const arrayBuffer = await data.arrayBuffer()
    
    // Determine content type based on file extension
    const extension = imagePath.split('.').pop()?.toLowerCase()
    let contentType = 'image/png' // default
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'webp':
        contentType = 'image/webp'
        break
      case 'png':
      default:
        contentType = 'image/png'
        break
    }

    // Set appropriate headers for download
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Disposition', `attachment; filename="${filename || 'generated-image.png'}"`)
    headers.set('Cache-Control', 'private, max-age=3600')

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Image download error:', error)
    return NextResponse.json({ 
      error: 'Failed to download image' 
    }, { status: 500 })
  }
}

// POST /api/images/download - Get secure download URL
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthAPI()
    const { imagePath } = await request.json()

    if (!imagePath) {
      return NextResponse.json({ 
        error: 'Image path is required' 
      }, { status: 400 })
    }

    // Verify user has access to this image
    const expectedUserPath = `user-${user.id}/`
    if (!imagePath.startsWith(expectedUserPath) && !imagePath.startsWith('public/')) {
      return NextResponse.json({ 
        error: 'Unauthorized access to image' 
      }, { status: 403 })
    }

    const supabase = await createSupabaseServerClientWithCookies()

    // Create a signed URL for secure download (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('generated-images')
      .createSignedUrl(imagePath, 3600)

    if (error) {
      console.error('Error creating signed URL:', error)
      return NextResponse.json({ 
        error: 'Failed to create download URL' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      downloadUrl: data.signedUrl,
      expiresIn: 3600 // 1 hour
    })

  } catch (error) {
    console.error('Download URL creation error:', error)
    return NextResponse.json({ 
      error: 'Failed to create download URL' 
    }, { status: 500 })
  }
}
