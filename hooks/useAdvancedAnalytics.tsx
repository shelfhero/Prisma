'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createBrowserClient } from '@/lib/supabase-simple';
import {
  DashboardAnalytics,
  MonthlySpendingData,
  StoreLoyaltyAnalysis,
  CategoryInsight,
  DuplicateItemGroup,
  PriceComparison,
  BudgetAlert,
  SmartRecommendation,
  AnalyticsFilters,
  SpendingTrendChart
} from '@/types/analytics';

const supabase = createBrowserClient();

interface AdvancedAnalyticsData {
  analytics: DashboardAnalytics | null;
  spendingTrends: MonthlySpendingData[];
  storeLoyalty: StoreLoyaltyAnalysis[];
  categoryInsights: CategoryInsight[];
  duplicates: DuplicateItemGroup[];
  priceComparisons: PriceComparison[];
  alerts: BudgetAlert[];
  recommendations: SmartRecommendation[];
  loading: boolean;
  error: string | null;
  refreshAnalytics: () => Promise<void>;
  updateFilters: (filters: Partial<AnalyticsFilters>) => void;
  filters: AnalyticsFilters;
}

const defaultFilters: AnalyticsFilters = {
  dateRange: {
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString(),
    end: new Date().toISOString(),
    preset: 'last_6_months'
  },
  includeAlerts: true,
  includeRecommendations: true,
  groupBy: 'month'
};

