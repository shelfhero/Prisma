/**
 * POWERFUL PRICE COMPARISON QUERIES FOR ПРИЗМА
 * Advanced analytics and shopping recommendations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create singleton supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseClient;
}

// ============================================================================
// TYPES
// ============================================================================

export interface CheapestStore {
  store: string;
  retailer_id: string;
  unit_price: number;
  seen_at: string;
  location: string | null;
  savings_percent: number;
}

export interface PriceHistoryPoint {
  store: string;
  unit_price: number;
  date: string;
  moving_avg_7day: number;
}

export interface FrequentProduct {
  master_product_id: number;
  normalized_name: string;
  purchase_count: number;
  prices: Array<{
    store: string;
    price: number;
    last_seen: string;
  }>;
  cheapest_price: number;
  most_expensive_price: number;
  avg_price: number;
}

export interface PriceTrend {
  normalized_name: string;
  master_product_id: number;
  store: string;
  current_avg: number;
  previous_avg: number;
  change_percent: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ShoppingRecommendation {
  store: string;
  retailer_id: string;
  total_cost: number;
  products_available: number;
  cost_rank: number;
  savings_vs_most_expensive: number;
}

export interface BasketOptimization {
  recommended_stores: string[];
  total_savings: number;
  products_by_store: Record<string, Array<{
    product_name: string;
    price: number;
  }>>;
}

// ============================================================================
// 1. GET CHEAPEST STORE FOR A PRODUCT
// ============================================================================

export async function getCheapestStore(
  masterProductId: number
): Promise<CheapestStore | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_cheapest_store', {
    p_master_product_id: masterProductId
  });

  if (error) {
    console.error('Error getting cheapest store:', error);
    return null;
  }

  return data?.[0] || null;
}

// SQL function to create in Supabase:
export const GET_CHEAPEST_STORE_SQL = `
CREATE OR REPLACE FUNCTION get_cheapest_store(p_master_product_id INTEGER)
RETURNS TABLE (
  store TEXT,
  retailer_id UUID,
  unit_price NUMERIC,
  seen_at TIMESTAMPTZ,
  location TEXT,
  savings_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.name as store,
    r.id as retailer_id,
    cp.unit_price,
    cp.seen_at,
    cp.location,
    ROUND(((avg_price - cp.unit_price) / NULLIF(avg_price, 0) * 100), 1) as savings_percent
  FROM current_prices cp
  JOIN retailers r ON cp.retailer_id = r.id
  CROSS JOIN (
    SELECT AVG(unit_price) as avg_price
    FROM current_prices
    WHERE master_product_id = p_master_product_id
  ) avg
  WHERE cp.master_product_id = p_master_product_id
  ORDER BY cp.unit_price ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
`;

// ============================================================================
// 2. GET PRICE HISTORY FOR A PRODUCT
// ============================================================================

export async function getPriceHistory(
  masterProductId: number,
  days: number = 30
): Promise<PriceHistoryPoint[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('price_history')
    .select(`
      unit_price,
      seen_at,
      retailers!inner(name)
    `)
    .eq('master_product_id', masterProductId)
    .gte('seen_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('seen_at', { ascending: false });

  if (error) {
    console.error('Error getting price history:', error);
    return [];
  }

  // Calculate moving average
  const groupedByStore = new Map<string, Array<{ price: number; date: string }>>();

  data.forEach(item => {
    const store = (item.retailers as any).name;
    if (!groupedByStore.has(store)) {
      groupedByStore.set(store, []);
    }
    groupedByStore.get(store)!.push({
      price: item.unit_price,
      date: item.seen_at
    });
  });

  const result: PriceHistoryPoint[] = [];

  groupedByStore.forEach((prices, store) => {
    prices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    prices.forEach((item, index) => {
      // Calculate 7-day moving average
      const start = Math.max(0, index - 6);
      const window = prices.slice(start, index + 1);
      const movingAvg = window.reduce((sum, p) => sum + p.price, 0) / window.length;

      result.push({
        store,
        unit_price: item.price,
        date: item.date.split('T')[0],
        moving_avg_7day: Math.round(movingAvg * 100) / 100
      });
    });
  });

  return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ============================================================================
// 3. GET ALL PRICES FOR USER'S FREQUENT PRODUCTS
// ============================================================================

export async function getFrequentProductPrices(
  userId: string
): Promise<FrequentProduct[]> {
  const supabase = getSupabaseClient();

  // Get user's frequent products
  const { data: frequentProducts, error: freqError } = await supabase
    .from('items')
    .select(`
      master_product_id,
      master_products!inner(normalized_name),
      receipts!inner(user_id)
    `)
    .eq('receipts.user_id', userId)
    .not('master_product_id', 'is', null);

  if (freqError || !frequentProducts) {
    console.error('Error getting frequent products:', freqError);
    return [];
  }

  // Count purchases
  const productCounts = new Map<number, { name: string; count: number }>();

  frequentProducts.forEach(item => {
    const id = item.master_product_id!;
    const name = (item.master_products as any).normalized_name;

    if (!productCounts.has(id)) {
      productCounts.set(id, { name, count: 0 });
    }
    productCounts.get(id)!.count++;
  });

  // Filter products bought at least 3 times
  const topProducts = Array.from(productCounts.entries())
    .filter(([_, data]) => data.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20);

  // Get current prices for these products
  const results: FrequentProduct[] = [];

  for (const [productId, productData] of topProducts) {
    const { data: prices, error: pricesError } = await supabase
      .from('current_prices')
      .select(`
        unit_price,
        seen_at,
        retailers!inner(name)
      `)
      .eq('master_product_id', productId);

    if (pricesError || !prices) continue;

    const priceList = prices.map(p => ({
      store: (p.retailers as any).name,
      price: p.unit_price,
      last_seen: p.seen_at.split('T')[0]
    })).sort((a, b) => a.price - b.price);

    if (priceList.length === 0) continue;

    results.push({
      master_product_id: productId,
      normalized_name: productData.name,
      purchase_count: productData.count,
      prices: priceList,
      cheapest_price: priceList[0].price,
      most_expensive_price: priceList[priceList.length - 1].price,
      avg_price: Math.round(
        priceList.reduce((sum, p) => sum + p.price, 0) / priceList.length * 100
      ) / 100
    });
  }

  return results;
}

// ============================================================================
// 4. GET PRICE TRENDS (INCREASING/DECREASING)
// ============================================================================

export async function getPriceTrends(
  days: number = 7
): Promise<PriceTrend[]> {
  const supabase = getSupabaseClient();

  const cutoffDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const midDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const { data: priceHistory, error } = await supabase
    .from('price_history')
    .select(`
      master_product_id,
      unit_price,
      seen_at,
      master_products!inner(normalized_name),
      retailers!inner(name)
    `)
    .gte('seen_at', cutoffDate.toISOString())
    .order('seen_at', { ascending: false });

  if (error || !priceHistory) {
    console.error('Error getting price trends:', error);
    return [];
  }

  // Group by product and store
  const grouped = new Map<string, {
    productName: string;
    productId: number;
    store: string;
    currentPrices: number[];
    previousPrices: number[];
  }>();

  priceHistory.forEach(item => {
    const key = `${item.master_product_id}-${(item.retailers as any).name}`;
    const seenDate = new Date(item.seen_at);

    if (!grouped.has(key)) {
      grouped.set(key, {
        productName: (item.master_products as any).normalized_name,
        productId: item.master_product_id,
        store: (item.retailers as any).name,
        currentPrices: [],
        previousPrices: []
      });
    }

    const group = grouped.get(key)!;

    if (seenDate >= midDate) {
      group.currentPrices.push(item.unit_price);
    } else {
      group.previousPrices.push(item.unit_price);
    }
  });

  // Calculate trends
  const trends: PriceTrend[] = [];

  grouped.forEach(group => {
    if (group.currentPrices.length < 2 || group.previousPrices.length < 2) return;

    const currentAvg = group.currentPrices.reduce((sum, p) => sum + p, 0) / group.currentPrices.length;
    const previousAvg = group.previousPrices.reduce((sum, p) => sum + p, 0) / group.previousPrices.length;
    const changePercent = Math.round(((currentAvg - previousAvg) / previousAvg * 100) * 10) / 10;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(changePercent) < 2) {
      trend = 'stable';
    } else if (changePercent > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    trends.push({
      normalized_name: group.productName,
      master_product_id: group.productId,
      store: group.store,
      current_avg: Math.round(currentAvg * 100) / 100,
      previous_avg: Math.round(previousAvg * 100) / 100,
      change_percent: changePercent,
      trend
    });
  });

  return trends.sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent)).slice(0, 20);
}

// ============================================================================
// 5. SMART SHOPPING RECOMMENDATIONS
// ============================================================================

export async function getShoppingRecommendations(
  userId: string
): Promise<ShoppingRecommendation[]> {
  const supabase = getSupabaseClient();

  // Get user's recent products (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const { data: recentPurchases, error: purchasesError } = await supabase
    .from('items')
    .select(`
      master_product_id,
      receipts!inner(user_id, purchased_at)
    `)
    .eq('receipts.user_id', userId)
    .gte('receipts.purchased_at', thirtyDaysAgo.toISOString())
    .not('master_product_id', 'is', null);

  if (purchasesError || !recentPurchases) {
    console.error('Error getting recent purchases:', purchasesError);
    return [];
  }

  const uniqueProducts = [...new Set(recentPurchases.map(p => p.master_product_id))];

  if (uniqueProducts.length === 0) return [];

  // Get current prices for all these products
  const { data: prices, error: pricesError } = await supabase
    .from('current_prices')
    .select(`
      master_product_id,
      retailer_id,
      unit_price,
      retailers!inner(name)
    `)
    .in('master_product_id', uniqueProducts);

  if (pricesError || !prices) {
    console.error('Error getting prices:', pricesError);
    return [];
  }

  // Group by retailer and calculate totals
  const storeTotals = new Map<string, {
    retailerId: string;
    storeName: string;
    totalCost: number;
    productsAvailable: number;
  }>();

  prices.forEach(price => {
    const storeId = price.retailer_id;
    const storeName = (price.retailers as any).name;

    if (!storeTotals.has(storeId)) {
      storeTotals.set(storeId, {
        retailerId: storeId,
        storeName,
        totalCost: 0,
        productsAvailable: 0
      });
    }

    const store = storeTotals.get(storeId)!;
    store.totalCost += price.unit_price;
    store.productsAvailable++;
  });

  // Convert to array and sort by cost
  const recommendations = Array.from(storeTotals.values())
    .filter(store => store.productsAvailable >= uniqueProducts.length * 0.5) // At least 50% of products
    .sort((a, b) => a.totalCost - b.totalCost);

  if (recommendations.length === 0) return [];

  const maxCost = Math.max(...recommendations.map(r => r.totalCost));

  return recommendations.map((rec, index) => ({
    store: rec.storeName,
    retailer_id: rec.retailerId,
    total_cost: Math.round(rec.totalCost * 100) / 100,
    products_available: rec.productsAvailable,
    cost_rank: index + 1,
    savings_vs_most_expensive: Math.round(((maxCost - rec.totalCost) / maxCost * 100) * 10) / 10
  }));
}

// ============================================================================
// 6. OPTIMIZE BASKET ACROSS STORES
// ============================================================================

export async function optimizeBasket(
  masterProductIds: number[]
): Promise<BasketOptimization> {
  const supabase = getSupabaseClient();

  // Get all current prices
  const { data: prices, error } = await supabase
    .from('current_prices')
    .select(`
      master_product_id,
      retailer_id,
      unit_price,
      master_products!inner(normalized_name),
      retailers!inner(name)
    `)
    .in('master_product_id', masterProductIds);

  if (error || !prices) {
    console.error('Error optimizing basket:', error);
    return {
      recommended_stores: [],
      total_savings: 0,
      products_by_store: {}
    };
  }

  // Find cheapest store for each product
  const productStoreMap = new Map<number, {
    productName: string;
    store: string;
    price: number;
  }>();

  masterProductIds.forEach(productId => {
    const productPrices = prices.filter(p => p.master_product_id === productId);

    if (productPrices.length === 0) return;

    const cheapest = productPrices.reduce((min, p) =>
      p.unit_price < min.unit_price ? p : min
    );

    productStoreMap.set(productId, {
      productName: (cheapest.master_products as any).normalized_name,
      store: (cheapest.retailers as any).name,
      price: cheapest.unit_price
    });
  });

  // Group by store
  const storeGroups = new Map<string, Array<{ product_name: string; price: number }>>();

  productStoreMap.forEach(data => {
    if (!storeGroups.has(data.store)) {
      storeGroups.set(data.store, []);
    }
    storeGroups.get(data.store)!.push({
      product_name: data.productName,
      price: data.price
    });
  });

  // Calculate total optimal cost
  const optimalCost = Array.from(productStoreMap.values())
    .reduce((sum, p) => sum + p.price, 0);

  // Calculate cost if buying from single most common store
  const stores = Array.from(storeGroups.entries())
    .sort((a, b) => b[1].length - a[1].length);

  const mostCommonStore = stores[0]?.[0];
  let singleStoreCost = 0;

  if (mostCommonStore) {
    masterProductIds.forEach(productId => {
      const productPrices = prices.filter(p =>
        p.master_product_id === productId &&
        (p.retailers as any).name === mostCommonStore
      );
      if (productPrices.length > 0) {
        singleStoreCost += productPrices[0].unit_price;
      }
    });
  }

  return {
    recommended_stores: Array.from(storeGroups.keys()),
    total_savings: Math.round((singleStoreCost - optimalCost) * 100) / 100,
    products_by_store: Object.fromEntries(storeGroups)
  };
}

// ============================================================================
// 7. GET BEST DEALS TODAY
// ============================================================================

export async function getBestDealsToday(limit: number = 10): Promise<Array<{
  product_name: string;
  store: string;
  current_price: number;
  usual_price: number;
  savings: number;
  savings_percent: number;
}>> {
  const supabase = getSupabaseClient();

  const { data: products, error } = await supabase
    .from('current_prices')
    .select(`
      master_product_id,
      unit_price,
      master_products!inner(normalized_name),
      retailers!inner(name)
    `)
    .order('unit_price', { ascending: true });

  if (error || !products) return [];

  // Calculate average price for each product
  const productAvgs = new Map<number, number>();

  products.forEach(p => {
    const id = p.master_product_id;
    if (!productAvgs.has(id)) {
      const prices = products.filter(x => x.master_product_id === id);
      const avg = prices.reduce((sum, x) => sum + x.unit_price, 0) / prices.length;
      productAvgs.set(id, avg);
    }
  });

  // Find best deals (below average)
  const deals = products
    .map(p => {
      const avgPrice = productAvgs.get(p.master_product_id) || 0;
      const savings = avgPrice - p.unit_price;
      const savingsPercent = (savings / avgPrice) * 100;

      return {
        product_name: (p.master_products as any).normalized_name,
        store: (p.retailers as any).name,
        current_price: p.unit_price,
        usual_price: Math.round(avgPrice * 100) / 100,
        savings: Math.round(savings * 100) / 100,
        savings_percent: Math.round(savingsPercent * 10) / 10
      };
    })
    .filter(d => d.savings_percent >= 10) // At least 10% off
    .sort((a, b) => b.savings_percent - a.savings_percent)
    .slice(0, limit);

  return deals;
}
