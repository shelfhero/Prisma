import { createBrowserClient } from '@/lib/supabase-simple';
import { ESSENTIAL_PRODUCTS_TOP_10 } from '@/lib/essential-products';

interface TopProduct {
  master_product_id: number;
  normalized_name: string;
  brand: string | null;
  size: number | null;
  unit: string | null;
  category_name: string;
  purchase_count?: number;
  last_purchased?: string;
  avg_user_paid?: number;
  cheapest_price: number;
  most_expensive_price: number;
  potential_savings?: number;
  cheapest_store: string;
  prices: Array<{
    store: string;
    price: number;
    last_seen: string;
  }>;
}

interface TopProductsResult {
  products: TopProduct[];
  type: 'personalized' | 'popular' | 'essentials';
  message: string;
}

// Get products user bought most frequently
export async function getUserTopProducts(userId: string): Promise<TopProduct[]> {
  const supabase = createBrowserClient();

  try {
    const { data, error } = await supabase.rpc('get_user_top_products', {
      p_user_id: userId,
      p_limit: 15
    });

    if (error) {
      console.error('Error fetching user top products:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception in getUserTopProducts:', err);
    return [];
  }
}

// Get most popular products across all users
export async function getPopularProducts(): Promise<TopProduct[]> {
  const supabase = createBrowserClient();

  try {
    const { data, error } = await supabase.rpc('get_popular_products', {
      p_limit: 15
    });

    if (error) {
      console.error('Error fetching popular products:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception in getPopularProducts:', err);
    return [];
  }
}

// Get essential products (curated list)
export async function getEssentialProducts(): Promise<TopProduct[]> {
  const supabase = createBrowserClient();

  try {
    console.log('[getEssentialProducts] Starting...');

    // Search for products matching essential keywords
    // Using a simpler approach - get all products and filter client-side
    const { data: products, error } = await supabase
      .from('master_products')
      .select(`
        id,
        normalized_name,
        brand,
        size,
        unit,
        category_id
      `)
      .limit(500);

    if (error || !products) {
      console.error('Error fetching essential products:', error);
      return [];
    }

    console.log('[getEssentialProducts] Fetched products count:', products.length);

    // Filter products that match our essential keywords
    const keywords = ESSENTIAL_PRODUCTS_TOP_10.flatMap(p => p.keywords);
    const matchedProducts = products.filter(p => {
      const name = p.normalized_name?.toLowerCase() || '';
      return keywords.some(keyword => name.includes(keyword.toLowerCase()));
    });

    console.log('[getEssentialProducts] Matched products count:', matchedProducts.length);

    // Get categories
    const { data: categories } = await supabase
      .from('categories')
      .select('*');

    const categoriesMap = new Map(categories?.map((cat: any) => [cat.id, cat]) || []);

    // Get prices for matched products only
    const productIds = matchedProducts.map(p => p.id);

    if (productIds.length === 0) {
      console.log('[getEssentialProducts] No matched products found');
      return [];
    }

    console.log('[getEssentialProducts] Fetching prices for', productIds.length, 'products');

    const { data: currentPrices } = await supabase
      .from('current_prices')
      .select('*')
      .in('master_product_id', productIds);

    console.log('[getEssentialProducts] Current prices count:', currentPrices?.length || 0);

    // Get retailers
    const { data: retailers } = await supabase
      .from('retailers')
      .select('*');

    const retailersMap = new Map(retailers?.map((r: any) => [r.id, r]) || []);

    // Group prices by product - use matchedProducts
    const productsWithPrices = matchedProducts
      .map(product => {
        const productPrices = currentPrices?.filter(p => p.master_product_id === product.id) || [];

        if (productPrices.length === 0) {
          return null;
        }

        const category = categoriesMap.get(product.category_id);
        const sortedPrices = productPrices.sort((a, b) => a.unit_price - b.unit_price);
        const cheapestPrice = sortedPrices[0];
        const retailer = retailersMap.get(cheapestPrice.retailer_id);

        return {
          master_product_id: product.id,
          normalized_name: product.normalized_name,
          brand: product.brand,
          size: product.size,
          unit: product.unit,
          category_name: category?.name || 'Uncategorized',
          cheapest_price: Math.min(...productPrices.map(p => p.unit_price)),
          most_expensive_price: Math.max(...productPrices.map(p => p.unit_price)),
          cheapest_store: retailer?.name || 'N/A',
          prices: sortedPrices.map(p => {
            const ret = retailersMap.get(p.retailer_id);
            return {
              store: ret?.name || 'Unknown',
              price: p.unit_price,
              last_seen: p.seen_at
            };
          })
        };
      })
      .filter((p): p is TopProduct => p !== null);

    // Sort by number of prices (more stores = more useful)
    productsWithPrices.sort((a, b) => b.prices.length - a.prices.length);

    return productsWithPrices.slice(0, 15);
  } catch (err) {
    console.error('Exception in getEssentialProducts:', err);
    return [];
  }
}

// Master function - smart selection
export async function getTopProductsForUser(userId?: string): Promise<TopProductsResult> {
  console.log('[getTopProductsForUser] Starting with userId:', userId);

  // Strategy 1: Personalized (if logged in with history)
  if (userId) {
    console.log('[getTopProductsForUser] Trying personalized products...');
    const userProducts = await getUserTopProducts(userId);
    console.log('[getTopProductsForUser] User products count:', userProducts.length);

    if (userProducts.length >= 10) {
      return {
        products: userProducts,
        type: 'personalized',
        message: 'Твоите най-купувани продукти'
      };
    }

    // Mix with popular if not enough personal history
    console.log('[getTopProductsForUser] Not enough user products, trying popular...');
    const popular = await getPopularProducts();
    console.log('[getTopProductsForUser] Popular products count:', popular.length);

    const mixed = [...userProducts, ...popular]
      .filter((v, i, a) => a.findIndex(t => t.master_product_id === v.master_product_id) === i)
      .slice(0, 15);

    if (mixed.length >= 10) {
      return {
        products: mixed,
        type: 'personalized',
        message: 'Твои и популярни продукти'
      };
    }
  }

  // Strategy 2: Popular products
  console.log('[getTopProductsForUser] Trying popular products...');
  const popular = await getPopularProducts();
  console.log('[getTopProductsForUser] Popular products count:', popular.length);

  if (popular.length >= 10) {
    return {
      products: popular,
      type: 'popular',
      message: 'Най-сравнявани продукти'
    };
  }

  // Strategy 3: Fallback to essentials
  console.log('[getTopProductsForUser] Falling back to essentials...');
  const essentials = await getEssentialProducts();
  console.log('[getTopProductsForUser] Essentials products count:', essentials.length);

  return {
    products: essentials,
    type: 'essentials',
    message: 'Основни хранителни продукти'
  };
}
