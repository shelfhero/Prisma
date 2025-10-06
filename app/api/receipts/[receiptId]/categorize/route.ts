import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Map budget categories to database categories
const CATEGORY_MAPPING = {
  'basic_food': 'Основни храни',
  'prepared_food': 'Готови храни',
  'beverages': 'Напитки',
  'snacks': 'Закуски',
  'non_food': 'Нехранителни'
} as const;

// POST - Save categorized items to budget or update individual item category
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await params;
    const body = await request.json();

    // Check if this is a single item category update
    if (body.itemId && body.categoryId) {
      return await updateSingleItemCategory(receiptId, body.itemId, body.categoryId, request);
    }

    // Otherwise, handle bulk categorization
    const { items } = body;

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Невалиден токен за достъп' },
        { status: 401 }
      );
    }

    // Verify receipt belongs to user
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('id, user_id')
      .eq('id', receiptId)
      .eq('user_id', user.id)
      .single();

    if (receiptError || !receipt) {
      return NextResponse.json(
        { error: 'Касовата бележка не е намерена' },
        { status: 404 }
      );
    }

    // Get or create categories
    const categoryIds: Record<string, string> = {};

    for (const categoryKey of Object.keys(CATEGORY_MAPPING)) {
      const categoryName = CATEGORY_MAPPING[categoryKey as keyof typeof CATEGORY_MAPPING];

      // Try to find existing category
      let { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .single();

      if (!existingCategory) {
        // Create new category
        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert({
            name: categoryName,
            name_en: categoryKey.replace('_', ' '),
            icon: getCategoryIcon(categoryKey),
            color: getCategoryColor(categoryKey),
            is_active: true
          })
          .select('id')
          .single();

        if (categoryError) {
          console.error('Category creation error:', categoryError);
          continue;
        }

        existingCategory = newCategory;
      }

      if (existingCategory) {
        categoryIds[categoryKey] = existingCategory.id;
      }
    }

    // Update items with categories and edited information
    const updatePromises = items.map(async (item: any) => {
      const categoryId = item.category_key ? categoryIds[item.category_key] : null;

      const updateData: any = {
        product_name: item.product_name,
        unit_price: item.unit_price,
        qty: item.qty,
        total_price: item.total_price,
        category_id: categoryId
      };

      // Add category metadata for tracking
      if (item.category_key) {
        updateData.metadata = {
          budget_category: item.category_key,
          categorized_at: new Date().toISOString(),
          auto_categorized: false
        };
      }

      const { error } = await supabase
        .from('items')
        .update(updateData)
        .eq('id', item.id)
        .eq('receipt_id', receiptId);

      if (error) {
        console.error(`Error updating item ${item.id}:`, error);
        throw error;
      }

      return { id: item.id, success: true };
    });

    const results = await Promise.allSettled(updatePromises);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Update receipt status to indicate it's been categorized
    await supabase
      .from('receipts')
      .update({
        processing_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', receiptId)
      .eq('user_id', user.id);

    // Calculate category totals for response
    const categoryTotals: Record<string, number> = {};
    items.forEach((item: any) => {
      if (item.category_key) {
        if (!categoryTotals[item.category_key]) {
          categoryTotals[item.category_key] = 0;
        }
        categoryTotals[item.category_key] += item.total_price;
      }
    });

    return NextResponse.json({
      success: true,
      message: `Успешно категоризирани ${successful} от ${items.length} продукта`,
      data: {
        receipt_id: receiptId,
        items_updated: successful,
        items_failed: failed,
        category_totals: categoryTotals,
        categorization_summary: Object.entries(categoryTotals).map(([key, total]) => ({
          category: CATEGORY_MAPPING[key as keyof typeof CATEGORY_MAPPING],
          category_key: key,
          total: total,
          formatted_total: `${total.toFixed(2)} лв`
        }))
      }
    });

  } catch (error) {
    console.error('Categorization error:', error);
    return NextResponse.json(
      {
        error: 'Грешка при запазване на категоризацията',
        details: error instanceof Error ? error.message : 'Неизвестна грешка'
      },
      { status: 500 }
    );
  }
}

// Helper functions for category metadata
function getCategoryIcon(categoryKey: string): string {
  const icons: Record<string, string> = {
    'basic_food': '🍎',
    'prepared_food': '🍕',
    'beverages': '🍺',
    'snacks': '🍭',
    'non_food': '🧴'
  };
  return icons[categoryKey] || '📦';
}

function getCategoryColor(categoryKey: string): string {
  const colors: Record<string, string> = {
    'basic_food': '#10B981',    // Green
    'prepared_food': '#F59E0B', // Orange
    'beverages': '#3B82F6',     // Blue
    'snacks': '#8B5CF6',        // Purple
    'non_food': '#6B7280'       // Gray
  };
  return colors[categoryKey] || '#6B7280';
}

// GET - Get categorization status and summary
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await params;

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Невалиден токен за достъп' },
        { status: 401 }
      );
    }

    // Get receipt with categorized items
    const { data: receipt, error } = await supabase
      .from('receipts')
      .select(`
        id,
        total_amount,
        currency,
        processing_status,
        items (
          id,
          product_name,
          total_price,
          category_id,
          metadata,
          categories (
            id,
            name,
            icon,
            color
          )
        )
      `)
      .eq('id', receiptId)
      .eq('user_id', user.id)
      .single();

    if (error || !receipt) {
      return NextResponse.json(
        { error: 'Касовата бележка не е намерена' },
        { status: 404 }
      );
    }

    // Calculate categorization statistics
    const totalItems = receipt.items.length;
    const categorizedItems = receipt.items.filter((item: any) => item.category_id).length;
    const categorizationProgress = totalItems > 0 ? (categorizedItems / totalItems) * 100 : 0;

    // Group by categories
    const categoryGroups: Record<string, any> = {};
    receipt.items.forEach((item: any) => {
      if (item.categories) {
        const categoryName = item.categories.name;
        if (!categoryGroups[categoryName]) {
          categoryGroups[categoryName] = {
            category: item.categories,
            items: [],
            total: 0
          };
        }
        categoryGroups[categoryName].items.push(item);
        categoryGroups[categoryName].total += item.total_price;
      }
    });

    return NextResponse.json({
      receipt_id: receiptId,
      total_amount: receipt.total_amount,
      currency: receipt.currency,
      processing_status: receipt.processing_status,
      categorization_status: {
        total_items: totalItems,
        categorized_items: categorizedItems,
        uncategorized_items: totalItems - categorizedItems,
        progress_percentage: Math.round(categorizationProgress),
        is_complete: categorizedItems === totalItems
      },
      category_breakdown: Object.values(categoryGroups),
      uncategorized_items: receipt.items.filter((item: any) => !item.category_id)
    });

  } catch (error) {
    console.error('Categorization status error:', error);
    return NextResponse.json(
      { error: 'Грешка при получаване на статуса на категоризацията' },
      { status: 500 }
    );
  }
}

// Helper function to update a single item's category
async function updateSingleItemCategory(
  receiptId: string,
  itemId: string,
  categoryId: string,
  request: NextRequest
) {
  // Get user from auth header
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Неоторизиран достъп' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Невалиден токен за достъп' },
      { status: 401 }
    );
  }

  // Verify receipt belongs to user and item belongs to receipt
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select(`
      id,
      receipt_id,
      receipts!inner(
        user_id
      )
    `)
    .eq('id', itemId)
    .eq('receipt_id', receiptId)
    .eq('receipts.user_id', user.id)
    .single();

  if (itemError || !item) {
    return NextResponse.json(
      { error: 'Продуктът не е намерен' },
      { status: 404 }
    );
  }

  // Update the item's category
  const { error: updateError } = await supabase
    .from('items')
    .update({
      category_id: categoryId,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId);

  if (updateError) {
    console.error('Item category update error:', updateError);
    return NextResponse.json(
      { error: 'Грешка при обновяване на категорията' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Категорията е обновена успешно',
    data: {
      item_id: itemId,
      category_id: categoryId
    }
  });
}