import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// GET - Fetch all receipts for the authenticated user
export async function GET(request: NextRequest) {
  console.log('=== RECEIPTS API CALLED ===');
  try {
    console.log('1. Checking auth header...');
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid auth header');
      return NextResponse.json({ error: 'Неоторизиран достъп' }, { status: 401 });
    }

    console.log('2. Validating token...');
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Невалиден токен' }, { status: 401 });
    }

    console.log('3. User authenticated:', user.id);

    // Fetch receipts with full details including retailer, items count
    console.log('4. Fetching receipts with full details...');
    const { data: receipts, error } = await supabase
      .from('receipts')
      .select(`
        id,
        total_amount,
        currency,
        purchased_at,
        created_at,
        retailers (
          name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    console.log('5. Query result:', {
      success: !error,
      count: receipts?.length || 0,
      error: error?.message,
      actualIds: receipts?.map(r => r.id)
    });

    if (error) {
      console.error('Database error details:', error);
      return NextResponse.json({
        error: 'Грешка при извличане на данните',
        details: error.message
      }, { status: 500 });
    }

    console.log('6. Fetching items count for each receipt...');

    // Get items count for each receipt
    const receiptsWithCounts = await Promise.all((receipts || []).map(async (receipt) => {
      const { count } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('receipt_id', receipt.id);

      return {
        id: receipt.id,
        retailerName: receipt.retailers?.name || 'Неизвестен магазин',
        totalAmount: receipt.total_amount,
        currency: receipt.currency,
        purchasedAt: receipt.purchased_at,
        storeLocation: receipt.retailers?.name || '',
        itemsCount: count || 0,
        notes: '',
        createdAt: receipt.created_at
      };
    }));

    console.log('7. Returning response with', receiptsWithCounts.length, 'receipts');
    return NextResponse.json({ receipts: receiptsWithCounts });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Вътрешна грешка на сървъра' }, { status: 500 });
  }
}

// DELETE - Delete a specific receipt
export async function DELETE(request: NextRequest) {
  console.log('=== DELETE RECEIPT API CALLED ===');
  try {
    console.log('1. Checking auth header...');
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid auth header for DELETE');
      return NextResponse.json({ error: 'Неоторизиран достъп' }, { status: 401 });
    }

    console.log('2. Validating token...');
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error in DELETE:', authError);
      return NextResponse.json({ error: 'Невалиден токен' }, { status: 401 });
    }

    console.log('3. User authenticated for DELETE:', user.id);

    const { searchParams } = new URL(request.url);
    const receiptId = searchParams.get('id');
    console.log('4. Receipt ID to delete:', receiptId);

    if (!receiptId) {
      console.log('No receipt ID provided');
      return NextResponse.json({ error: 'ID на касовата бележка е задължително' }, { status: 400 });
    }

    console.log('5. Verifying receipt exists and belongs to user...');
    // Convert receiptId to integer since our database uses integer IDs
    const receiptIdInt = parseInt(receiptId, 10);
    console.log('5a. Converted receipt ID:', receiptIdInt, 'from string:', receiptId);

    if (isNaN(receiptIdInt)) {
      console.log('Invalid receipt ID - not a number');
      return NextResponse.json({ error: 'Невалиден ID на касовата бележка' }, { status: 400 });
    }

    // First, verify the receipt belongs to the user
    const { data: receipt, error: fetchError } = await supabase
      .from('receipts')
      .select('id, user_id')
      .eq('id', receiptIdInt)
      .eq('user_id', user.id)
      .single();

    console.log('6. Receipt verification result:', {
      found: !!receipt,
      error: fetchError?.message
    });

    if (fetchError || !receipt) {
      console.log('Receipt not found or access denied');
      return NextResponse.json({ error: 'Касовата бележка не е намерена' }, { status: 404 });
    }

    console.log('7. Deleting receipt...');
    // Delete the receipt (cascade will handle items and images)
    const { error: deleteError } = await supabase
      .from('receipts')
      .delete()
      .eq('id', receiptIdInt)
      .eq('user_id', user.id);

    console.log('8. Delete result:', {
      success: !deleteError,
      error: deleteError?.message
    });

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: 'Грешка при изтриване на касовата бележка' }, { status: 500 });
    }

    console.log('9. Receipt deleted successfully');
    return NextResponse.json({ message: 'Касовата бележка е изтрита успешно' });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Вътрешна грешка на сървъра' }, { status: 500 });
  }
}