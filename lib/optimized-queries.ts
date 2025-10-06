/**
 * Optimized Database Queries
 * Prevent N+1 queries and use proper indexes
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { cache, CacheKeys, CacheTTL } from './cache';

/**
 * Fetch user's recent receipts with all related data (optimized)
 * Prevents N+1 by fetching all relations in single queries
 */
export async function fetchRecentReceipts(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 20
) {
  // Try cache first
  const cacheKey = CacheKeys.recentReceipts(userId);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Fetch receipts
  const { data: receipts, error: receiptsError } = await supabase
    .from('receipts')
    .select('id, total_amount, purchased_at, retailer_id, created_at, status')
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false })
    .limit(limit);

  if (receiptsError) throw receiptsError;
  if (!receipts || receipts.length === 0) return [];

  // Fetch all retailers in one query
  const retailerIds = [...new Set(receipts.map(r => r.retailer_id).filter(Boolean))];
  const { data: retailers } = await supabase
    .from('retailers')
    .select('*')
    .in('id', retailerIds);

  // Create retailer map for O(1) lookup
  const retailerMap = new Map(retailers?.map(r => [r.id, r]) || []);

  // Combine data
  const result = receipts.map(receipt => ({
    ...receipt,
    retailer: retailerMap.get(receipt.retailer_id),
  }));

  // Cache for 2 minutes
  cache.set(cacheKey, result, { ttl: CacheTTL.short });

  return result;
}

/**
 * Fetch receipts with pagination (optimized)
 */
export async function fetchReceiptsPaginated(
  supabase: SupabaseClient,
  userId: string,
  page: number = 1,
  pageSize: number = 20
) {
  const cacheKey = CacheKeys.receipts(userId, page);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Fetch receipts with count
  const { data: receipts, error, count } = await supabase
    .from('receipts')
    .select('id, total_amount, purchased_at, retailer_id, status', { count: 'exact' })
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  if (!receipts) return { receipts: [], total: 0 };

  // Fetch retailers
  const retailerIds = [...new Set(receipts.map(r => r.retailer_id).filter(Boolean))];
  const { data: retailers } = await supabase
    .from('retailers')
    .select('*')
    .in('id', retailerIds);

  const retailerMap = new Map(retailers?.map(r => [r.id, r]) || []);

  const result = {
    receipts: receipts.map(r => ({
      ...r,
      retailer: retailerMap.get(r.retailer_id),
    })),
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };

  // Cache for 2 minutes
  cache.set(cacheKey, result, { ttl: CacheTTL.short });

  return result;
}

/**
 * Fetch current month budget with spending (optimized)
 */
export async function fetchCurrentBudget(
  supabase: SupabaseClient,
  userId: string
) {
  const cacheKey = CacheKeys.userBudget(userId);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Get current month date range
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Fetch budget for current month
  const { data: budgets } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('period_type', 'monthly')
    .lte('start_date', endDate.toISOString())
    .gte('end_date', startDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  const budget = budgets?.[0];
  if (!budget) return null;

  // Fetch budget lines
  const { data: budgetLines } = await supabase
    .from('budget_lines')
    .select('*')
    .eq('budget_id', budget.id);

  // Fetch categories in one query
  const categoryIds = [...new Set(budgetLines?.map(l => l.category_id) || [])];
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .in('id', categoryIds);

  const categoryMap = new Map(categories?.map(c => [c.id, c]) || []);

  // Fetch receipts for current month
  const { data: receipts } = await supabase
    .from('receipts')
    .select('id')
    .eq('user_id', userId)
    .gte('purchased_at', startDate.toISOString())
    .lte('purchased_at', endDate.toISOString());

  const receiptIds = receipts?.map(r => r.id) || [];

  // Fetch items for these receipts
  let spending = [];
  if (receiptIds.length > 0) {
    const { data: items } = await supabase
      .from('items')
      .select('category_id, total_price')
      .in('receipt_id', receiptIds);

    spending = items || [];
  }

  // Calculate spending by category
  const spendingByCategory = new Map();
  spending.forEach(item => {
    const categoryId = item.category_id || 'uncategorized';
    const current = spendingByCategory.get(categoryId) || 0;
    spendingByCategory.set(categoryId, current + item.total_price);
  });

  const result = {
    budget,
    budgetLines: (budgetLines || []).map(line => ({
      ...line,
      category: categoryMap.get(line.category_id),
      spent: spendingByCategory.get(line.category_id) || 0,
    })),
    totalSpent: Array.from(spendingByCategory.values()).reduce((sum, val) => sum + val, 0),
  };

  // Cache for 5 minutes
  cache.set(cacheKey, result, { ttl: CacheTTL.medium, storage: 'localStorage' });

  return result;
}

/**
 * Fetch all categories (cached for 30 minutes)
 */
export async function fetchCategories(supabase: SupabaseClient) {
  return cache.getOrFetch(
    CacheKeys.categories(),
    async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    { ttl: CacheTTL.long, storage: 'localStorage' }
  );
}

/**
 * Fetch all retailers (cached for 30 minutes)
 */
export async function fetchRetailers(supabase: SupabaseClient) {
  return cache.getOrFetch(
    CacheKeys.retailers(),
    async () => {
      const { data, error } = await supabase
        .from('retailers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    { ttl: CacheTTL.long, storage: 'localStorage' }
  );
}

/**
 * Batch fetch items for multiple receipts
 */
export async function fetchItemsForReceipts(
  supabase: SupabaseClient,
  receiptIds: string[]
) {
  if (receiptIds.length === 0) return [];

  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .in('receipt_id', receiptIds);

  if (error) throw error;

  // Group by receipt_id for easy lookup
  const itemsByReceipt = new Map<string, any[]>();
  items?.forEach(item => {
    const receiptId = item.receipt_id;
    if (!itemsByReceipt.has(receiptId)) {
      itemsByReceipt.set(receiptId, []);
    }
    itemsByReceipt.get(receiptId)!.push(item);
  });

  return itemsByReceipt;
}

/**
 * Invalidate user-specific cache
 */
export function invalidateUserCache(userId: string) {
  cache.invalidatePattern(`user:${userId}`);
  console.log('🗑️ Invalidated cache for user:', userId);
}

/**
 * Invalidate budget cache
 */
export function invalidateBudgetCache(userId: string) {
  cache.invalidatePattern(`user:${userId}:budget`);
  cache.invalidatePattern(`user:${userId}:receipts`);
  console.log('🗑️ Invalidated budget cache for user:', userId);
}

/**
 * Invalidate receipts cache
 */
export function invalidateReceiptsCache(userId: string) {
  cache.invalidatePattern(`user:${userId}:receipts`);
  console.log('🗑️ Invalidated receipts cache for user:', userId);
}
