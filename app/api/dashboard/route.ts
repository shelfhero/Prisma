import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-simple';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log('📊 Dashboard API - fetching data for user:', user.id);

    // Fetch receipts with items (simplified for dashboard)
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
          unit_price,
          total_price,
          category_id
        )
      `)
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false });

    if (receiptsError) {
      throw new Error(`Failed to fetch receipts: ${receiptsError.message}`);
    }

    // Fetch categories
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('id, name, icon, color');

    // Create category lookup
    const categoryMap = new Map();
    (categoriesData || []).forEach(cat => {
      categoryMap.set(cat.id, cat);
    });

    // Process data for dashboard
    const receipts = receiptsData || [];
    const totalReceipts = receipts.length;
    const totalSpent = receipts.reduce((sum, receipt) => sum + receipt.total_amount, 0);

    // Group items by category
    const categoryGroups = new Map();

    receipts.forEach(receipt => {
      const receiptRetailer = Array.isArray(receipt.retailers) ? receipt.retailers[0] : receipt.retailers;

      (receipt.items || []).forEach(item => {
        const category = categoryMap.get(item.category_id);
        const categoryName = category?.name || 'Некатегоризирани';

        if (!categoryGroups.has(categoryName)) {
          categoryGroups.set(categoryName, {
            name: categoryName,
            icon: category?.icon || '📦',
            color: category?.color || 'gray',
            totalSpent: 0,
            itemCount: 0,
            items: []
          });
        }

        const categoryGroup = categoryGroups.get(categoryName);
        categoryGroup.totalSpent += item.total_price;
        categoryGroup.itemCount += 1;
        categoryGroup.items.push({
          id: item.id,
          productName: item.product_name,
          quantity: item.qty,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
          storeName: receiptRetailer?.name || 'Неизвестен магазин',
          purchaseDate: receipt.purchased_at
        });
      });
    });

    // Convert to array and sort by total spent
    const categories = Array.from(categoryGroups.values())
      .sort((a, b) => b.totalSpent - a.totalSpent);

    const dashboardData = {
      stats: {
        totalReceipts,
        totalSpent,
        averagePerReceipt: totalReceipts > 0 ? totalSpent / totalReceipts : 0,
        totalItems: receipts.reduce((sum, r) => sum + (r.items?.length || 0), 0)
      },
      categories,
      receiptsFound: receipts.length,
      debug: {
        userId: user.id,
        receiptsData: receipts.map(r => ({
          id: r.id,
          total: r.total_amount,
          items: r.items?.length || 0
        }))
      }
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error: any) {
    console.error('❌ Dashboard API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}