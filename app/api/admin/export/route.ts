import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { adminMiddleware, logAdminActivity } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const { authorized, session, error } = await adminMiddleware(request)

    if (!authorized) {
      return NextResponse.json({ error }, { status: 403 })
    }

    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)

    const format = searchParams.get('format') || 'json' // json, csv
    const dataType = searchParams.get('type') || 'metrics' // metrics, users, receipts
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let data: any = null
    let filename = `export-${dataType}-${new Date().toISOString().split('T')[0]}`

    switch (dataType) {
      case 'metrics':
        const { data: metrics } = await supabase.rpc('get_system_metrics')
        const { data: topStores } = await supabase.rpc('get_top_stores', { limit_count: 50 })
        const { data: categorySpending } = await supabase.rpc('get_category_spending')

        data = {
          metrics,
          topStores,
          categorySpending,
          exportedAt: new Date().toISOString()
        }
        break

      case 'users':
        let userQuery = supabase
          .from('auth.users')
          .select('id, email, created_at, last_sign_in_at, email_confirmed_at')

        if (startDate) {
          userQuery = userQuery.gte('created_at', startDate)
        }
        if (endDate) {
          userQuery = userQuery.lte('created_at', endDate)
        }

        const { data: users } = await userQuery.order('created_at', { ascending: false })
        data = users
        break

      case 'receipts':
        let receiptQuery = supabase
          .from('receipts')
          .select('id, user_id, merchant_name, total_amount, category, status, created_at')

        if (startDate) {
          receiptQuery = receiptQuery.gte('created_at', startDate)
        }
        if (endDate) {
          receiptQuery = receiptQuery.lte('created_at', endDate)
        }

        const { data: receipts } = await receiptQuery
          .order('created_at', { ascending: false })
          .limit(10000)

        data = receipts
        break

      default:
        return NextResponse.json({ error: 'Invalid data type' }, { status: 400 })
    }

    // Log this admin activity
    await logAdminActivity(
      'export_data',
      'export',
      undefined,
      { format, dataType, startDate, endDate },
      request
    )

    // Return data in requested format
    if (format === 'csv') {
      const csv = convertToCSV(data)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`
        }
      })
    } else {
      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`
        }
      })
    }
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}

function convertToCSV(data: any): string {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return ''
  }

  // Handle array of objects
  if (Array.isArray(data)) {
    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header]
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(value).replace(/"/g, '""')
          return escaped.includes(',') ? `"${escaped}"` : escaped
        }).join(',')
      )
    ]
    return csvRows.join('\n')
  }

  // Handle single object (like metrics)
  const rows = Object.entries(data).map(([key, value]) => {
    if (typeof value === 'object') {
      return `${key},"${JSON.stringify(value).replace(/"/g, '""')}"`
    }
    return `${key},${value}`
  })
  return ['Key,Value', ...rows].join('\n')
}
