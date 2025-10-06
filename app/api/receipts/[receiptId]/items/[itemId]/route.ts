import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-simple';

// PUT - Update item details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ receiptId: string; itemId: string }> }
) {
  try {
    const { receiptId, itemId } = await params;
    const { product_name, price, quantity } = await request.json();

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabase = createServerClient();
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

    // Update the item
    const { data: updatedItem, error: updateError } = await supabase
      .from('items')
      .update({
        product_name,
        unit_price: price,
        qty: quantity,
        total_price: price * quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) {
      console.error('Item update error:', updateError);
      return NextResponse.json(
        { error: 'Грешка при обновяване на продукта' },
        { status: 500 }
      );
    }

    // Update receipt total
    const { data: allItems } = await supabase
      .from('items')
      .select('unit_price, qty')
      .eq('receipt_id', receiptId);

    if (allItems) {
      const newTotal = allItems.reduce((sum, item) => sum + (item.unit_price * item.qty), 0);

      await supabase
        .from('receipts')
        .update({
          total_amount: newTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptId);
    }

    return NextResponse.json({
      success: true,
      message: 'Продуктът е обновен успешно',
      data: updatedItem
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Вътрешна грешка на сървъра' },
      { status: 500 }
    );
  }
}