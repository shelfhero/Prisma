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

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('auth.users')
      .select('id, email, created_at, last_sign_in_at, email_confirmed_at', { count: 'exact' })

    // Add search filter if provided
    if (search) {
      query = query.ilike('email', `%${search}%`)
    }

    // Execute query with pagination
    const { data: users, error: usersError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (usersError) {
      throw usersError
    }

    // Get receipt counts for each user
    const userIds = users?.map(u => u.id) || []
    const { data: receiptCounts, error: countsError } = await supabase
      .from('receipts')
      .select('user_id')
      .in('user_id', userIds)

    const receiptCountMap = (receiptCounts || []).reduce((acc, r) => {
      acc[r.user_id] = (acc[r.user_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Combine user data with receipt counts
    const usersWithStats = users?.map(user => ({
      ...user,
      receipt_count: receiptCountMap[user.id] || 0
    }))

    // Log this admin activity
    await logAdminActivity(
      'view_users',
      'users',
      undefined,
      { page, limit, search },
      request
    )

    return NextResponse.json({
      users: usersWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// Get specific user details
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const { authorized, session, error } = await adminMiddleware(request)

    if (!authorized) {
      return NextResponse.json({ error }, { status: 403 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('auth.users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) {
      throw userError
    }

    // Get user's receipts
    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select('id, merchant_name, total_amount, category, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (receiptsError) {
      throw receiptsError
    }

    // Get user's budget settings
    const { data: budgets, error: budgetsError } = await supabase
      .from('user_budgets')
      .select('*')
      .eq('user_id', userId)

    // Calculate user statistics
    const totalSpent = receipts?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0
    const categoryCounts = receipts?.reduce((acc, r) => {
      acc[r.category || 'unknown'] = (acc[r.category || 'unknown'] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Log this admin activity
    await logAdminActivity(
      'view_user_details',
      'user',
      userId,
      {},
      request
    )

    return NextResponse.json({
      user,
      receipts,
      budgets: budgets || [],
      stats: {
        total_receipts: receipts?.length || 0,
        total_spent: totalSpent,
        category_distribution: categoryCounts
      }
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching user details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    )
  }
}
