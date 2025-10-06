import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { adminMiddleware, logAdminActivity } from '@/lib/admin-auth'

function getSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const { authorized, session, error } = await adminMiddleware(request)

    if (!authorized) {
      return NextResponse.json({ error }, { status: 403 })
    }

    const supabase = getSupabaseAdminClient()

    // Get real-time system metrics
    console.log('[Admin Metrics] Fetching system metrics...')
    const { data: metrics, error: metricsError } = await supabase.rpc('get_system_metrics')

    if (metricsError) {
      console.error('[Admin Metrics] Error details:', {
        message: metricsError.message,
        code: metricsError.code,
        details: metricsError.details,
        hint: metricsError.hint
      })
      throw metricsError
    }
    console.log('[Admin Metrics] System metrics fetched successfully:', metrics)

    // Get top stores
    console.log('[Admin Metrics] Fetching top stores...')
    const { data: topStores, error: storesError } = await supabase.rpc('get_top_stores', { limit_count: 10 })

    if (storesError) {
      console.error('[Admin Metrics] Error fetching top stores:', storesError)
      throw storesError
    }
    console.log('[Admin Metrics] Top stores fetched successfully, count:', topStores?.length)

    // Get category spending
    console.log('[Admin Metrics] Fetching category spending...')
    const { data: categorySpending, error: categoryError } = await supabase.rpc('get_category_spending')

    if (categoryError) {
      console.error('[Admin Metrics] Error fetching category spending:', categoryError)
      throw categoryError
    }
    console.log('[Admin Metrics] Category spending fetched successfully, count:', categorySpending?.length)

    // Get recent errors
    const { data: recentErrors, error: errorsError } = await supabase
      .from('receipts')
      .select('id, processing_status, created_at, retailers(name)')
      .in('processing_status', ['failed'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (errorsError) {
      throw errorsError
    }

    // Log this admin activity
    await logAdminActivity('view_metrics', 'system_metrics', undefined, {}, request)

    return NextResponse.json({
      metrics,
      topStores,
      categorySpending,
      recentErrors
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching admin metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
