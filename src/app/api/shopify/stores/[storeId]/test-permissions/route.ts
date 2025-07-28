import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { 
  validateStorePermission, 
  getStorePermissionStatus,
  validateMultipleStorePermissions,
  logPermissionCheck
} from '@/lib/shopify/store-permission-validator'

/**
 * Test endpoint to verify store permissions are working correctly
 * This endpoint demonstrates how permission validation should be used
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { storeId } = await params
    const body = await request.json()
    const { action, permission, agentId } = body

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    console.log('🧪 Testing store permissions:', { storeId, action, permission, agentId })

    switch (action) {
      case 'check_permission':
        if (!permission) {
          return NextResponse.json(
            { error: 'Permission is required for check_permission action' },
            { status: 400 }
          )
        }

        const validation = await validateStorePermission({
          storeId,
          userId: user.id,
          permission,
          agentId
        })

        // Log the permission check
        await logPermissionCheck(
          storeId,
          user.id,
          permission,
          validation.allowed,
          validation.reason,
          agentId
        )

        return NextResponse.json({
          success: true,
          permission,
          agentId,
          allowed: validation.allowed,
          reason: validation.reason,
          storeActive: validation.storeData?.is_active,
          message: validation.allowed 
            ? `Permission '${permission}' is allowed${agentId ? ` for agent '${agentId}'` : ''}` 
            : `Permission '${permission}' is denied: ${validation.reason}`
        })

      case 'check_multiple':
        const permissions = body.permissions
        if (!permissions || !Array.isArray(permissions)) {
          return NextResponse.json(
            { error: 'Permissions array is required for check_multiple action' },
            { status: 400 }
          )
        }

        const multipleResults = await validateMultipleStorePermissions(
          storeId,
          user.id,
          permissions,
          agentId
        )

        // Log each permission check
        for (const [perm, result] of Object.entries(multipleResults)) {
          await logPermissionCheck(
            storeId,
            user.id,
            perm,
            result.allowed,
            result.reason,
            agentId
          )
        }

        return NextResponse.json({
          success: true,
          permissions: multipleResults,
          summary: {
            total: permissions.length,
            allowed: Object.values(multipleResults).filter(r => r.allowed).length,
            denied: Object.values(multipleResults).filter(r => !r.allowed).length
          }
        })

      case 'get_status':
        const status = await getStorePermissionStatus(storeId, user.id, agentId)
        
        return NextResponse.json({
          success: true,
          status
        })

      case 'simulate_api_call':
        // Simulate what would happen if an agent tried to make an API call
        const requiredPermission = body.requiredPermission || 'read_products'
        
        const apiValidation = await validateStorePermission({
          storeId,
          userId: user.id,
          permission: requiredPermission,
          agentId
        })

        await logPermissionCheck(
          storeId,
          user.id,
          requiredPermission,
          apiValidation.allowed,
          apiValidation.reason,
          agentId
        )

        if (!apiValidation.allowed) {
          return NextResponse.json({
            success: false,
            error: 'API call would be blocked',
            reason: apiValidation.reason,
            permission: requiredPermission,
            agentId
          }, { status: 403 })
        }

        return NextResponse.json({
          success: true,
          message: 'API call would be allowed',
          permission: requiredPermission,
          agentId,
          simulatedResponse: {
            data: 'This would be the actual API response',
            timestamp: new Date().toISOString()
          }
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: check_permission, check_multiple, get_status, simulate_api_call' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ Error in permission test endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get permission test results and audit log
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { storeId } = await params
    const url = new URL(request.url)
    const includeAuditLog = url.searchParams.get('includeAuditLog') === 'true'

    // Get current store status
    const status = await getStorePermissionStatus(storeId, user.id)

    const response: any = {
      success: true,
      storeId,
      status
    }

    // Include audit log if requested
    if (includeAuditLog) {
      const { data: auditLog } = await supabase
        .from('permission_audit_log')
        .select('*')
        .eq('store_id', storeId)
        .eq('user_id', user.id)
        .order('checked_at', { ascending: false })
        .limit(50)

      response.auditLog = auditLog || []
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error getting permission test results:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
