'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';
import {
  DashboardStats,
  DashboardFilters,
  CategoryBreakdownData,
  DetailedReceiptItem,
  CategoryWithDetails,
  StoreGroup,
  BudgetUpdateData
} from '@/types/dashboard';
import { Database } from '@/types/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Bulgarian categories mapping
const CATEGORY_MAPPING = {
  'Основни храни': { icon: '🍎', color: 'green' },
  'Готови храни': { icon: '🍕', color: 'orange' },
  'Напитки': { icon: '🍺', color: 'blue' },
  'Закуски': { icon: '🍭', color: 'purple' },
  'Нехранителни': { icon: '🧴', color: 'gray' },
} as const;

interface DashboardExpenseData {
  stats: DashboardStats;
  categories: CategoryBreakdownData[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  updateFilters: (newFilters: Partial<DashboardFilters>) => void;
  filters: DashboardFilters;
}

const defaultFilters: DashboardFilters = {
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  storeFilter: '',
  searchQuery: '',
  dateRange: {
    start: '',
    end: ''
  },
  hideEmptyCategories: false,
  sortBy: 'date',
  sortOrder: 'desc',
  pageSize: 20,
  currentPage: 1
};

export function useDashboardExpenseData(): DashboardExpenseData {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalReceipts: 0,
    totalItems: 0,
    totalSpent: 0,
    averagePerReceipt: 0,
    monthlyBudget: undefined,
    budgetUsed: 0,
    budgetRemaining: 0,
    selectedMonth: '',
    selectedYear: new Date().getFullYear()
  });
  const [categories, setCategories] = useState<CategoryBreakdownData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);

  const updateFilters = useCallback((newFilters: Partial<DashboardFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Calculate date range for the selected month/year
      const startOfMonth = new Date(filters.year, filters.month - 1, 1);
      const endOfMonth = new Date(filters.year, filters.month, 0);
      const startDate = startOfMonth.toISOString();
      const endDate = endOfMonth.toISOString();

      // Fetch receipts with items for the selected period
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('receipts')
        .select(`
          id,
          total_amount,
          purchased_at,
          receipt_number,
          retailer_id,
          retailers (
            id,
            name
          ),
          items (
            id,
            product_name,
            qty,
            unit,
            unit_price,
            total_price,
            category_id,
            categories (
              id,
              name,
              icon_name,
              color_hex
            )
          )
        `)
        .eq('user_id', user.id)
        .gte('purchased_at', startDate)
        .lte('purchased_at', endDate)
        .order('purchased_at', { ascending: false });

      if (receiptsError) {
        throw new Error(`Failed to fetch receipts: ${receiptsError.message}`);
      }

      // Process the data
      const receipts = receiptsData || [];

      // Calculate basic stats
      const totalReceipts = receipts.length;
      const allItems = receipts.flatMap(receipt => {
        const receiptRetailer = Array.isArray(receipt.retailers) ? receipt.retailers[0] : receipt.retailers;
        return (receipt.items || []).map(item => {
          const itemCategory = Array.isArray(item.categories) ? item.categories[0] : item.categories;
          return {
            ...item,
            receiptId: receipt.id,
            purchaseDate: receipt.purchased_at,
            storeName: receiptRetailer?.name || 'Неизвестен магазин',
            storeId: receipt.retailer_id,
            receiptNumber: receipt.receipt_number,
            categoryName: itemCategory?.name || 'Некатегоризирани',
            categoryIcon: itemCategory?.icon_name,
            categoryColor: itemCategory?.color_hex
          };
        });
      });

      const totalItems = allItems.length;
      const totalSpent = receipts.reduce((sum, receipt) => sum + receipt.total_amount, 0);
      const averagePerReceipt = totalReceipts > 0 ? totalSpent / totalReceipts : 0;

      // Group items by category
      const categoryGroups = new Map<string, DetailedReceiptItem[]>();

      allItems.forEach(item => {
        const categoryName = item.categoryName || 'Некатегоризирани';
        if (!categoryGroups.has(categoryName)) {
          categoryGroups.set(categoryName, []);
        }
        categoryGroups.get(categoryName)!.push({
          id: item.id,
          receiptId: item.receiptId,
          productName: item.product_name,
          quantity: item.qty,
          unit: item.unit,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
          purchaseDate: item.purchaseDate,
          storeName: item.storeName,
          storeId: item.storeId,
          receiptNumber: item.receiptNumber,
          categoryId: item.category_id,
          categoryName: item.categoryName
        });
      });

      // Create category breakdown data
      const categoryBreakdowns: CategoryBreakdownData[] = Array.from(categoryGroups.entries())
        .map(([categoryName, items]) => {
          // Group items by store
          const storeGroups = new Map<string, DetailedReceiptItem[]>();
          items.forEach(item => {
            const storeKey = item.storeId || 'unknown';
            if (!storeGroups.has(storeKey)) {
              storeGroups.set(storeKey, []);
            }
            storeGroups.get(storeKey)!.push(item);
          });

          const stores: StoreGroup[] = Array.from(storeGroups.entries()).map(([storeKey, storeItems]) => {
            const storeName = storeItems[0]?.storeName || 'Неизвестен магазин';
            const storeId = storeKey === 'unknown' ? null : storeKey;

            return {
              storeId,
              storeName,
              totalSpent: storeItems.reduce((sum, item) => sum + item.totalPrice, 0),
              itemCount: storeItems.length,
              receiptCount: new Set(storeItems.map(item => item.receiptId)).size,
              items: storeItems
            };
          }).sort((a, b) => b.totalSpent - a.totalSpent);

          const categoryTotalSpent = items.reduce((sum, item) => sum + item.totalPrice, 0);
          const categoryItemCount = items.length;
          const averageItemPrice = categoryItemCount > 0 ? categoryTotalSpent / categoryItemCount : 0;
          const mostExpensiveItem = items.reduce((max, item) =>
            item.totalPrice > (max?.totalPrice || 0) ? item : max, null as DetailedReceiptItem | null);
          const mostFrequentStore = stores[0]?.storeName || null;

          // Get category config - prefer database values, fallback to mapping
          const firstItem = items[0];
          const categoryConfig = CATEGORY_MAPPING[categoryName as keyof typeof CATEGORY_MAPPING] ||
            { icon: '📦', color: 'gray' };

          const categoryWithDetails: CategoryWithDetails = {
            id: firstItem?.categoryId || '',
            name: categoryName,
            icon: firstItem?.categoryIcon || categoryConfig.icon,
            color: firstItem?.categoryColor || categoryConfig.color,
            totalSpent: categoryTotalSpent,
            itemCount: categoryItemCount,
            percentage: totalSpent > 0 ? (categoryTotalSpent / totalSpent) * 100 : 0,
            budgetAmount: undefined, // TODO: Fetch from user preferences
            budgetUsed: categoryTotalSpent,
            budgetRemaining: 0,
            budgetStatus: 'good', // TODO: Calculate based on budget
            isExpanded: false,
            items
          };

          return {
            category: categoryWithDetails,
            stores,
            totalSpent: categoryTotalSpent,
            itemCount: categoryItemCount,
            averageItemPrice,
            mostExpensiveItem,
            mostFrequentStore,
            spendingTrend: 'stable' as const // TODO: Calculate trend
          };
        })
        .sort((a, b) => b.totalSpent - a.totalSpent);

      // Filter categories if needed
      const filteredCategories = filters.hideEmptyCategories
        ? categoryBreakdowns.filter(cat => cat.itemCount > 0)
        : categoryBreakdowns;

      // Apply search filter
      let searchFilteredCategories = filteredCategories;
      if (filters.searchQuery) {
        searchFilteredCategories = filteredCategories.map(category => ({
          ...category,
          category: {
            ...category.category,
            items: category.category.items.filter(item =>
              item.productName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
              item.storeName.toLowerCase().includes(filters.searchQuery.toLowerCase())
            )
          }
        })).filter(category => category.category.items.length > 0);
      }

      // Set the data
      setStats({
        totalReceipts,
        totalItems,
        totalSpent,
        averagePerReceipt,
        monthlyBudget: undefined, // TODO: Fetch from user preferences
        budgetUsed: totalSpent,
        budgetRemaining: 0, // TODO: Calculate based on budget
        selectedMonth: filters.month.toString(),
        selectedYear: filters.year
      });

      setCategories(searchFilteredCategories);

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filters]);

  const refreshData = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  // Fetch data when user or filters change
  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id, filters.month, filters.year, filters.hideEmptyCategories, filters.searchQuery]);

  return {
    stats,
    categories,
    loading,
    error,
    refreshData,
    updateFilters,
    filters
  };
}

// Additional utility functions for dashboard operations

export async function updateItemInDatabase(
  itemId: string,
  updates: {
    productName?: string;
    quantity?: number;
    unitPrice?: number;
    categoryId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {};
    if (updates.productName !== undefined) updateData.product_name = updates.productName;
    if (updates.quantity !== undefined) {
      updateData.qty = updates.quantity;
      updateData.total_price = updates.quantity * (updates.unitPrice || 0);
    }
    if (updates.unitPrice !== undefined) {
      updateData.unit_price = updates.unitPrice;
      updateData.total_price = (updates.quantity || 1) * updates.unitPrice;
    }
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;

    const { error } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', itemId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update item'
    };
  }
}

export async function deleteItemFromDatabase(itemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete item'
    };
  }
}

export async function updateBudget(
  userId: string,
  budgetData: BudgetUpdateData
): Promise<{ success: boolean; error?: string }> {
  try {
    // This would require a budgets table - for now, store in user preferences
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        // Store budget data in preferences JSON
        privacy_settings: {
          budgets: {
            [budgetData.categoryId]: {
              amount: budgetData.amount,
              month: budgetData.month,
              year: budgetData.year
            }
          }
        }
      });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update budget'
    };
  }
}