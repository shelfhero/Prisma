// API endpoint for searching products
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProductSearchResult } from '@/types/normalization';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const categoryId = searchParams.get('category_id');
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!query) {
    return NextResponse.json(
      { error: 'Search query is required' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    // Search products by keywords or name
    let searchQuery = (supabase as any)
      .from('master_products')
      .select('*');

    // Search by normalized name or keywords
    searchQuery = searchQuery.or(
      `normalized_name.ilike.%${query}%,keywords.cs.{${query.toLowerCase()}}`
    );

    if (categoryId) {
      searchQuery = searchQuery.eq('category_id', parseInt(categoryId));
    }

    searchQuery = searchQuery.limit(limit);

    const { data: products, error } = await searchQuery;

    if (error) throw error;

    // For each product, get current prices
    const results: ProductSearchResult[] = [];

    for (const product of products || []) {
      const { data: prices } = await (supabase as any)
        .from('current_prices')
        .select('*')
        .eq('master_product_id', product.id);

      // Find best price
      let bestPrice = null;
      if (prices && prices.length > 0) {
        const sorted = [...prices].sort((a, b) => a.unit_price - b.unit_price);
        const cheapest = sorted[0];
        const mostExpensive = sorted[sorted.length - 1];

        const { data: retailer } = await supabase
          .from('retailers')
          .select('*')
          .eq('id', cheapest.retailer_id)
          .single();

        bestPrice = {
          retailer: retailer!,
          price: cheapest.unit_price,
          savings: mostExpensive.unit_price - cheapest.unit_price,
        };
      }

      results.push({
        master_product: product,
        current_prices: prices || [],
        best_price: bestPrice,
      });
    }

    return NextResponse.json({
      results,
      total: results.length,
      query,
    });

  } catch (error) {
    console.error('Product search error:', error);
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}
