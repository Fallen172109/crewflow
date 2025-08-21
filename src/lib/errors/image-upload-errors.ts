// Image Upload Error Handling
// Comprehensive error handling for image upload operations

export enum ImageUploadErrorCode {
  // Authentication errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  
  // File validation errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_TYPE_INVALID = 'FILE_TYPE_INVALID',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  FILE_EMPTY = 'FILE_EMPTY',
  
  // Upload errors
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  STORAGE_FULL = 'STORAGE_FULL',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // Analysis errors
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  ANALYSIS_TIMEOUT = 'ANALYSIS_TIMEOUT',
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  SAVE_FAILED = 'SAVE_FAILED',
  
  // Security errors
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ImageUploadError {
  code: ImageUploadErrorCode
  message: string
  details?: any
  retryable: boolean
  userMessage: string
}

export class ImageUploadErrorHandler {
  static createError(
    code: ImageUploadErrorCode, 
    message: string, 
    details?: any
  ): ImageUploadError {
    const errorMap: Record<ImageUploadErrorCode, { retryable: boolean; userMessage: string }> = {
      [ImageUploadErrorCode.AUTH_REQUIRED]: {
        retryable: false,
        userMessage: 'Please sign in to upload images.'
      },
      [ImageUploadErrorCode.AUTH_INVALID]: {
        retryable: false,
        userMessage: 'Your session has expired. Please sign in again.'
      },
      [ImageUploadErrorCode.FILE_TOO_LARGE]: {
        retryable: false,
        userMessage: 'Image file is too large. Please choose a smaller image.'
      },
      [ImageUploadErrorCode.FILE_TYPE_INVALID]: {
        retryable: false,
        userMessage: 'Invalid file type. Please upload JPG, PNG, WebP, or GIF images.'
      },
      [ImageUploadErrorCode.FILE_CORRUPTED]: {
        retryable: false,
        userMessage: 'The image file appears to be corrupted. Please try a different image.'
      },
      [ImageUploadErrorCode.FILE_EMPTY]: {
        retryable: false,
        userMessage: 'The image file is empty. Please choose a valid image.'
      },
      [ImageUploadErrorCode.UPLOAD_FAILED]: {
        retryable: true,
        userMessage: 'Upload failed. Please try again.'
      },
      [ImageUploadErrorCode.STORAGE_FULL]: {
        retryable: false,
        userMessage: 'Storage limit reached. Please contact support or delete some images.'
      },
      [ImageUploadErrorCode.NETWORK_ERROR]: {
        retryable: true,
        userMessage: 'Network error. Please check your connection and try again.'
      },
      [ImageUploadErrorCode.TIMEOUT]: {
        retryable: true,
        userMessage: 'Upload timed out. Please try again with a smaller image.'
      },
      [ImageUploadErrorCode.ANALYSIS_FAILED]: {
        retryable: true,
        userMessage: 'Image analysis failed. The image was uploaded but analysis is unavailable.'
      },
      [ImageUploadErrorCode.ANALYSIS_TIMEOUT]: {
        retryable: true,
        userMessage: 'Image analysis timed out. The image was uploaded successfully.'
      },
      [ImageUploadErrorCode.AI_SERVICE_UNAVAILABLE]: {
        retryable: true,
        userMessage: 'AI analysis service is temporarily unavailable. Image uploaded without analysis.'
      },
      [ImageUploadErrorCode.DATABASE_ERROR]: {
        retryable: true,
        userMessage: 'Database error. Please try again.'
      },
      [ImageUploadErrorCode.SAVE_FAILED]: {
        retryable: true,
        userMessage: 'Failed to save image metadata. Please try again.'
      },
      [ImageUploadErrorCode.SECURITY_VIOLATION]: {
        retryable: false,
        userMessage: 'Security violation detected. Please contact support.'
      },
      [ImageUploadErrorCode.RATE_LIMIT_EXCEEDED]: {
        retryable: true,
        userMessage: 'Too many uploads. Please wait a moment and try again.'
      },
      [ImageUploadErrorCode.UNKNOWN_ERROR]: {
        retryable: true,
        userMessage: 'An unexpected error occurred. Please try again.'
      }
    }

    const errorInfo = errorMap[code]
    
    return {
      code,
      message,
      details,
      retryable: errorInfo.retryable,
      userMessage: errorInfo.userMessage
    }
  }

