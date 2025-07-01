import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface FileAttachment {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  publicUrl: string
  metadata: Record<string, any>
}

export interface FileAnalysisResult {
  summary: string
  content?: string
  insights: string[]
  fileType: 'image' | 'document' | 'spreadsheet' | 'text' | 'other'
  isAnalyzable: boolean
}

/**
 * Analyze file attachments and provide context for AI agents
 */
export async function analyzeFileAttachments(
  attachments: FileAttachment[]
): Promise<Record<string, FileAnalysisResult>> {
  const results: Record<string, FileAnalysisResult> = {}

  if (!attachments || attachments.length === 0) {
    return results
  }

  for (const attachment of attachments) {
    try {
      // Validate attachment data
      if (!attachment.id || !attachment.fileName || !attachment.fileType) {
        throw new Error('Invalid attachment data - missing required fields')
      }

      if (!attachment.publicUrl) {
        throw new Error('File URL not available - file may not be properly uploaded')
      }

      const analysis = await analyzeFile(attachment)
      results[attachment.id] = analysis

      console.log(`Successfully analyzed file: ${attachment.fileName} (${analysis.fileType})`)

    } catch (error) {
      console.error(`Error analyzing file ${attachment.fileName}:`, error)

      // Provide more helpful error messages
      let errorMessage = 'Unknown error occurred'
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Unable to access file - it may have been moved or deleted'
        } else if (error.message.includes('Invalid')) {
          errorMessage = error.message
        } else {
          errorMessage = `Analysis failed: ${error.message}`
        }
      }

      results[attachment.id] = {
        summary: `⚠️ ${attachment.fileName} (Analysis Error)`,
        insights: [
          `File type: ${attachment.fileType}`,
          `Size: ${formatFileSize(attachment.fileSize)}`,
          `Error: ${errorMessage}`,
          'Basic file information is still available for reference'
        ],
        fileType: getFileType(attachment.fileType),
        isAnalyzable: false
      }
    }
  }

  console.log(`File analysis complete: ${Object.keys(results).length} files processed`)
  return results
}

/**
 * Analyze a single file attachment
 */
async function analyzeFile(attachment: FileAttachment): Promise<FileAnalysisResult> {
  const fileType = getFileType(attachment.fileType)
  
  switch (fileType) {
    case 'image':
      return analyzeImage(attachment)
    case 'document':
      return analyzeDocument(attachment)
    case 'text':
      return analyzeTextFile(attachment)
    case 'spreadsheet':
      return analyzeSpreadsheet(attachment)
    default:
      return {
        summary: `${attachment.fileName} (${formatFileSize(attachment.fileSize)})`,
        insights: [`File type: ${attachment.fileType}`, 'Content analysis not available for this file type'],
        fileType,
        isAnalyzable: false
      }
  }
}

/**
 * Analyze image files
 */
async function analyzeImage(attachment: FileAttachment): Promise<FileAnalysisResult> {
  const insights: string[] = []
  
  // Basic image info
  insights.push(`Image file: ${attachment.fileName}`)
  insights.push(`Size: ${formatFileSize(attachment.fileSize)}`)
  insights.push(`Format: ${attachment.fileType}`)
  
  // Extract metadata if available
  if (attachment.metadata) {
    if (attachment.metadata.width && attachment.metadata.height) {
      insights.push(`Dimensions: ${attachment.metadata.width}x${attachment.metadata.height}`)
    }
    if (attachment.metadata.colorSpace) {
      insights.push(`Color space: ${attachment.metadata.colorSpace}`)
    }
  }

  return {
    summary: `Image: ${attachment.fileName} (${formatFileSize(attachment.fileSize)})`,
    insights,
    fileType: 'image',
    isAnalyzable: true
  }
}

/**
 * Analyze document files (PDF, Word, etc.)
 */
