import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    console.log('Testing database connection...');

    // Test basic receipt query
    const { data: receipts, error: receiptError } = await supabase
      .from('receipts')
      .select('id, user_id, total_amount')
      .limit(1);

    console.log('Receipt test:', { data: receipts, error: receiptError });

    // Test retailers query
    const { data: retailers, error: retailerError } = await supabase
      .from('retailers')
      .select('id, name')
      .limit(1);

    console.log('Retailer test:', { data: retailers, error: retailerError });

    // Test items query
    const { data: items, error: itemError } = await supabase
      .from('items')
      .select('id, receipt_id')
      .limit(1);

    console.log('Items test:', { data: items, error: itemError });

    return NextResponse.json({
      success: true,
      tests: {
        receipts: { count: receipts?.length || 0, error: receiptError?.message },
        retailers: { count: retailers?.length || 0, error: retailerError?.message },
        items: { count: items?.length || 0, error: itemError?.message }
      }
    });

  } catch (error) {
    console.error('Test DB error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}