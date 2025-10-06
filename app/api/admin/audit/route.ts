import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { adminMiddleware, logAdminActivity } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization (only super_admin can view audit logs)
    const { authorized, session, error } = await adminMiddleware(request, 'super_admin')

    if (!authorized) {
      return NextResponse.json({ error }, { status: 403 })
    }

    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const action = searchParams.get('action') || null
    const adminId = searchParams.get('admin_id') || null
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact' })

    // Add filters
    if (action) {
      query = query.eq('action', action)
    }
    if (adminId) {
      query = query.eq('admin_id', adminId)
    }

    // Execute query with pagination
    const { data: logs, error: logsError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (logsError) {
      throw logsError
    }

    // Log this admin activity
    await logAdminActivity(
      'view_audit_logs',
      'audit_log',
      undefined,
      { page, limit, action, adminId },
      request
    )

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