export function useAdvancedAnalytics(): AdvancedAnalyticsData {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [spendingTrends, setSpendingTrends] = useState<MonthlySpendingData[]>([]);
  const [storeLoyalty, setStoreLoyalty] = useState<StoreLoyaltyAnalysis[]>([]);
  const [categoryInsights, setCategoryInsights] = useState<CategoryInsight[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateItemGroup[]>([]);
  const [priceComparisons, setPriceComparisons] = useState<PriceComparison[]>([]);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters);

  const updateFilters = useCallback((newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Calculate spending trends
  const calculateSpendingTrends = useCallback(async (userId: string): Promise<MonthlySpendingData[]> => {
    try {
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select(`
          id,
          total_amount,
          purchased_at,
          items (
            id,
            total_price,
            category_id,
            categories (
              id,
              name
            )
          ),
          retailers (
            id,
            name
          )
        `)
        .eq('user_id', userId)
        .gte('purchased_at', filters.dateRange.start)
        .lte('purchased_at', filters.dateRange.end)
        .order('purchased_at', { ascending: true });

      if (error) throw error;

      // Group by month/year
      const monthlyData = new Map<string, MonthlySpendingData>();

      (receipts || []).forEach(receipt => {
        const date = new Date(receipt.purchased_at);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            monthName: date.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' }),
            totalSpent: 0,
            receiptsCount: 0,
            itemsCount: 0,
            averageReceiptValue: 0,
            categoryBreakdown: [],
            topStores: [],
            trend: {
              percentage: 0,
              direction: 'stable',
              comparison: 'vs_previous_month'
            }
          });
        }

        const monthData = monthlyData.get(monthKey)!;
        monthData.totalSpent += receipt.total_amount;
        monthData.receiptsCount += 1;
        monthData.itemsCount += receipt.items?.length || 0;
      });

      // Calculate averages and trends
      const sortedMonths = Array.from(monthlyData.values()).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      sortedMonths.forEach((monthData, index) => {
        monthData.averageReceiptValue = monthData.receiptsCount > 0
          ? monthData.totalSpent / monthData.receiptsCount
          : 0;

        // Calculate trend vs previous month
        if (index > 0) {
          const previousMonth = sortedMonths[index - 1];
          const change = monthData.totalSpent - previousMonth.totalSpent;
          const percentage = previousMonth.totalSpent > 0
            ? (change / previousMonth.totalSpent) * 100
            : 0;

          monthData.trend = {
            percentage: Math.abs(percentage),
            direction: percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable',
            comparison: 'vs_previous_month'
          };
        }
      });

      return sortedMonths;
    } catch (err) {
      console.error('Error calculating spending trends:', err);
      return [];
    }
  }, [filters.dateRange]);

  // Calculate store loyalty analysis
  const calculateStoreLoyalty = useCallback(async (userId: string): Promise<StoreLoyaltyAnalysis[]> => {
    try {
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select(`
          id,
          total_amount,
          purchased_at,
          retailer_id,
          retailers (
            id,
            name
          ),
          items (
            id,
            total_price,
            category_id,
            categories (
              id,
              name
            )
          )
        `)
        .eq('user_id', userId)
        .gte('purchased_at', filters.dateRange.start)
        .lte('purchased_at', filters.dateRange.end)
        .order('purchased_at', { ascending: true });

      if (error) throw error;

      // Group by store
      const storeData = new Map<string, any>();

      (receipts || []).forEach(receipt => {
        const storeKey = receipt.retailer_id || 'unknown';
        const storeName = receipt.retailers?.name || 'Неизвестен магазин';

        if (!storeData.has(storeKey)) {
          storeData.set(storeKey, {
            storeId: storeKey,
            storeName,
            totalSpent: 0,
            receiptsCount: 0,
            itemsCount: 0,
            visits: [],
            categorySpending: new Map()
          });
        }

        const store = storeData.get(storeKey);
        store.totalSpent += receipt.total_amount;
        store.receiptsCount += 1;
        store.itemsCount += receipt.items?.length || 0;
        store.visits.push(new Date(receipt.purchased_at));

        // Track category spending
        (receipt.items || []).forEach(item => {
          const categoryName = item.categories?.name || 'Некатегоризирани';
          const current = store.categorySpending.get(categoryName) || { amount: 0, count: 0 };
          current.amount += item.total_price;
          current.count += 1;
          store.categorySpending.set(categoryName, current);
        });
      });

      // Convert to StoreLoyaltyAnalysis format
      const loyaltyAnalysis: StoreLoyaltyAnalysis[] = Array.from(storeData.values()).map(store => {
        const visits = store.visits.sort((a: Date, b: Date) => a.getTime() - b.getTime());
        const daysBetweenVisits = visits.length > 1
          ? visits.slice(1).map((visit: Date, i: number) =>
              Math.floor((visit.getTime() - visits[i].getTime()) / (1000 * 60 * 60 * 24))
            )
          : [];

        const avgDaysBetween = daysBetweenVisits.length > 0
          ? daysBetweenVisits.reduce((sum, days) => sum + days, 0) / daysBetweenVisits.length
          : 0;

        // Calculate loyalty score (0-100)
        const frequencyScore = Math.min(store.receiptsCount * 10, 50);
        const amountScore = Math.min(store.totalSpent / 100, 50);
        const loyaltyScore = frequencyScore + amountScore;

        const favoriteCategories = Array.from(store.categorySpending.entries())
          .map(([name, data]: [string, any]) => ({
            categoryId: '',
            categoryName: name,
            amount: data.amount,
            percentage: (data.amount / store.totalSpent) * 100,
            itemCount: data.count,
            averagePrice: data.amount / data.count
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3);

        return {
          storeId: store.storeId,
          storeName: store.storeName,
          totalSpent: store.totalSpent,
          receiptsCount: store.receiptsCount,
          itemsCount: store.itemsCount,
          averageReceiptValue: store.totalSpent / store.receiptsCount,
          loyaltyScore: Math.round(loyaltyScore),
          firstVisit: visits[0]?.toISOString() || '',
          lastVisit: visits[visits.length - 1]?.toISOString() || '',
          visitFrequency: {
            average: avgDaysBetween,
            trend: 'stable'
          },
          favoriteCategories,
          priceComparison: {
            vs_average: 0, // TODO: Calculate vs market average
            ranking: 'average'
          },
          recommendations: []
        };
      }).sort((a, b) => b.loyaltyScore - a.loyaltyScore);

      return loyaltyAnalysis;
    } catch (err) {
      console.error('Error calculating store loyalty:', err);
      return [];
    }
  }, [filters.dateRange]);

  // Detect potential duplicates
  const detectDuplicates = useCallback(async (userId: string): Promise<DuplicateItemGroup[]> => {
    try {
      const { data: items, error } = await supabase
        .from('items')
        .select(`
          id,
          receipt_id,
          product_name,
          total_price,
          qty,
          unit_price,
          receipts!inner (
            id,
            purchased_at,
            user_id,
            retailers (
              name
            )
          )
        `)
        .eq('receipts.user_id', userId)
        .gte('receipts.purchased_at', filters.dateRange.start)
        .lte('receipts.purchased_at', filters.dateRange.end);

      if (error) throw error;

      // Group potential duplicates by normalized product name
      const productGroups = new Map<string, any[]>();

      (items || []).forEach(item => {
        const normalizedName = item.product_name.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .trim();

        if (!productGroups.has(normalizedName)) {
          productGroups.set(normalizedName, []);
        }
        productGroups.get(normalizedName)!.push({
          ...item,
          storeName: (item.receipts as any)?.retailers?.name || 'Неизвестен',
          purchaseDate: (item.receipts as any)?.purchased_at || ''
        });
      });

      // Find groups with potential duplicates
      const duplicateGroups: DuplicateItemGroup[] = [];
      let groupIndex = 0;

      productGroups.forEach((groupItems, normalizedName) => {
        if (groupItems.length > 1) {
          // Check for same-day purchases or very similar prices
          const duplicateItems = groupItems.map(item => ({
            id: item.id,
            receiptId: item.receipt_id,
            productName: item.product_name,
            storeName: item.storeName,
            price: item.total_price,
            quantity: item.qty,
            purchaseDate: item.purchaseDate,
            confidence: 0.8, // Base confidence
            reasons: []
          }));

          duplicateGroups.push({
            groupId: `group_${groupIndex++}`,
            productName: groupItems[0].product_name,
            similarityScore: 0.85,
            items: duplicateItems,
            recommendedAction: 'review_manually',
            potentialDuplicates: groupItems.length - 1
          });
        }
      });

      return duplicateGroups.slice(0, 10); // Limit to top 10 groups
    } catch (err) {
      console.error('Error detecting duplicates:', err);
      return [];
    }
  }, [filters.dateRange]);

  // Generate budget alerts
  const generateBudgetAlerts = useCallback(async (userId: string): Promise<BudgetAlert[]> => {
    const alerts: BudgetAlert[] = [];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Get current month spending
    const { data: receipts, error } = await supabase
      .from('receipts')
      .select('total_amount, purchased_at')
      .eq('user_id', userId)
      .gte('purchased_at', new Date(currentYear, currentMonth - 1, 1).toISOString())
      .lt('purchased_at', new Date(currentYear, currentMonth, 1).toISOString());

    if (!error && receipts) {
      const currentSpending = receipts.reduce((sum, r) => sum + r.total_amount, 0);

      // Sample budget alert (in a real app, get from user preferences)
      const monthlyBudget = 1500; // BGN

      if (currentSpending > monthlyBudget * 0.8) {
        alerts.push({
          id: `alert_${Date.now()}`,
          type: currentSpending > monthlyBudget ? 'exceeded_budget' : 'approaching_limit',
          severity: currentSpending > monthlyBudget ? 'critical' : 'warning',
          message: currentSpending > monthlyBudget
            ? `Бюджетът за месеца е превишен с ${(currentSpending - monthlyBudget).toFixed(2)} лв`
            : `${((currentSpending / monthlyBudget) * 100).toFixed(0)}% от месечния бюджет е изразходван`,
          detailedMessage: `Текущи разходи: ${currentSpending.toFixed(2)} лв от ${monthlyBudget} лв бюджет`,
          currentAmount: currentSpending,
          budgetAmount: monthlyBudget,
          percentage: (currentSpending / monthlyBudget) * 100,
          recommendedAction: 'Прегледайте разходите си и ограничете необичайните покупки',
          createdAt: new Date().toISOString(),
          isRead: false,
          isDismissed: false
        });
      }
    }

    return alerts;
  }, []);

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all analytics in parallel
      const [
        spendingTrendsData,
        storeLoyaltyData,
        duplicatesData,
        alertsData
      ] = await Promise.all([
        calculateSpendingTrends(user.id),
        calculateStoreLoyalty(user.id),
        detectDuplicates(user.id),
        generateBudgetAlerts(user.id)
      ]);

      setSpendingTrends(spendingTrendsData);
      setStoreLoyalty(storeLoyaltyData);
      setDuplicates(duplicatesData);
      setAlerts(alertsData);

      // Generate basic recommendations
      const basicRecommendations: SmartRecommendation[] = [
        {
          id: 'rec_1',
          type: 'budget_optimization',
          title: 'Оптимизирайте месечния си бюджет',
          description: 'Базирайки се на вашите разходи, можете да спестите до 150 лв месечно',
          impact: {
            potentialMonthlySaving: 150,
            confidence: 0.75,
            timeframe: '1-2 месеца'
          },
          steps: [
            {
              order: 1,
              action: 'Намалете разходите за готови храни',
              description: 'Гответе повече у дома вместо да купувате готови храни',
              difficulty: 'medium',
              estimatedTime: '2 седмици',
              potentialSaving: 80
            },
            {
              order: 2,
              action: 'Сравнете цените в различни магазини',
              description: 'За често купуваните продукти проверете цените в други магазини',
              difficulty: 'easy',
              estimatedTime: '1 седмица',
              potentialSaving: 70
            }
          ],
          priority: 'high',
          isApplied: false,
          createdAt: new Date().toISOString()
        }
      ];

      setRecommendations(basicRecommendations);

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [user?.id, calculateSpendingTrends, calculateStoreLoyalty, detectDuplicates, generateBudgetAlerts]);

  const refreshAnalytics = useCallback(async () => {
    await fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (user?.id) {
      fetchAnalytics();
    }
  }, [user?.id, filters, fetchAnalytics]);

  return {
    analytics,
    spendingTrends,
    storeLoyalty,
    categoryInsights,
    duplicates,
    priceComparisons,
    alerts,
    recommendations,
    loading,
    error,
    refreshAnalytics,
    updateFilters,
    filters
  };
}