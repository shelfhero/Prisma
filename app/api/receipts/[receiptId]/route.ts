import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch receipt with items
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

    console.log('=== SIMPLIFIED RECEIPT API ===');
    console.log('1. Receipt ID:', receiptId);
    console.log('2. User ID:', user.id);

    // First, get the receipt basic info
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .eq('user_id', user.id)
      .single();

    console.log('3. Receipt query result:', { data: receipt, error: receiptError });

    if (receiptError || !receipt) {
      return NextResponse.json(
        { error: 'Касовата бележка не е намерена' },
        { status: 404 }
      );
    }

    // Get retailer name
    let retailerName = 'Неизвестен магазин';
    if (receipt.retailer_id) {
      const { data: retailer } = await supabase
        .from('retailers')
        .select('name')
        .eq('id', receipt.retailer_id)
        .single();

      if (retailer) {
        retailerName = retailer.name;
      }
    }

    // Get items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('receipt_id', receiptId);

    console.log('4. Items query result:', { data: items, error: itemsError });

    // Get receipt images
    const { data: images, error: imagesError } = await supabase
      .from('receipt_images')
      .select('storage_path')
      .eq('receipt_id', receiptId);

    console.log('5. Images query result:', { data: images, error: imagesError });

    // Generate signed URL for the first image if available
    let imageUrl = null;
    if (images && images.length > 0) {
      const imagePath = images[0].storage_path;
      if (imagePath) {
        const { data: urlData } = await supabase.storage
          .from('receipt-images')
          .createSignedUrl(imagePath, 3600); // 1 hour expiry
        imageUrl = urlData?.signedUrl || null;
      }
    }

    // Format the response
    const response = {
      receipt: {
        id: receipt.id,
        retailer_name: retailerName,
        total_amount: receipt.total_amount,
        currency: receipt.currency,
        purchased_at: receipt.purchased_at,
        image_url: imageUrl,
        processing_status: 'completed',
        created_at: receipt.created_at,
        items: (items || []).map((item: any) => ({
          id: item.id,
          product_name: item.product_name,
          price: item.unit_price,
          quantity: item.qty
        }))
      }
    };

    console.log('6. Final response:', JSON.stringify(response, null, 2));

    return NextResponse.json(response);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Вътрешна грешка на сървъра' },
      { status: 500 }
    );
  }
}