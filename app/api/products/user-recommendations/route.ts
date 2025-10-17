// API endpoint for personalized shopping recommendations
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getShoppingRecommendations,
  optimizeBasket,
  getFrequentProductPrices,
} from '@/lib/price-comparison';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');
  const basketIds = searchParams.get('basket_ids'); // comma-separated master_product_ids

  if (!userId && !basketIds) {
    return NextResponse.json(
      { error: 'Either user_id or basket_ids is required' },
      { status: 400 }
    );
  }

  try {
    let response: any = {};

    // Get shopping recommendations based on user's frequent products
    if (userId) {
      const recommendations = await getShoppingRecommendations(userId);
      const frequentProducts = await getFrequentProductPrices(userId);

      response.single_store_recommendation = recommendations[0] || null;
      response.frequent_products = frequentProducts.slice(0, 10);
    }

    // Get multi-store basket optimization
    if (basketIds) {
      const productIds = basketIds.split(',').map(id => parseInt(id));
      const optimization = await optimizeBasket(productIds);

      response.multi_store_optimization = optimization;
    }

    // If we have userId, also calculate basket optimization from their frequent products
    if (userId && !basketIds) {
      const frequentProducts = await getFrequentProductPrices(userId);
      const topProductIds = frequentProducts
        .slice(0, 15)
        .map(p => p.master_product_id);

      if (topProductIds.length > 0) {
        const optimization = await optimizeBasket(topProductIds);
        response.multi_store_optimization = optimization;
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('User recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
