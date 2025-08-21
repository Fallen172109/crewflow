// Image Storage Service for CrewFlow
// Handles secure image uploads, storage, and retrieval with Supabase Storage

import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { createSupabaseClient } from '@/lib/supabase/client'

export interface ImageUploadOptions {
  userId: string
  fileName: string
  file: File | Buffer
  bucket?: string
  folder?: string
  generateThumbnail?: boolean
  maxWidth?: number
  maxHeight?: number
}

export interface ImageUploadResult {
  success: boolean
  imageUrl?: string
  thumbnailUrl?: string
  storagePath?: string
  error?: string
  metadata?: {
    width: number
    height: number
    size: number
    format: string
  }
}

export interface ImageRetrievalOptions {
  storagePath: string
  bucket?: string
  expiresIn?: number // seconds
  download?: boolean
}

export class ImageStorageService {
  private supabase
  private defaultBucket = 'chat-images'

  constructor(useServiceRole = false) {
    this.supabase = useServiceRole 
      ? createSupabaseServiceClient()
      : createSupabaseClient()
  }

  /**
   * Upload an image to Supabase Storage with user-specific organization
   */
  async uploadImage(options: ImageUploadOptions): Promise<ImageUploadResult> {
    try {
      const {
        userId,
        fileName,
        file,
        bucket = this.defaultBucket,
        folder = 'uploads',
        generateThumbnail = false,
        maxWidth,
        maxHeight
      } = options

      // Generate unique filename with user-specific path
      const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg'
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const storagePath = `user-${userId}/${folder}/${uniqueFileName}`

      console.log('📸 Uploading image:', fileName, 'to path:', storagePath)

      // Prepare file for upload
      let fileToUpload: File | Buffer
      let contentType = 'image/jpeg'

      if (file instanceof File) {
        fileToUpload = file
        contentType = file.type || 'image/jpeg'
      } else {
        fileToUpload = file
        contentType = this.getContentTypeFromExtension(fileExt)
      }

      // Upload to storage
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(storagePath, fileToUpload, {
          contentType,
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Storage upload error:', error)
        return {
          success: false,
          error: `Upload failed: ${error.message}`
        }
      }

      console.log('✅ Image uploaded successfully:', data.path)

      // Generate signed URL for secure access
      const { data: signedUrlData, error: signedUrlError } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 86400) // 24 hours

      let imageUrl: string
      if (signedUrlError) {
        console.warn('Signed URL failed, using public URL:', signedUrlError)
        const { data: publicUrlData } = this.supabase.storage
          .from(bucket)
          .getPublicUrl(storagePath)
        imageUrl = publicUrlData.publicUrl
      } else {
        imageUrl = signedUrlData.signedUrl
      }

      // Get image metadata if it's a File object
      let metadata: any = undefined
      if (file instanceof File) {
        metadata = await this.getImageMetadata(file)
      }

      return {
        success: true,
        imageUrl,
        storagePath,
        metadata
      }

    } catch (error) {
      console.error('Image upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  /**
   * Get a signed URL for an existing image
   */
  async getImageUrl(options: ImageRetrievalOptions): Promise<string | null> {
    try {
      const {
        storagePath,
        bucket = this.defaultBucket,
        expiresIn = 86400, // 24 hours
        download = false
      } = options

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, expiresIn, {
          download: download ? `image-${Date.now()}` : undefined
        })

      if (error) {
        console.error('Error creating signed URL:', error)
        // Fallback to public URL
        const { data: publicUrlData } = this.supabase.storage
          .from(bucket)
          .getPublicUrl(storagePath)
        return publicUrlData.publicUrl
      }

      return data.signedUrl
    } catch (error) {
      console.error('Error getting image URL:', error)
      return null
    }
  }

  /**
   * Delete an image from storage
   */
  async deleteImage(storagePath: string, bucket = this.defaultBucket): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([storagePath])

      if (error) {
        console.error('Error deleting image:', error)
        return false
      }

      console.log('🗑️ Image deleted:', storagePath)
      return true
    } catch (error) {
      console.error('Error deleting image:', error)
      return false
    }
  }

  /**
   * List images for a user
   */
  async listUserImages(userId: string, folder = 'uploads', bucket = this.defaultBucket) {
    try {
      const userPath = `user-${userId}/${folder}`
      
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(userPath, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) {
        console.error('Error listing images:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error listing images:', error)
      return []
    }
  }

  /**
   * Get image metadata from File object
   */
  private async getImageMetadata(file: File): Promise<any> {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: file.size,
          format: file.type
        })
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve({
          width: 0,
          height: 0,
          size: file.size,
          format: file.type
        })
      }
      
      img.src = url
    })
  }

  /**
   * Get content type from file extension
   */
  private getContentTypeFromExtension(ext: string): string {
    const contentTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'svg': 'image/svg+xml'
    }
    return contentTypes[ext.toLowerCase()] || 'image/jpeg'
  }

  /**
   * Validate image file
   */
  static validateImageFile(file: File, maxSize = 10 * 1024 * 1024): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'File must be an image' }
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024))
      return { valid: false, error: `Image must be smaller than ${maxSizeMB}MB` }
    }

    // Check supported formats
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!supportedFormats.includes(file.type.toLowerCase())) {
      return { valid: false, error: 'Supported formats: JPG, PNG, WebP, GIF' }
    }

    return { valid: true }
  }
}

// Utility functions for easy access
export const imageStorage = new ImageStorageService(true) // Use service role for server-side operations
export const clientImageStorage = new ImageStorageService(false) // Use client for client-side operations

/**
 * Quick upload function for images
 */
export async function uploadChatImage(
  userId: string,
  file: File,
  folder = 'chat-uploads'
): Promise<ImageUploadResult> {
  return imageStorage.uploadImage({
    userId,
    fileName: file.name,
    file,
    folder
  })
}

/**
 * Quick function to get image URL
 */
export async function getChatImageUrl(
  storagePath: string,
  expiresIn = 86400
): Promise<string | null> {
  return imageStorage.getImageUrl({
    storagePath,
    expiresIn
  })
}
