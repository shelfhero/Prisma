import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch receipt with items and retailer information
export async function GET(
  request: NextRequest,
  { params }: { params: { receiptId: string } }
) {
  try {
    const { receiptId } = params;

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

    // Fetch receipt with items
    console.log('=== RECEIPT API DEBUG ===');
    console.log('1. Looking for receipt ID:', receiptId);
    console.log('2. User ID:', user.id);

    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select(`
        id,
        retailer_name,
        store_location,
        total_amount,
        currency,
        purchased_at,
        receipt_number,
        raw_text,
        image_url,
        processing_status,
        created_at,
        receipt_items (
          id,
          product_name,
          price,
          quantity,
          raw_text,
          confidence,
          category_id,
          categories (
            id,
            name
          )
        )
      `)
      .eq('id', receiptId)
      .eq('user_id', user.id)
      .single();

    console.log('3. Query result:', { data: receipt, error: receiptError });

    if (receiptError) {
      console.error('Receipt fetch error:', receiptError);
      return NextResponse.json(
        { error: 'Касовата бележка не е намерена' },
        { status: 404 }
      );
    }

    // Format the response with proper structure
    const response = {
      receipt: {
        id: receipt.id,
        retailer_name: receipt.retailer_name || 'Неизвестен магазин',
        store_location: receipt.store_location,
        total_amount: receipt.total_amount,
        currency: receipt.currency,
        purchased_at: receipt.purchased_at,
        receipt_number: receipt.receipt_number,
        raw_text: receipt.raw_text || '',
        image_url: receipt.image_url,
        processing_status: receipt.processing_status || 'completed',
        created_at: receipt.created_at,
        items: (receipt.receipt_items || []).map((item: any) => ({
          id: item.id,
          product_name: item.product_name,
          price: item.price,
          quantity: item.quantity,
          category: item.categories ? {
            id: item.categories.id,
            name: item.categories.name
          } : null,
          raw_text: item.raw_text,
          confidence: item.confidence
        }))
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Вътрешна грешка на сървъра' },
      { status: 500 }
    );
  }
}

// Helper function to categorize products
function categorizeProduct(productName: string): string {
  const name = productName.toLowerCase();

  // Basic food keywords
  if (name.includes('хляб') || name.includes('мляко') || name.includes('сирене') ||
      name.includes('месо') || name.includes('яйца') || name.includes('ориз') ||
      name.includes('картоф') || name.includes('домат') || name.includes('лук') ||
      name.includes('ябълк') || name.includes('банан') || name.includes('краставиц') ||
      name.includes('моркова') || name.includes('чушк') || name.includes('салата')) {
    return 'basic_food';
  }

  // Beverages
  if (name.includes('вода') || name.includes('сок') || name.includes('бира') ||
      name.includes('вино') || name.includes('кафе') || name.includes('чай') ||
      name.includes('кола') || name.includes('фанта') || name.includes('спрайт') ||
      name.includes('алкохол') || name.includes('уиски') || name.includes('ракия')) {
    return 'beverages';
  }

  // Snacks
  if (name.includes('бонбон') || name.includes('чипс') || name.includes('бисквит') ||
      name.includes('шоколад') || name.includes('сладк') || name.includes('торт') ||
      name.includes('курабии') || name.includes('вафл') || name.includes('захар')) {
    return 'snacks';
  }

  // Non-food
  if (name.includes('сапун') || name.includes('шампоан') || name.includes('паста') ||
      name.includes('препарат') || name.includes('почист') || name.includes('хартия') ||
      name.includes('дезодорант') || name.includes('крем') || name.includes('прах') ||
      name.includes('белина') || name.includes('омекотител')) {
    return 'non_food';
  }

  // Prepared food as default fallback
  return 'prepared_food';
}

// PUT - Update receipt information (if needed)
export async function PUT(
  request: NextRequest,
  { params }: { params: { receiptId: string } }
) {
  try {
    const { receiptId } = params;
    const updateData = await request.json();

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

    // Update receipt
    const { data, error } = await supabase
      .from('receipts')
      .update(updateData)
      .eq('id', receiptId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Receipt update error:', error);
      return NextResponse.json(
        { error: 'Грешка при обновяване на касовата бележка' },
        { status: 400 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Вътрешна грешка на сървъра' },
      { status: 500 }
    );
  }
}

// DELETE - Delete receipt
export async function DELETE(
  request: NextRequest,
  { params }: { params: { receiptId: string } }
) {
  try {
    const { receiptId } = params;

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

    // Delete receipt (cascade will handle items and images)
    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', receiptId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Receipt delete error:', error);
      return NextResponse.json(
        { error: 'Грешка при изтриване на касовата бележка' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Вътрешна грешка на сървъра' },
      { status: 500 }
    );
  }
}