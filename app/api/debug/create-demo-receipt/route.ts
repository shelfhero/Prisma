import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Create demo retailer
    const { data: retailer, error: retailerError } = await supabase
      .from('retailers')
      .upsert({ name: 'Лидл България (Demo)' })
      .select()
      .single();

    if (retailerError) {
      console.error('Retailer creation error:', retailerError);
    }

    // Create demo receipt
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .insert({
        user_id: user.id,
        retailer_id: retailer?.id || null,
        total_amount: 23.45,
        currency: 'BGN',
        purchased_at: new Date().toISOString(),
        location: 'София, ж.к. Люлин',
        tabscanner_raw: {
          raw_text: `ЛИДЛ БЪЛГАРИЯ ЕООД
София, ж.к. Люлин
№ ${new Date().toISOString().split('T')[0]} 18:45

Хляб черен
1,20

Мляко краве 2.8%
2,30

Банани Еквадор
3,80

Сирене бяло краве
12,50

Домати розови
3,65

ВСИЧКО: 23,45 лв
КАРТА: 23,45 лв`,
          confidence: 92,
          extraction: {
            retailer: 'Лидл България',
            total: 23.45,
            items: [
              { name: 'Хляб черен', price: 1.20, quantity: 1, confidence: 0.95, category: 'Хлебни изделия' },
              { name: 'Мляко краве 2.8%', price: 2.30, quantity: 1, confidence: 0.93, category: 'Млечни продукти' },
              { name: 'Банани Еквадор', price: 3.80, quantity: 1, confidence: 0.88, category: 'Плодове' },
              { name: 'Сирене бяло краве', price: 12.50, quantity: 1, confidence: 0.96, category: 'Млечни продукти' },
              { name: 'Домати розови', price: 3.65, quantity: 1, confidence: 0.87, category: 'Зеленчуци' }
            ]
          }
        },
        confidence_score: 92,
        processing_status: 'completed'
      })
      .select()
      .single();

    if (receiptError) {
      console.error('Receipt creation error:', receiptError);
      return NextResponse.json(
        { error: 'Failed to create demo receipt', details: receiptError.message },
        { status: 500 }
      );
    }

    // Create demo items
    const demoItems = [
      { name: 'Хляб черен', price: 1.20, quantity: 1 },
      { name: 'Мляко краве 2.8%', price: 2.30, quantity: 1 },
      { name: 'Банани Еквадор', price: 3.80, quantity: 1 },
      { name: 'Сирене бяло краве', price: 12.50, quantity: 1 },
      { name: 'Домати розови', price: 3.65, quantity: 1 }
    ];

    for (const item of demoItems) {
      const { error: itemError } = await supabase
        .from('items')
        .insert({
          receipt_id: receipt.id,
          product_name: item.name,
          unit_price: item.price,
          qty: item.quantity,
          total_price: item.price * item.quantity
        });

      if (itemError) {
        console.error('Item creation error:', itemError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Demo receipt created successfully',
      receipt_id: receipt.id,
      review_url: `/review-receipt/${receipt.id}`
    });

  } catch (error) {
    console.error('Demo receipt creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}