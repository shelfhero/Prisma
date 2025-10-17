// API endpoint for price comparison across retailers
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PriceComparisonResponse } from '@/types/normalization';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const productId = searchParams.get('product_id');
  const productName = searchParams.get('name');

  if (!productId && !productName) {
    return NextResponse.json(
      { error: 'Either product_id or name is required' },
      { status: 400 }
    );
  }

  try {
    // Get price comparison data
    let query = supabase
      .from('price_comparison')
      .select('*');

    if (productId) {
      query = query.eq('master_product_id', parseInt(productId));
    } else if (productName) {
      query = query.ilike('normalized_name', `%${productName}%`);
    }

    const { data: comparisons, error } = await query;

    if (error) throw error;

    if (!comparisons || comparisons.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get master product details
    const masterProductId = comparisons[0].master_product_id;
    const { data: product } = await supabase
      .from('master_products')
      .select('*')
      .eq('id', masterProductId)
      .single();

    // Get retailers
    const retailerIds = [...new Set(comparisons.map(c => c.retailer_id))];
    const { data: retailers } = await supabase
      .from('retailers')
      .select('*')
      .in('id', retailerIds);

    const retailerMap = new Map(retailers?.map(r => [r.id, r]) || []);

    // Format response
    const prices = comparisons.map(comp => ({
      retailer: retailerMap.get(comp.retailer_id)!,
      current_price: comp.unit_price,
      last_seen: comp.seen_at,
      location: comp.location,
      rank: comp.price_rank,
      savings_percent: comp.savings_percent,
      is_best_price: comp.price_rank === 1,
    }));

    const statistics = {
      avg_price: comparisons[0].avg_price,
      min_price: comparisons[0].min_price,
      max_price: comparisons[0].max_price,
      price_range: comparisons[0].max_price - comparisons[0].min_price,
      total_retailers: retailerIds.length,
    };

    const response: PriceComparisonResponse = {
      product: product!,
      prices,
      statistics,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Price comparison error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price comparison' },
      { status: 500 }
    );
  }
}
