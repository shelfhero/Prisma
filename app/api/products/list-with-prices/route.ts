// API endpoint to get product list with current prices across all retailers
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const searchQuery = searchParams.get('q');
  const categoryId = searchParams.get('category_id');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    // Build query for master products
    let productsQuery = supabase
      .from('master_products')
      .select('id, normalized_name, display_name, brand, size, unit, category_id');

    if (searchQuery) {
      productsQuery = productsQuery.or(
        `normalized_name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,keywords.cs.{${searchQuery}}`
      );
    }

    if (categoryId) {
      productsQuery = productsQuery.eq('category_id', parseInt(categoryId));
    }

    const { data: products, error: productsError } = await productsQuery
      .range(offset, offset + limit - 1)
      .order('normalized_name');

    if (productsError) throw productsError;

    if (!products || products.length === 0) {
      return NextResponse.json({ products: [], total: 0 });
    }

    // Get current prices for these products
    const productIds = products.map(p => p.id);
    const { data: currentPrices } = await supabase
      .from('current_prices')
      .select('*')
      .in('master_product_id', productIds);

    // Get retailers
    const retailerIds = [...new Set(currentPrices?.map(p => p.retailer_id) || [])];
    const { data: retailers } = await supabase
      .from('retailers')
      .select('id, name')
      .in('id', retailerIds);

    const retailerMap = new Map(retailers?.map(r => [r.id, r]) || []);

    // Format response
    const productsWithPrices = products.map(product => {
      const productPrices = currentPrices?.filter(
        p => p.master_product_id === product.id
      ) || [];

      const prices = productPrices
        .map(price => ({
          retailer_id: price.retailer_id,
          retailer_name: retailerMap.get(price.retailer_id)?.name || 'Unknown',
          unit_price: price.unit_price,
          last_seen: price.seen_at,
        }))
        .sort((a, b) => a.unit_price - b.unit_price);

      const cheapestPrice = prices[0]?.unit_price || 0;
      const cheapestRetailer = prices[0]?.retailer_name || '';
      const avgPrice = prices.length > 0
        ? prices.reduce((sum, p) => sum + p.unit_price, 0) / prices.length
        : 0;
      const maxSavings = prices.length > 1
        ? prices[prices.length - 1].unit_price - cheapestPrice
        : 0;

      // Calculate price trend (if we have historical data)
      const trend = null; // TODO: Implement trend calculation

      return {
        master_product_id: product.id,
        normalized_name: product.normalized_name,
        display_name: product.display_name || product.normalized_name, // Fallback to normalized_name if display_name is null
        brand: product.brand,
        size: product.size,
        unit: product.unit,
        prices: prices.map((p, index) => ({
          ...p,
          is_cheapest: index === 0,
          savings_vs_cheapest: index > 0 ? p.unit_price - cheapestPrice : 0,
        })),
        cheapest_price: cheapestPrice,
        cheapest_retailer: cheapestRetailer,
        avg_price: avgPrice,
        max_savings: maxSavings,
        price_trend: trend,
      };
    });

    // Get total count
    let countQuery = supabase
      .from('master_products')
      .select('id', { count: 'exact', head: true });

    if (searchQuery) {
      countQuery = countQuery.or(
        `normalized_name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`
      );
    }

    if (categoryId) {
      countQuery = countQuery.eq('category_id', parseInt(categoryId));
    }

    const { count } = await countQuery;

    return NextResponse.json({
      products: productsWithPrices,
      total: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Product list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
