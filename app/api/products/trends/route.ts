// API endpoint for price trends analysis
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PriceTrend } from '@/types/normalization';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const productId = searchParams.get('product_id');
  const days = parseInt(searchParams.get('days') || '30');
  const retailerId = searchParams.get('retailer_id');

  if (!productId) {
    return NextResponse.json(
      { error: 'product_id is required' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    // Get price history for the period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = (supabase as any)
      .from('price_history')
      .select('*')
      .eq('master_product_id', parseInt(productId))
      .gte('seen_at', startDate.toISOString())
      .order('seen_at', { ascending: true });

    if (retailerId) {
      query = query.eq('retailer_id', parseInt(retailerId));
    }

    const { data: priceHistory, error } = await query;

    if (error) throw error;

    // Group by retailer and calculate trends
    const retailerPrices = new Map<string, typeof priceHistory>();

    for (const price of priceHistory || []) {
      if (!retailerPrices.has(price.retailer_id)) {
        retailerPrices.set(price.retailer_id, []);
      }
      retailerPrices.get(price.retailer_id)!.push(price);
    }

    // Calculate trends for each retailer
    const trends: PriceTrend[] = [];

    for (const [retailerId, prices] of retailerPrices.entries()) {
      if (prices.length < 2) continue;

      const sorted = [...prices].sort((a, b) =>
        new Date(a.seen_at).getTime() - new Date(b.seen_at).getTime()
      );

      const firstPrice = sorted[0].unit_price;
      const lastPrice = sorted[sorted.length - 1].unit_price;
      const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

      // Get retailer info
      const { data: retailer } = await supabase
        .from('retailers')
        .select('name')
        .eq('id', retailerId)
        .single();

      // Get product info
      const { data: product } = await (supabase as any)
        .from('master_products')
        .select('normalized_name')
        .eq('id', parseInt(productId))
        .single();

      let trendDirection: 'up' | 'down' | 'stable';
      if (Math.abs(priceChange) < 2) {
        trendDirection = 'stable';
      } else if (priceChange > 0) {
        trendDirection = 'up';
      } else {
        trendDirection = 'down';
      }

      trends.push({
        master_product_id: parseInt(productId),
        product_name: product?.normalized_name || '',
        retailer_id: retailerId as any,
        retailer_name: retailer?.name || '',
        trend_direction: trendDirection,
        price_change_percent: Math.round(priceChange * 10) / 10,
        current_price: lastPrice,
        previous_price: firstPrice,
        period_days: days,
      });
    }

    // Also include price history data points for charting
    const chartData = (priceHistory || []).map((p: any) => ({
      date: p.seen_at,
      price: p.unit_price,
      retailer_id: p.retailer_id,
    }));

    return NextResponse.json({
      trends,
      chart_data: chartData,
      period_days: days,
    });

  } catch (error) {
    console.error('Price trends error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price trends' },
      { status: 500 }
    );
  }
}