async function analyzeDocument(attachment: FileAttachment): Promise<FileAnalysisResult> {
  const insights: string[] = []
  let content: string | undefined
  let isAnalyzable = false

  insights.push(`Document: ${attachment.fileName}`)
  insights.push(`Size: ${formatFileSize(attachment.fileSize)}`)
  insights.push(`Type: ${attachment.fileType}`)

  try {
    // Attempt to extract text content based on file type
    if (attachment.fileType === 'application/pdf') {
      content = await extractPDFText(attachment)
      if (content) {
        isAnalyzable = true
        const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
        const pageEstimate = Math.ceil(wordCount / 250) // Rough estimate: 250 words per page
        insights.push(`Estimated pages: ${pageEstimate}`)
        insights.push(`Word count: ${wordCount}`)

        // Analyze document structure
        if (content.includes('Table of Contents') || content.includes('Contents')) {
          insights.push('Contains table of contents')
        }
        if (content.match(/\b(chapter|section|part)\s+\d+/i)) {
          insights.push('Structured document with chapters/sections')
        }
        if (content.includes('©') || content.includes('copyright')) {
          insights.push('Contains copyright information')
        }
      }
    } else if (attachment.fileType.includes('word') || attachment.fileType.includes('document')) {
      // For Word documents, we'll provide basic analysis without content extraction
      // This could be enhanced with proper Word document parsing libraries
      insights.push('Word document detected - content extraction requires additional processing')
      insights.push('Document may contain formatted text, images, and tables')
    }

    if (!content) {
      insights.push('Text extraction not available for this document type')
      insights.push('Document metadata and basic analysis provided')
    }

  } catch (error) {
    console.error(`Error analyzing document ${attachment.fileName}:`, error)
    insights.push(`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    insights.push('Basic document information provided')
  }

  return {
    summary: `Document: ${attachment.fileName} (${formatFileSize(attachment.fileSize)})${isAnalyzable ? ' - Content analyzed' : ' - Metadata only'}`,
    content: content?.substring(0, 3000), // Limit content for context, increased from 2000
    insights,
    fileType: 'document',
    isAnalyzable
  }
}

/**
 * Extract text content from PDF files
 * This is a simplified implementation - in production, you'd use a proper PDF parsing library
 */
async function extractPDFText(attachment: FileAttachment): Promise<string | null> {
  try {
    // For now, we'll attempt to fetch the PDF and provide basic analysis
    // In a production environment, you would use libraries like pdf-parse or pdf2pic
    const response = await fetch(attachment.publicUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Simple text extraction attempt - look for readable text patterns
    // This is very basic and won't work for all PDFs
    const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array)

    // Filter out binary data and extract readable text
    const readableText = text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .replace(/[^\x20-\x7E\s]/g, '') // Keep only printable ASCII and whitespace
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    // If we found readable text (more than just a few characters), return it
    if (readableText.length > 50) {
      return readableText
    }

    return null
  } catch (error) {
    console.error('PDF text extraction error:', error)
    return null
  }
}

/**
 * Analyze text files
 */
async function analyzeTextFile(attachment: FileAttachment): Promise<FileAnalysisResult> {
  const insights: string[] = []
  let content: string | undefined
  
  try {
    // Fetch and read text content
    const response = await fetch(attachment.publicUrl)
    if (response.ok) {
      content = await response.text()
      
      // Basic text analysis
      const lines = content.split('\n').length
      const words = content.split(/\s+/).filter(word => word.length > 0).length
      const chars = content.length
      
      insights.push(`Text file: ${attachment.fileName}`)
      insights.push(`Lines: ${lines}, Words: ${words}, Characters: ${chars}`)
      
      // Detect file format patterns
      if (content.includes('{') && content.includes('}')) {
        insights.push('Appears to contain JSON data')
      }
      if (content.includes(',') && content.split('\n')[0]?.includes(',')) {
        insights.push('Appears to be CSV format')
      }
      if (content.includes('```') || content.includes('function') || content.includes('class')) {
        insights.push('Appears to contain code')
      }
    }
  } catch (error) {
    insights.push('Unable to read file content')
  }
  
  return {
    summary: `Text file: ${attachment.fileName} (${formatFileSize(attachment.fileSize)})`,
    content: content?.substring(0, 2000), // Limit content for context
    insights,
    fileType: 'text',
    isAnalyzable: true
  }
}

/**
 * Analyze spreadsheet files
 */
async function analyzeSpreadsheet(attachment: FileAttachment): Promise<FileAnalysisResult> {
  const insights: string[] = []
  
  insights.push(`Spreadsheet: ${attachment.fileName}`)
  insights.push(`Size: ${formatFileSize(attachment.fileSize)}`)
  insights.push(`Type: ${attachment.fileType}`)
  
  // Spreadsheet analysis would require libraries like xlsx or similar
  insights.push('Spreadsheet content analysis requires additional processing')
  
  return {
    summary: `Spreadsheet: ${attachment.fileName} (${formatFileSize(attachment.fileSize)})`,
    insights,
    fileType: 'spreadsheet',
    isAnalyzable: false // Could be true with proper parsing
  }
}

/**
 * Determine file type category from MIME type
 */
function getFileType(mimeType: string): FileAnalysisResult['fileType'] {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document')) return 'document'
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'spreadsheet'
  if (mimeType.startsWith('text/') || mimeType.includes('json')) return 'text'
  return 'other'
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get file attachments for a thread or message
 */
export async function getFileAttachments(
  threadId?: string,
  messageId?: string,
  userId?: string
): Promise<FileAttachment[]> {
  if (!threadId && !messageId) return []

  const supabase = createSupabaseServerClient()
  
  let query = supabase
    .from('chat_attachments')
    .select('*')
    .order('created_at', { ascending: true })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  if (threadId) {
    query = query.eq('thread_id', threadId)
  } else if (messageId) {
    query = query.eq('message_id', messageId)
  }

  const { data: attachments, error } = await query

  if (error) {
    console.error('Error fetching attachments:', error)
    return []
  }

  return (attachments || []).map(att => ({
    id: att.id,
    fileName: att.file_name,
    fileType: att.file_type,
    fileSize: att.file_size,
    publicUrl: att.public_url || '',
    metadata: att.metadata || {}
  }))
}

/**
 * Create context string from file analysis for AI agents
 */
export function createFileContext(
  analyses: Record<string, FileAnalysisResult>
): string {
  const fileCount = Object.keys(analyses).length
  if (fileCount === 0) return ''

  let context = `\n\n📎 **Attached Files (${fileCount}):**\n\n`

  Object.values(analyses).forEach((analysis, index) => {
    context += `**${index + 1}. ${analysis.summary}**\n`

    // Add insights in a more readable format
    if (analysis.insights.length > 0) {
      context += `   • ${analysis.insights.join('\n   • ')}\n`
    }

    // Add content preview if available
    if (analysis.content) {
      const preview = analysis.content.substring(0, 500)
      context += `\n   **Content Preview:**\n   "${preview}${analysis.content.length > 500 ? '...' : ''}"\n`
    }

    context += '\n'
  })

  context += '**Instructions:** Please analyze and reference these files in your response. '
  context += 'Provide specific insights based on the file contents and structure when relevant.\n'

  return context
}
