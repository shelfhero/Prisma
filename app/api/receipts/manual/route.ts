import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Category mapping (same as in process route)
const CATEGORY_RULES = {
  'Хранителни продукти': [
    'хляб', 'мляко', 'яйца', 'сирене', 'кашкавал', 'йогурт', 'масло', 'олио',
    'месо', 'салам', 'шунка', 'пилешко', 'говеждо', 'свинско',
    'риба', 'тон', 'сьомга', 'скумрия',
    'плодове', 'ябълки', 'банани', 'портокали', 'лимони', 'грозде',
    'зеленчуци', 'домати', 'краставици', 'лук', 'картофи', 'моркови',
    'макарони', 'спагети', 'ориз', 'брашно', 'захар', 'сол'
  ],
  'Напитки': [
    'вода', 'сок', 'кока кола', 'фанта', 'спрайт', 'пепси',
    'бира', 'вино', 'ракия', 'уиски', 'кафе', 'чай'
  ],
  'Козметика и хигиена': [
    'сапун', 'шампоан', 'паста за зъби', 'четка за зъби',
    'дезодорант', 'парфюм', 'крем', 'маска', 'серум'
  ],
  'Битова химия': [
    'препарат за съдове', 'прах за пране', 'омекотител',
    'почистващ препарат', 'белина', 'освежител'
  ],
  'Други': []
};

function categorizeItem(productName: string): string | null {
  const normalizedName = productName.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    if (category === 'Други') continue;

    for (const keyword of keywords) {
      if (normalizedName.includes(keyword)) {
        return category;
      }
    }
  }

  return 'Други';
}

async function getOrCreateRetailer(retailerName: string): Promise<string> {
  if (!retailerName) {
    retailerName = 'Неизвестен магазин';
  }

  // Try to find existing retailer
  const { data: existingRetailer } = await supabase
    .from('retailers')
    .select('id')
    .eq('name', retailerName)
    .single();

  if (existingRetailer) {
    return existingRetailer.id;
  }

  // Create new retailer
  const { data: newRetailer, error } = await supabase
    .from('retailers')
    .insert({ name: retailerName })
    .select('id')
    .single();

  if (error || !newRetailer) {
    throw new Error('Failed to create retailer');
  }

  return newRetailer.id;
}

async function getCategoryId(categoryName: string): Promise<string | null> {
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('name', categoryName)
    .single();

  return category?.id || null;
}

export async function POST(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify JWT token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Parse request body
    const body = await request.json();
    const { receipt } = body;

    if (!receipt || !receipt.retailer || !receipt.items || receipt.items.length === 0) {
      return NextResponse.json(
        { error: 'Невалидни данни за касова бележка' },
        { status: 400 }
      );
    }

    // Generate unique receipt ID
    const receiptId = uuidv4();

    // Get or create retailer
    const retailerId = await getOrCreateRetailer(receipt.retailer);

    // Insert receipt
    const { data: receiptData, error: receiptError } = await supabase
      .from('receipts')
      .insert({
        id: receiptId,
        user_id: userId,
        retailer_id: retailerId,
        total_amount: receipt.total || 0,
        currency: 'BGN',
        purchased_at: receipt.date || new Date().toISOString(),
        tabscanner_raw: body // Store the full manual entry data
      })
      .select()
      .single();

    if (receiptError) {
      throw new Error(`Receipt insert failed: ${receiptError.message}`);
    }

    // Insert items
    let itemsInserted = 0;

    for (const item of receipt.items) {
      if (!item.name || !item.price) continue;

      const categoryName = categorizeItem(item.name);
      const categoryId = categoryName ? await getCategoryId(categoryName) : null;

      const quantity = item.quantity || 1;
      const unitPrice = item.price;
      const totalPrice = unitPrice * quantity;

      const { error: itemError } = await supabase
        .from('items')
        .insert({
          receipt_id: receiptId,
          product_name: item.name,
          barcode: null, // Manual entries don't have barcodes
          qty: quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          category_id: categoryId
        });

      if (itemError) {
        console.error('Item insert failed:', itemError);
        // Continue with other items
      } else {
        itemsInserted++;
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Касовата бележка е запазена успешно',
      data: {
        receipt_id: receiptId,
        total_amount: receipt.total || 0,
        items_count: itemsInserted,
        processing_status: 'manual_entry',
        currency: 'BGN'
      }
    });

  } catch (error) {
    console.error('Manual receipt API error:', error);

    return NextResponse.json(
      {
        error: 'Грешка при запазване на касовата бележка',
        details: process.env.NODE_ENV === 'development' ? error?.toString() : undefined
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Невалидна заявка' },
    { status: 405 }
  );
}