import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

interface SaveImageRequest {
  threadId?: string
  messageId?: string
  fileName: string
  originalName: string
  fileSize: number
  mimeType: string
  storagePath: string
  publicUrl: string
  width?: number
  height?: number
  analysisResult?: any
  useForProduct?: boolean
}

interface UpdateImageRequest {
  imageId: string
  useForProduct?: boolean
  analysisResult?: any
}

// POST - Save image metadata to database
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body: SaveImageRequest = await request.json()
    const {
      threadId,
      messageId,
      fileName,
      originalName,
      fileSize,
      mimeType,
      storagePath,
      publicUrl,
      width,
      height,
      analysisResult,
      useForProduct = false
    } = body

    // Validate required fields
    if (!fileName || !storagePath) {
      return NextResponse.json(
        { error: 'fileName and storagePath are required' },
        { status: 400 }
      )
    }

    // First, let's test if the table exists
    try {
      const { data: testData, error: testError } = await supabase
        .from('chat_images')
        .select('count')
        .limit(1)

      if (testError) {
        console.error('Table test failed:', testError)
        return NextResponse.json(
          { error: `Database table not ready: ${testError.message}` },
          { status: 500 }
        )
      }
    } catch (tableError) {
      console.error('Table check error:', tableError)
      return NextResponse.json(
        { error: 'Database table does not exist. Please run the setup SQL.' },
        { status: 500 }
      )
    }

    // Prepare basic image data (only essential fields)
    const imageData: any = {
      user_id: user.id,
      file_name: fileName,
      original_name: originalName || fileName,
      file_size: fileSize,
      mime_type: mimeType,
      storage_path: storagePath,
      public_url: publicUrl,
      upload_status: 'completed'
    }

    // Add optional fields if they exist in the table
    if (threadId) imageData.thread_id = threadId
    if (messageId) imageData.message_id = messageId
    if (useForProduct !== undefined) imageData.use_for_product = useForProduct

    // Add analysis results if provided
    if (analysisResult) {
      imageData.analysis_completed = true
      if (analysisResult.description) imageData.analysis_description = analysisResult.description
      if (analysisResult.suggestedTags) imageData.analysis_tags = analysisResult.suggestedTags
      if (analysisResult.qualityScore) imageData.quality_score = analysisResult.qualityScore
      if (analysisResult.suitableForEcommerce !== undefined) imageData.suitable_for_ecommerce = analysisResult.suitableForEcommerce
    }

    console.log('💾 Attempting to save image data:', {
      user_id: imageData.user_id,
      file_name: imageData.file_name,
      storage_path: imageData.storage_path
    })

    // Insert image record
    const { data: savedImage, error } = await supabase
      .from('chat_images')
      .insert(imageData)
      .select()
      .single()

    if (error) {
      console.error('Error saving image:', error)
      return NextResponse.json(
        { error: `Failed to save image metadata: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Image saved to database:', savedImage.id)
    return NextResponse.json({ 
      success: true, 
      image: savedImage 
    })

  } catch (error) {
    console.error('Error in POST /api/chat/images:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update image metadata
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body: UpdateImageRequest = await request.json()
    const { imageId, useForProduct, analysisResult } = body

    if (!imageId) {
      return NextResponse.json(
        { error: 'imageId is required' },
        { status: 400 }
      )
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (useForProduct !== undefined) {
      updateData.use_for_product = useForProduct
    }

    if (analysisResult) {
      updateData.analysis_completed = true
      updateData.analysis_description = analysisResult.description
      updateData.analysis_tags = analysisResult.suggestedTags || []
      updateData.quality_score = analysisResult.qualityScore
      updateData.suitable_for_ecommerce = analysisResult.suitableForEcommerce
      updateData.detected_objects = analysisResult.detectedObjects || []
      updateData.dominant_colors = analysisResult.colors || []
      updateData.image_style = analysisResult.style
      updateData.image_mood = analysisResult.mood
      updateData.product_relevance = analysisResult.productRelevance
      updateData.analyzed_at = new Date().toISOString()
    }

    const { data: updatedImage, error } = await supabase
      .from('chat_images')
      .update(updateData)
      .eq('id', imageId)
      .eq('user_id', user.id) // Ensure user can only update their own images
      .select()
      .single()

    if (error) {
      console.error('Error updating image:', error)
      return NextResponse.json(
        { error: 'Failed to update image' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      image: updatedImage 
    })

  } catch (error) {
    console.error('Error in PATCH /api/chat/images:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Retrieve images for a thread or message
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('threadId')
    const messageId = searchParams.get('messageId')

    if (!threadId && !messageId) {
      return NextResponse.json(
        { error: 'Either threadId or messageId is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('chat_images')
      .select('*')
      .eq('user_id', user.id)
      .eq('upload_status', 'completed')
      .order('created_at', { ascending: false })

    if (threadId) {
      query = query.eq('thread_id', threadId)
    } else if (messageId) {
      query = query.eq('message_id', messageId)
    }

    const { data: images, error } = await query

    if (error) {
      console.error('Error retrieving images:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve images' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      images: images || [] 
    })

  } catch (error) {
    console.error('Error in GET /api/chat/images:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove image
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json(
        { error: 'imageId is required' },
        { status: 400 }
      )
    }

    // Delete from database (storage cleanup would be handled separately)
    const { error } = await supabase
      .from('chat_images')
      .delete()
      .eq('id', imageId)
      .eq('user_id', user.id) // Ensure user can only delete their own images

    if (error) {
      console.error('Error deleting image:', error)
      return NextResponse.json(
        { error: 'Failed to delete image' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true 
    })

  } catch (error) {
    console.error('Error in DELETE /api/chat/images:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
