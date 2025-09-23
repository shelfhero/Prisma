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

export async function DELETE(request: NextRequest) {
  console.log('=== DELETE RECEIPT ===');

  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Неоторизиран достъп' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Невалиден токен' }, { status: 401 });
    }

    // Get receipt ID
    const { searchParams } = new URL(request.url);
    const receiptId = searchParams.get('id');
    console.log('Deleting receipt ID:', receiptId, 'for user:', user.id);

    if (!receiptId) {
      return NextResponse.json({ error: 'ID на касовата бележка е задължително' }, { status: 400 });
    }

    const receiptIdInt = parseInt(receiptId, 10);
    if (isNaN(receiptIdInt)) {
      return NextResponse.json({ error: 'Невалиден ID на касовата бележка' }, { status: 400 });
    }

    // Delete related records first to avoid foreign key constraints
    console.log('Deleting receipt images...');
    const { error: imagesError } = await supabase
      .from('receipt_images')
      .delete()
      .eq('receipt_id', receiptIdInt);

    if (imagesError) {
      console.error('Images delete error:', imagesError);
    }

    console.log('Deleting receipt items...');
    const { error: itemsError } = await supabase
      .from('items')
      .delete()
      .eq('receipt_id', receiptIdInt);

    if (itemsError) {
      console.error('Items delete error:', itemsError);
    }

    console.log('Deleting receipt...');
    // Finally delete the receipt itself
    const { error: deleteError } = await supabase
      .from('receipts')
      .delete()
      .eq('id', receiptIdInt)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Receipt delete error:', deleteError);
      return NextResponse.json({ error: 'Грешка при изтриване на касовата бележка' }, { status: 500 });
    }

    console.log('Receipt deleted successfully');
    return NextResponse.json({ message: 'Касовата бележка е изтрита успешно' });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Вътрешна грешка на сървъра' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Delete route is working' });
}