  static handleUploadError(error: any): ImageUploadError {
    console.error('Image upload error:', error)

    // Network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return this.createError(
        ImageUploadErrorCode.NETWORK_ERROR,
        'Network connection failed',
        error
      )
    }

    // HTTP errors
    if (error.status) {
      switch (error.status) {
        case 401:
          return this.createError(
            ImageUploadErrorCode.AUTH_REQUIRED,
            'Authentication required',
            error
          )
        case 403:
          return this.createError(
            ImageUploadErrorCode.SECURITY_VIOLATION,
            'Access forbidden',
            error
          )
        case 413:
          return this.createError(
            ImageUploadErrorCode.FILE_TOO_LARGE,
            'File too large',
            error
          )
        case 415:
          return this.createError(
            ImageUploadErrorCode.FILE_TYPE_INVALID,
            'Unsupported file type',
            error
          )
        case 429:
          return this.createError(
            ImageUploadErrorCode.RATE_LIMIT_EXCEEDED,
            'Rate limit exceeded',
            error
          )
        case 507:
          return this.createError(
            ImageUploadErrorCode.STORAGE_FULL,
            'Storage full',
            error
          )
        default:
          return this.createError(
            ImageUploadErrorCode.UPLOAD_FAILED,
            `Upload failed with status ${error.status}`,
            error
          )
      }
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return this.createError(
        ImageUploadErrorCode.TIMEOUT,
        'Upload timed out',
        error
      )
    }

    // File validation errors
    if (error.message?.includes('file size') || error.message?.includes('too large')) {
      return this.createError(
        ImageUploadErrorCode.FILE_TOO_LARGE,
        'File too large',
        error
      )
    }

    if (error.message?.includes('file type') || error.message?.includes('format')) {
      return this.createError(
        ImageUploadErrorCode.FILE_TYPE_INVALID,
        'Invalid file type',
        error
      )
    }

    // AI/Analysis errors
    if (error.message?.includes('analysis') || error.message?.includes('AI')) {
      return this.createError(
        ImageUploadErrorCode.ANALYSIS_FAILED,
        'Image analysis failed',
        error
      )
    }

    // Database errors
    if (error.message?.includes('database') || error.message?.includes('supabase')) {
      return this.createError(
        ImageUploadErrorCode.DATABASE_ERROR,
        'Database error',
        error
      )
    }

    // Default to unknown error
    return this.createError(
      ImageUploadErrorCode.UNKNOWN_ERROR,
      error.message || 'Unknown error occurred',
      error
    )
  }

  static handleAnalysisError(error: any): ImageUploadError {
    console.error('Image analysis error:', error)

    if (error.message?.includes('rate limit')) {
      return this.createError(
        ImageUploadErrorCode.RATE_LIMIT_EXCEEDED,
        'AI service rate limit exceeded',
        error
      )
    }

    if (error.message?.includes('timeout')) {
      return this.createError(
        ImageUploadErrorCode.ANALYSIS_TIMEOUT,
        'Analysis timed out',
        error
      )
    }

    if (error.message?.includes('quota') || error.message?.includes('unavailable')) {
      return this.createError(
        ImageUploadErrorCode.AI_SERVICE_UNAVAILABLE,
        'AI service unavailable',
        error
      )
    }

    return this.createError(
      ImageUploadErrorCode.ANALYSIS_FAILED,
      'Image analysis failed',
      error
    )
  }

  static shouldRetry(error: ImageUploadError, attemptCount: number): boolean {
    const maxRetries = 3
    return error.retryable && attemptCount < maxRetries
  }

  static getRetryDelay(attemptCount: number): number {
    // Exponential backoff: 1s, 2s, 4s
    return Math.pow(2, attemptCount) * 1000
  }
}

// Utility function for easy error handling
export function handleImageUploadError(error: any): ImageUploadError {
  return ImageUploadErrorHandler.handleUploadError(error)
}

export function handleImageAnalysisError(error: any): ImageUploadError {
  return ImageUploadErrorHandler.handleAnalysisError(error)
}
