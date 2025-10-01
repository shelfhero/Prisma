import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-simple';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Test basic connection
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        debug: { authError: authError?.message }
      });
    }

    console.log('🔍 Debug Dashboard Query for user:', user.id);

    // Test receipts query
    const { data: receiptsData, error: receiptsError } = await supabase
      .from('receipts')
      .select(`
        id,
        total_amount,
        purchased_at,
        receipt_number,
        retailer_id,
        retailers (
          id,
          name
        ),
        items (
          id,
          product_name,
          qty,
          unit,
          unit_price,
          total_price,
          category_id,
          categories (
            id,
            name,
            icon,
            color
          )
        )
      `)
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false })
      .limit(5);

    if (receiptsError) {
      return NextResponse.json({
        success: false,
        error: 'Query failed',
        debug: { receiptsError: receiptsError.message }
      });
    }

    const debug = {
      userId: user.id,
      userEmail: user.email,
      receiptsCount: receiptsData?.length || 0,
      receipts: receiptsData?.map(receipt => ({
        id: receipt.id,
        total_amount: receipt.total_amount,
        purchased_at: receipt.purchased_at,
        retailer: receipt.retailers,
        items_count: receipt.items?.length || 0,
        sample_items: receipt.items?.slice(0, 3).map(item => ({
          id: item.id,
          product_name: item.product_name,
          category_id: item.category_id,
          category: item.categories
        }))
      }))
    };

    return NextResponse.json({
      success: true,
      debug
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      debug: { stack: error.stack }
    });
  }
}