import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-simple';

// POST - Confirm receipt as reviewed and accurate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    console.log('=== CONFIRM RECEIPT API ===');
    const { receiptId } = await params;
    console.log('1. Receipt ID:', receiptId);
    const body = await request.json();
    const { items: editedItems, totalAmount } = body;
    console.log('2. Body:', { editedItems, totalAmount });

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabase = createServerClient(true); // Use service key
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Невалиден токен за достъп' },
        { status: 401 }
      );
    }

    // Verify receipt belongs to user
    console.log('3. Verifying receipt - ID:', receiptId, 'User:', user.id);
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('id, user_id, processing_status')
      .eq('id', receiptId)
      .eq('user_id', user.id)
      .single();

    console.log('4. Receipt query result:', { receipt, receiptError });

    if (receiptError || !receipt) {
      console.error('5. Receipt not found or error:', receiptError);
      return NextResponse.json(
        { error: 'Касовата бележка не е намерена' },
        { status: 404 }
      );
    }

    // Update edited items if provided
    if (editedItems && Array.isArray(editedItems)) {
      for (const item of editedItems) {
        const { error: itemUpdateError } = await supabase
          .from('items')
          .update({
            product_name: item.product_name,
            unit_price: item.price,
            qty: item.quantity,
            total_price: item.price * item.quantity
          })
          .eq('id', item.id)
          .eq('receipt_id', receiptId);

        if (itemUpdateError) {
          console.error('Item update error:', itemUpdateError);
        }
      }
    }

    // Update receipt status and total amount
    const updateData: any = {
      processing_status: 'completed'
    };

    if (totalAmount !== undefined) {
      updateData.total_amount = totalAmount;
    }

    const { data: updatedReceipt, error: updateError } = await supabase
      .from('receipts')
      .update(updateData)
      .eq('id', receiptId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Receipt confirmation error:', updateError);
      return NextResponse.json(
        { error: 'Грешка при потвърждаване на касовата бележка' },
        { status: 500 }
      );
    }

    // Get receipt summary for response
    const { data: items } = await supabase
      .from('items')
      .select('id, product_name, unit_price, qty, category_id')
      .eq('receipt_id', receiptId);

    const itemsCount = items?.length || 0;
    const categorizedItems = items?.filter(item => item.category_id).length || 0;
    const calculatedTotal = items?.reduce((sum, item) => sum + (item.unit_price * item.qty), 0) || 0;

    return NextResponse.json({
      success: true,
      message: 'Касовата бележка е потвърдена успешно',
      data: {
        receipt_id: receiptId,
        confirmed_at: new Date().toISOString(),
        summary: {
          total_amount: calculatedTotal,
          items_count: itemsCount,
          categorized_items: categorizedItems,
          categorization_progress: itemsCount > 0 ? Math.round((categorizedItems / itemsCount) * 100) : 0
        }
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Вътрешна грешка на сървъра' },
      { status: 500 }
    );
  }
}