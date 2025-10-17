// API endpoint for shopping list optimization
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BudgetOptimization } from '@/types/normalization';

interface ShoppingListItem {
  master_product_id: number;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopping_list } = body as { shopping_list: ShoppingListItem[] };

    if (!shopping_list || !Array.isArray(shopping_list)) {
      return NextResponse.json(
        { error: 'shopping_list array is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get all product IDs
    const productIds = shopping_list.map(item => item.master_product_id);

    // Get product details
    const { data: products } = await supabase
      .from('master_products')
      .select('*')
      .in('id', productIds);

    if (!products) {
      return NextResponse.json(
        { error: 'Products not found' },
        { status: 404 }
      );
    }

    // Get current prices for all products
    const { data: allPrices } = await supabase
      .from('current_prices')
      .select('*')
      .in('master_product_id', productIds);

    if (!allPrices) {
      return NextResponse.json(
        { error: 'No prices found' },
        { status: 404 }
      );
    }

    // Get all retailers
    const retailerIds = [...new Set(allPrices.map(p => p.retailer_id))];
    const { data: retailers } = await supabase
      .from('retailers')
      .select('*')
      .in('id', retailerIds);

    const retailerMap = new Map(retailers?.map(r => [r.id, r]) || []);

    // Build recommendations
    const recommendations = shopping_list.map(item => {
      const product = products.find(p => p.id === item.master_product_id);
      const productPrices = allPrices.filter(p => p.master_product_id === item.master_product_id);

      // Sort by price
      const sorted = [...productPrices].sort((a, b) => a.unit_price - b.unit_price);
      const cheapest = sorted[0];

      const alternatives = sorted.slice(1).map(p => ({
        retailer: retailerMap.get(p.retailer_id)!,
        price: p.unit_price * item.quantity,
        price_difference: (p.unit_price - cheapest.unit_price) * item.quantity,
      }));

      return {
        master_product_id: item.master_product_id,
        product_name: product?.normalized_name || '',
        quantity: item.quantity,
        recommended_retailer: retailerMap.get(cheapest.retailer_id)!,
        price: cheapest.unit_price * item.quantity,
        alternative_retailers: alternatives,
      };
    });

    // Calculate total costs
    const totalCost = recommendations.reduce((sum, rec) => sum + rec.price, 0);

    // Calculate potential savings if buying from most expensive
    const potentialSavings = recommendations.reduce((sum, rec) => {
      const maxAlternative = rec.alternative_retailers.reduce(
        (max, alt) => alt.price > max ? alt.price : max,
        rec.price
      );
      return sum + (maxAlternative - rec.price);
    }, 0);

    // Find optimal retailers (where to shop)
    const retailerCounts = new Map<number, number>();
    recommendations.forEach(rec => {
      const id = rec.recommended_retailer.id;
      retailerCounts.set(id, (retailerCounts.get(id) || 0) + 1);
    });

    const optimizedRetailers = Array.from(retailerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => retailerMap.get(id)!)
      .filter(Boolean);

    const optimization: BudgetOptimization = {
      shopping_list: shopping_list.map(item => ({
        master_product_id: item.master_product_id,
        product_name: products.find(p => p.id === item.master_product_id)?.normalized_name || '',
        quantity: item.quantity,
      })),
      recommendations,
      total_cost: Math.round(totalCost * 100) / 100,
      potential_savings: Math.round(potentialSavings * 100) / 100,
      optimized_retailers,
    };

    return NextResponse.json(optimization);

  } catch (error) {
    console.error('Shopping optimization error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize shopping list' },
      { status: 500 }
    );
  }
}
