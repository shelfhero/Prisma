/**
 * Dashboard Data Hook for Призма
 * Fetches and manages dashboard data from Supabase
 */

'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase-simple';
import { useAuth } from './useAuth';
import { Tables } from '@/types';
import { formatCurrency } from '@/lib/utils';

type ReceiptWithItems = Tables<'receipts'> & {
  items?: Array<{
    id: string;
    product_name: string;
    category?: {
      name: string;
    } | null;
  }>;
  retailer?: {
    name: string;
  } | null;
};

interface DashboardStats {
  totalReceipts: number;
  totalSpent: number;
  averageReceiptValue: number;
  thisMonthSpent: number;
  lastMonthSpent: number;
  spendingTrend: 'увеличение' | 'намаление' | 'стабилно';
  topCategories: CategorySpending[];
  recentReceipts: RecentReceipt[];
}

interface CategorySpending {
  categoryName: string;
  totalSpent: number;
  percentage: number;
  itemCount: number;
}

interface RecentReceipt {
  id: string;
  retailerName: string;
  totalAmount: number;
  currency: string;
  purchasedAt: string;
  itemsCount: number;
}

interface UseDashboardDataReturn {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

export function useDashboardData(): UseDashboardDataReturn {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  const fetchDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch receipts with related data
      const { data: receipts, error: receiptsError } = await supabase
        .from('receipts')
        .select(`
          id,
          total_amount,
          currency,
          purchased_at,
          retailer:retailers(name),
          items(id, product_name, category:categories(name))
        `)
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false });

      if (receiptsError) {
        throw new Error(`Грешка при зареждане на бележките: ${receiptsError.message}`);
      }

      // Calculate basic stats
      const totalReceipts = receipts?.length || 0;
      const totalSpent = receipts?.reduce((sum: number, receipt: ReceiptWithItems) => sum + receipt.total_amount, 0) || 0;
      const averageReceiptValue = totalReceipts > 0 ? totalSpent / totalReceipts : 0;

      // Calculate monthly spending
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisMonthReceipts = receipts?.filter((receipt: ReceiptWithItems) =>
        new Date(receipt.purchased_at) >= thisMonthStart
      ) || [];

      const lastMonthReceipts = receipts?.filter((receipt: ReceiptWithItems) => {
        const purchaseDate = new Date(receipt.purchased_at);
        return purchaseDate >= lastMonthStart && purchaseDate <= lastMonthEnd;
      }) || [];

      const thisMonthSpent = thisMonthReceipts.reduce((sum: number, receipt: ReceiptWithItems) => sum + receipt.total_amount, 0);
      const lastMonthSpent = lastMonthReceipts.reduce((sum: number, receipt: ReceiptWithItems) => sum + receipt.total_amount, 0);

      // Calculate spending trend
      let spendingTrend: 'увеличение' | 'намаление' | 'стабилно' = 'стабилно';
      if (lastMonthSpent > 0) {
        const changePercent = ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100;
        if (changePercent > 5) {
          spendingTrend = 'увеличение';
        } else if (changePercent < -5) {
          spendingTrend = 'намаление';
        }
      }

      // Calculate category spending
      const categorySpending = new Map<string, { totalSpent: number; itemCount: number }>();

      receipts?.forEach((receipt: ReceiptWithItems) => {
        if (receipt.items) {
          receipt.items.forEach((item: any) => {
            const categoryName = item.category?.name || 'Други';
            const existing = categorySpending.get(categoryName) || { totalSpent: 0, itemCount: 0 };

            // Estimate item cost based on total receipt value and item count
            const itemCost = receipt.total_amount / (receipt.items?.length || 1);

            categorySpending.set(categoryName, {
              totalSpent: existing.totalSpent + itemCost,
              itemCount: existing.itemCount + 1
            });
          });
        }
      });

      const topCategories: CategorySpending[] = Array.from(categorySpending.entries())
        .map(([categoryName, data]) => ({
          categoryName,
          totalSpent: data.totalSpent,
          itemCount: data.itemCount,
          percentage: totalSpent > 0 ? (data.totalSpent / totalSpent) * 100 : 0
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      // Prepare recent receipts
      const recentReceipts: RecentReceipt[] = (receipts || [])
        .slice(0, 5)
        .map((receipt: ReceiptWithItems) => ({
          id: receipt.id,
          retailerName: receipt.retailer?.name || 'Неизвестен магазин',
          totalAmount: receipt.total_amount,
          currency: receipt.currency,
          purchasedAt: receipt.purchased_at,
          itemsCount: receipt.items?.length || 0
        }));

      setStats({
        totalReceipts,
        totalSpent,
        averageReceiptValue,
        thisMonthSpent,
        lastMonthSpent,
        spendingTrend,
        topCategories,
        recentReceipts
      });

    } catch (err: any) {
      console.error('Dashboard data fetch error:', err);
      setError(err.message || 'Възникна грешка при зареждане на данните');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  return {
    stats,
    loading,
    error,
    refreshData
  };
}

export default useDashboardData;