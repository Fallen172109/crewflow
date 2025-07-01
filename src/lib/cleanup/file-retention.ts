import { createSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * Clean up file attachments older than 30 days
 * This function should be called periodically (e.g., daily via cron job)
 */
export async function cleanupExpiredAttachments(): Promise<{
  success: boolean
  deletedFiles: number
  deletedRecords: number
  errors: string[]
}> {
  const supabase = createSupabaseServiceClient()
  const errors: string[] = []
  let deletedFiles = 0
  let deletedRecords = 0

  try {
    // Calculate 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    console.log(`Starting file cleanup for attachments older than ${thirtyDaysAgo.toISOString()}`)

    // Get expired attachments
    const { data: expiredAttachments, error: fetchError } = await supabase
      .from('chat_attachments')
      .select('*')
      .lt('created_at', thirtyDaysAgo.toISOString())

    if (fetchError) {
      errors.push(`Failed to fetch expired attachments: ${fetchError.message}`)
      return { success: false, deletedFiles: 0, deletedRecords: 0, errors }
    }

    if (!expiredAttachments || expiredAttachments.length === 0) {
      console.log('No expired attachments found')
      return { success: true, deletedFiles: 0, deletedRecords: 0, errors: [] }
    }

    console.log(`Found ${expiredAttachments.length} expired attachments`)

    // Delete files from storage
    const filesToDelete: string[] = []
    for (const attachment of expiredAttachments) {
      if (attachment.storage_path) {
        filesToDelete.push(attachment.storage_path)
      }
    }

    if (filesToDelete.length > 0) {
      try {
        // Delete from storage in batches (Supabase has limits)
        const batchSize = 100
        for (let i = 0; i < filesToDelete.length; i += batchSize) {
          const batch = filesToDelete.slice(i, i + batchSize)
          
          const { error: storageError } = await supabase.storage
            .from('generated-images') // TODO: Use proper bucket when created
            .remove(batch)

          if (storageError) {
            errors.push(`Failed to delete storage batch ${i / batchSize + 1}: ${storageError.message}`)
          } else {
            deletedFiles += batch.length
          }
        }
      } catch (error) {
        errors.push(`Storage deletion error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Delete database records
    const { error: deleteError } = await supabase
      .from('chat_attachments')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())

    if (deleteError) {
      errors.push(`Failed to delete attachment records: ${deleteError.message}`)
    } else {
      deletedRecords = expiredAttachments.length
    }

    console.log(`Cleanup completed: ${deletedFiles} files deleted, ${deletedRecords} records deleted`)

    return {
      success: errors.length === 0,
      deletedFiles,
      deletedRecords,
      errors
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`Cleanup process error: ${errorMessage}`)
    
    return {
      success: false,
      deletedFiles,
      deletedRecords,
      errors
    }
  }
}

/**
 * Clean up orphaned attachments (attachments without valid thread or message references)
 */
export async function cleanupOrphanedAttachments(): Promise<{
  success: boolean
  deletedFiles: number
  deletedRecords: number
  errors: string[]
}> {
  const supabase = createSupabaseServiceClient()
  const errors: string[] = []
  let deletedFiles = 0
  let deletedRecords = 0

  try {
    console.log('Starting orphaned attachments cleanup')

    // Find attachments with invalid thread references
    const { data: orphanedByThread, error: threadError } = await supabase
      .from('chat_attachments')
      .select('*')
      .not('thread_id', 'is', null)
      .not('thread_id', 'in', `(SELECT id FROM chat_threads)`)

    if (threadError) {
      errors.push(`Failed to find orphaned thread attachments: ${threadError.message}`)
    }

    // Find attachments with invalid message references
    const { data: orphanedByMessage, error: messageError } = await supabase
      .from('chat_attachments')
      .select('*')
      .not('message_id', 'is', null)
      .not('message_id', 'in', `(SELECT id FROM chat_history)`)

    if (messageError) {
      errors.push(`Failed to find orphaned message attachments: ${messageError.message}`)
    }

    const allOrphaned = [
      ...(orphanedByThread || []),
      ...(orphanedByMessage || [])
    ]

    if (allOrphaned.length === 0) {
      console.log('No orphaned attachments found')
      return { success: true, deletedFiles: 0, deletedRecords: 0, errors }
    }

    console.log(`Found ${allOrphaned.length} orphaned attachments`)

    // Delete orphaned files from storage
    const orphanedFiles = allOrphaned
      .filter(att => att.storage_path)
      .map(att => att.storage_path)

    if (orphanedFiles.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('generated-images') // TODO: Use proper bucket when created
        .remove(orphanedFiles)

      if (storageError) {
        errors.push(`Failed to delete orphaned files: ${storageError.message}`)
      } else {
        deletedFiles = orphanedFiles.length
      }
    }

    // Delete orphaned records
    const orphanedIds = allOrphaned.map(att => att.id)
    if (orphanedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('chat_attachments')
        .delete()
        .in('id', orphanedIds)

      if (deleteError) {
        errors.push(`Failed to delete orphaned records: ${deleteError.message}`)
      } else {
        deletedRecords = orphanedIds.length
      }
    }

    console.log(`Orphaned cleanup completed: ${deletedFiles} files deleted, ${deletedRecords} records deleted`)

    return {
      success: errors.length === 0,
      deletedFiles,
      deletedRecords,
      errors
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`Orphaned cleanup error: ${errorMessage}`)
    
    return {
      success: false,
      deletedFiles,
      deletedRecords,
      errors
    }
  }
}

/**
 * Run all file cleanup tasks
 */
export async function runFileCleanup(): Promise<{
  success: boolean
  totalDeletedFiles: number
  totalDeletedRecords: number
  errors: string[]
}> {
  console.log('Starting comprehensive file cleanup')

  const expiredResult = await cleanupExpiredAttachments()
  const orphanedResult = await cleanupOrphanedAttachments()

  const allErrors = [...expiredResult.errors, ...orphanedResult.errors]
  const totalDeletedFiles = expiredResult.deletedFiles + orphanedResult.deletedFiles
  const totalDeletedRecords = expiredResult.deletedRecords + orphanedResult.deletedRecords

  console.log(`File cleanup completed: ${totalDeletedFiles} files deleted, ${totalDeletedRecords} records deleted`)
  
  if (allErrors.length > 0) {
    console.error('File cleanup errors:', allErrors)
  }

  return {
    success: allErrors.length === 0,
    totalDeletedFiles,
    totalDeletedRecords,
    errors: allErrors
  }
}
