import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getMultiStoreMetrics, generateCrossStoreInsights, getUserStores } from '@/lib/shopify/multi-store-manager'
import { createLogger } from '@/lib/logger'

const log = createLogger('MultiStoreAnalyticsAPI')

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get timeframe from query params
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeRange') || '30d'

    log.debug('Fetching multi-store analytics', { userId: user.id, timeframe })

    // Get all user's stores for store name mapping
    const stores = await getUserStores(user.id)

    if (stores.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          metrics: [],
          insights: [],
          stores: [],
          summary: {
            totalRevenue: 0,
            totalOrders: 0,
            totalCustomers: 0,
            totalProducts: 0,
            storeCount: 0,
            topPerformer: null
          }
        }
      })
    }

    // Get metrics for all stores
    const metrics = await getMultiStoreMetrics(user.id, timeframe)

    // Generate cross-store insights (only meaningful with 2+ stores)
    const insights = stores.length >= 2
      ? await generateCrossStoreInsights(user.id)
      : []

    // Calculate summary statistics
    const totalRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0)
    const totalOrders = metrics.reduce((sum, m) => sum + m.orders, 0)
    const totalCustomers = metrics.reduce((sum, m) => sum + m.customers, 0)
    const totalProducts = metrics.reduce((sum, m) => sum + m.products, 0)

    // Find top performer
    const sortedByRevenue = [...metrics].sort((a, b) => b.revenue - a.revenue)
    const topPerformerMetric = sortedByRevenue[0]
    const topPerformerStore = topPerformerMetric
      ? stores.find(s => s.id === topPerformerMetric.storeId)
      : null

    // Enrich metrics with store details
    const enrichedMetrics = metrics.map(metric => {
      const store = stores.find(s => s.id === metric.storeId)
      return {
        ...metric,
        storeName: store?.storeName || 'Unknown Store',
        shopDomain: store?.shopDomain || '',
        currency: store?.currency || 'USD',
        isPrimary: store?.isPrimary || false,
        isActive: store?.isActive || false,
        syncStatus: store?.syncStatus || 'never'
      }
    })

    // Sort by revenue descending
    enrichedMetrics.sort((a, b) => b.revenue - a.revenue)

    log.debug('Multi-store analytics fetched successfully', {
      storeCount: stores.length,
      metricsCount: metrics.length,
      insightsCount: insights.length,
      totalRevenue
    })

    return NextResponse.json({
      success: true,
      data: {
        metrics: enrichedMetrics,
        insights,
        stores: stores.map(s => ({
          id: s.id,
          name: s.storeName,
          domain: s.shopDomain,
          currency: s.currency,
          isPrimary: s.isPrimary,
          isActive: s.isActive
        })),
        summary: {
          totalRevenue,
          totalOrders,
          totalCustomers,
          totalProducts,
          storeCount: stores.length,
          activeStoreCount: stores.filter(s => s.isActive).length,
          topPerformer: topPerformerStore ? {
            id: topPerformerStore.id,
            name: topPerformerStore.storeName,
            revenue: topPerformerMetric?.revenue || 0
          } : null,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          currencies: [...new Set(stores.map(s => s.currency))]
        }
      }
    })

  } catch (error) {
    log.error('Error fetching multi-store analytics:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics'
      },
      { status: 500 }
    )
  }
}
