import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { adminMiddleware } from '@/lib/admin-auth'

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
    const { authorized, error } = await adminMiddleware(request)

    if (!authorized) {
      return NextResponse.json({ error }, { status: 403 })
    }

    const supabase = getSupabaseAdminClient()

    // Get all items with their details
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(`
        id,
        product_name,
        total_price,
        qty,
        unit_price,
        category_id,
        categories(name),
        receipts(
          purchased_at,
          retailers(name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (itemsError) {
      console.error('[Admin Items] Error fetching items:', itemsError)
      throw itemsError
    }

    // Transform the data to flatten the nested structure
    const transformedItems = items?.map((item: any) => ({
      id: item.id,
      product_name: item.product_name,
      total_price: item.total_price,
      qty: item.qty,
      unit_price: item.unit_price,
      category_name: item.categories?.name || null,
      purchased_at: item.receipts?.purchased_at || null,
      store_name: item.receipts?.retailers?.name || null
    })) || []

    return NextResponse.json({
      items: transformedItems,
      total: transformedItems.length
    })
  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    )
  }
}
