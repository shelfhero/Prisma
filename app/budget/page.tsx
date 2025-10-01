/**
 * Budget Dashboard Page for Призма
 * Comprehensive budget management and spending tracking
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createBrowserClient } from '@/lib/supabase-simple';
import {
  PiggyBank,
  TrendingUp,
  Calendar,
  DollarSign,
  Plus,
  Edit,
  History,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import BudgetHistory from '@/components/budget/BudgetHistory';
import SmartBudgetFeatures from '@/components/budget/SmartBudgetFeatures';

// Types
interface Budget {
  id: string;
  user_id: string;
  name: string;
  total_amount: number;
  period_type: 'monthly';
  start_date: string;
  end_date: string;
  created_at: string;
}

interface BudgetLine {
  id: string;
  budget_id: string;
  category_id: string;
  category_name: string;
  limit_amount: number;
  icon: string;
  color: string;
}

interface CategorySpending {
  category_id: string;
  category_name: string;
  category_icon: string;
  budget_amount: number;
  actual_amount: number;
  percentage_used: number;
  remaining_amount: number;
  items_count: number;
  recent_items: ExpenseItem[];
}

interface ExpenseItem {
  id: string;
  product_name: string;
  total_price: number;
  qty: number;
  purchased_at: string;
  store_name: string;
  receipt_id: string;
}

// Category configuration
const CATEGORIES = [
  {
    id: 'osnovni-hrani',
    name: 'Основни храни',
    icon: '🍎',
    color: 'green',
    defaultPercentage: 60
  },
  {
    id: 'gotovi-hrani',
    name: 'Готови храни',
    icon: '🍕',
    color: 'orange',
    defaultPercentage: 15
  },
  {
    id: 'napitki',
    name: 'Напитки',
    icon: '🍺',
    color: 'blue',
    defaultPercentage: 10
  },
  {
    id: 'zakuski',
    name: 'Закуски',
    icon: '🍭',
    color: 'purple',
    defaultPercentage: 10
  },
  {
    id: 'nehranitelni',
    name: 'Нехранителни',
    icon: '🧴',
    color: 'gray',
    defaultPercentage: 5
  }
];

export default function BudgetPage() {
  return (
    <ProtectedRoute>
      <BudgetDashboard />
    </ProtectedRoute>
  );
}

function BudgetDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showBudgetSetup, setShowBudgetSetup] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'smart'>('overview');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasPrePopulated, setHasPrePopulated] = useState(false);

  // Budget setup state
  const [totalBudget, setTotalBudget] = useState<number>(500);
  const [categoryAllocations, setCategoryAllocations] = useState<Record<string, number>>(
    CATEGORIES.reduce((acc, cat) => ({
      ...acc,
      [cat.id]: cat.defaultPercentage
    }), {})
  );

  const supabase = createBrowserClient();

  // Get current month info
  const getCurrentMonth = () => {
    const now = new Date();
    const monthNames = [
      'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
      'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
    ];
    return {
      name: monthNames[now.getMonth()],
      year: now.getFullYear(),
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      daysLeft: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()
    };
  };

  // Fetch budget data
  const fetchBudgetData = useCallback(async () => {
    if (!user?.id) {
      console.log('fetchBudgetData: No user ID');
      return;
    }

    console.log('fetchBudgetData: Starting...');

    try {
      setLoading(true);
      setError(null);

      const currentMonth = getCurrentMonth();
      console.log('fetchBudgetData: Current month', currentMonth);

      // Fetch current budget - use simple query to avoid 406 errors
      const { data: budgetsData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('period_type', 'monthly')
        .order('created_at', { ascending: false });

      if (budgetError) {
        console.error('fetchBudgetData: Budget error', budgetError);
        throw budgetError;
      }

      console.log('fetchBudgetData: Budgets data received', budgetsData);

      // Find budget that overlaps with current month
      const budgetData = budgetsData?.find(b => {
        const startDate = new Date(b.start_date);
        const endDate = new Date(b.end_date);
        return startDate <= currentMonth.endDate && endDate >= currentMonth.startDate;
      });

      console.log('fetchBudgetData: Current month budget', budgetData);

      if (!budgetData) {
        console.log('fetchBudgetData: No budget found for current month');
        setBudget(null);
        setBudgetLines([]);
        setCategorySpending([]);
        // Don't automatically show setup form - let the render handle it
        return;
      }

      console.log('fetchBudgetData: Setting budget', budgetData);
      setBudget(budgetData);

      // Fetch budget lines
      const { data: linesData, error: linesError } = await supabase
        .from('budget_lines')
        .select('*')
        .eq('budget_id', budgetData.id);

      if (linesError) {
        console.error('fetchBudgetData: Lines error', linesError);
        throw linesError;
      }

      console.log('fetchBudgetData: Budget lines received', linesData);

      // Fetch categories separately to avoid 406 errors
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*');

      const categoriesMap = new Map(categoriesData?.map(cat => [cat.id, cat]) || []);

      const processedLines = (linesData || []).map(line => {
        const category = categoriesMap.get(line.category_id);
        return {
          id: line.id,
          budget_id: line.budget_id,
          category_id: line.category_id,
          category_name: category?.name || 'Неизвестна категория',
          limit_amount: line.limit_amount,
          icon: category?.icon || '📦',
          color: category?.color || 'gray'
        };
      });

      setBudgetLines(processedLines);

      // Fetch actual spending for current month - simplified query to avoid 406 errors
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('receipts')
        .select('id, purchased_at, retailer_id')
        .eq('user_id', user.id)
        .gte('purchased_at', currentMonth.startDate.toISOString())
        .lte('purchased_at', currentMonth.endDate.toISOString());

      if (receiptsError) {
        console.error('fetchBudgetData: Receipts error', receiptsError);
        throw receiptsError;
      }

      const receiptIds = receiptsData?.map(r => r.id) || [];

      let spendingData: any[] = [];
      if (receiptIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('id, product_name, total_price, qty, category_id, receipt_id')
          .in('receipt_id', receiptIds);

        if (itemsError) {
          console.error('fetchBudgetData: Items error', itemsError);
          throw itemsError;
        }

        // Fetch retailers for store names
        const { data: retailersData } = await supabase
          .from('retailers')
          .select('*');

        const retailersMap = new Map(retailersData?.map(r => [r.id, r]) || []);
        const receiptsMap = new Map(receiptsData?.map(r => [r.id, r]) || []);

        spendingData = (itemsData || []).map(item => {
          const receipt = receiptsMap.get(item.receipt_id);
          const retailer = receipt ? retailersMap.get(receipt.retailer_id) : null;
          return {
            ...item,
            receipts: {
              id: receipt?.id,
              purchased_at: receipt?.purchased_at,
              retailers: retailer ? { name: retailer.name } : null
            }
          };
        });
      }

      console.log('fetchBudgetData: Spending data processed', spendingData.length, 'items');

      // Process spending data by category
      const spendingByCategory = new Map<string, {
        total: number;
        items: ExpenseItem[];
      }>();

      (spendingData || []).forEach(item => {
        const categoryId = item.category_id || 'uncategorized';
        const current = spendingByCategory.get(categoryId) || { total: 0, items: [] };

        current.total += item.total_price;
        current.items.push({
          id: item.id,
          product_name: item.product_name,
          total_price: item.total_price,
          qty: item.qty,
          purchased_at: item.receipts.purchased_at,
          store_name: item.receipts.retailers?.name || 'Неизвестен магазин',
          receipt_id: item.receipts.id
        });

        spendingByCategory.set(categoryId, current);
      });

      // Create category spending summary
      // ONLY show categories that have budget allocations for this month
      // De-duplicate by category_id - only keep the latest budget line for each category
      const categoryLinesMap = new Map<string, typeof processedLines[0]>();
      processedLines.forEach(line => {
        categoryLinesMap.set(line.category_id, line);
      });

      console.log('fetchBudgetData: Processed lines count', processedLines.length);
      console.log('fetchBudgetData: Unique categories after dedup', categoryLinesMap.size);

      const categorySpendingSummary = Array.from(categoryLinesMap.values()).map(line => {
        const spending = spendingByCategory.get(line.category_id) || { total: 0, items: [] };
        const percentageUsed = line.limit_amount > 0 ? (spending.total / line.limit_amount) * 100 : 0;

        return {
          category_id: line.category_id,
          category_name: line.category_name,
          category_icon: line.icon,
          budget_amount: line.limit_amount,
          actual_amount: spending.total,
          percentage_used: percentageUsed,
          remaining_amount: Math.max(0, line.limit_amount - spending.total),
          items_count: spending.items.length,
          recent_items: spending.items
            .sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime())
            .slice(0, 5)
        };
      });

      console.log('fetchBudgetData: Final category spending summary count', categorySpendingSummary.length);

      setCategorySpending(categorySpendingSummary);

    } catch (err) {
      console.error('Error fetching budget data:', err);
      setError(err instanceof Error ? err.message : 'Грешка при зареждане на данните');
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  // Create or update budget
  const createBudget = async () => {
    if (!user?.id) {
      console.error('No user ID found');
      return;
    }

    try {
      console.log('Creating/updating budget...', { isEditing: !!budget, totalBudget, categoryAllocations });
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const currentMonth = getCurrentMonth();
      const isEditing = !!budget;

      if (isEditing) {
        // UPDATE existing budget
        const { error: budgetError } = await supabase
          .from('budgets')
          .update({
            total_amount: totalBudget,
            updated_at: new Date().toISOString()
          })
          .eq('id', budget.id)
          .eq('user_id', user.id);

        if (budgetError) throw budgetError;

        // Update or create budget lines for each category
        for (const category of CATEGORIES) {
          const percentage = categoryAllocations[category.id];
          const amount = (totalBudget * percentage) / 100;

          // Get or create category
          let { data: existingCategory } = await supabase
            .from('categories')
            .select('id')
            .eq('name', category.name)
            .single();

          let categoryId = existingCategory?.id;

          if (!categoryId) {
            const { data: newCategory, error: categoryError } = await supabase
              .from('categories')
              .insert({
                name: category.name,
                icon: category.icon,
                color: category.color
              })
              .select('id')
              .single();

            if (categoryError) throw categoryError;
            categoryId = newCategory.id;
          }

          // Check if budget line exists - compare as numbers
          const existingLine = budgetLines.find(line => {
            const lineId = typeof line.category_id === 'string' ? parseInt(line.category_id) : line.category_id;
            return lineId === categoryId;
          });

          console.log(`Category ${category.name} (ID: ${categoryId}): ${existingLine ? 'UPDATING' : 'CREATING'} budget line`);

          if (existingLine) {
            // Update existing budget line
            const { error: lineError } = await supabase
              .from('budget_lines')
              .update({
                limit_amount: amount,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingLine.id);

            if (lineError) throw lineError;
          } else {
            // Create new budget line
            const { error: lineError } = await supabase
              .from('budget_lines')
              .insert({
                budget_id: budget.id,
                category_id: categoryId,
                limit_amount: amount
              });

            if (lineError) throw lineError;
          }
        }
      } else {
        // CREATE new budget
        const { data: budgetData, error: budgetError } = await supabase
          .from('budgets')
          .insert({
            user_id: user.id,
            name: `Месечен бюджет ${currentMonth.name} ${currentMonth.year}`,
            total_amount: totalBudget,
            period_type: 'monthly',
            start_date: currentMonth.startDate.toISOString(),
            end_date: currentMonth.endDate.toISOString()
          })
          .select()
          .single();

        if (budgetError) throw budgetError;

        // Get or create categories and create budget lines
        for (const category of CATEGORIES) {
          const percentage = categoryAllocations[category.id];
          const amount = (totalBudget * percentage) / 100;

          // First try to get existing category
          let { data: existingCategory } = await supabase
            .from('categories')
            .select('id')
            .eq('name', category.name)
            .single();

          let categoryId = existingCategory?.id;

          // Create category if it doesn't exist
          if (!categoryId) {
            const { data: newCategory, error: categoryError } = await supabase
              .from('categories')
              .insert({
                name: category.name,
                icon: category.icon,
                color: category.color
              })
              .select('id')
              .single();

            if (categoryError) throw categoryError;
            categoryId = newCategory.id;
          }

          // Create budget line
          await supabase
            .from('budget_lines')
            .insert({
              budget_id: budgetData.id,
              category_id: categoryId,
              limit_amount: amount
            });
        }
      }

      console.log('Budget creation/update successful, refetching data...');

      // First refetch the data
      await fetchBudgetData();

      console.log('Data refetched successfully');

      // Then hide the setup form and show success message
      setShowBudgetSetup(false);
      setSuccessMessage(isEditing ? 'Бюджетът беше успешно редактиран!' : 'Бюджетът беше успешно създаден!');

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (err) {
      console.error('Error creating/updating budget:', err);
      setError(err instanceof Error ? err.message : 'Грешка при създаване на бюджет');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('bg-BG', {
      style: 'currency',
      currency: 'BGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount).replace('BGN', 'лв');
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bg-BG');
  };

  // Get progress color
  const getProgressColor = (percentage: number) => {
    if (percentage <= 70) return 'bg-green-500';
    if (percentage <= 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get status icon
  const getStatusIcon = (percentage: number) => {
    if (percentage <= 70) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (percentage <= 90) return <Clock className="w-5 h-5 text-yellow-600" />;
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
  };

  // Update allocation percentages
  const updateAllocation = (categoryId: string, percentage: number) => {
    setCategoryAllocations(prev => ({
      ...prev,
      [categoryId]: percentage
    }));
  };

  // Calculate total percentage
  const totalPercentage = Object.values(categoryAllocations).reduce((sum, val) => sum + val, 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchBudgetData();
    }
  }, [fetchBudgetData, mounted]);

  // Pre-populate form when editing - only run when showBudgetSetup first becomes true
  useEffect(() => {
    if (showBudgetSetup && budget && budgetLines.length > 0 && !hasPrePopulated) {
      // Set total budget
      setTotalBudget(budget.total_amount);

      // Calculate allocations from existing budget lines
      const allocations: Record<string, number> = {};

      // First set defaults
      CATEGORIES.forEach(cat => {
        allocations[cat.id] = cat.defaultPercentage;
      });

      // Then override with actual budget line values
      budgetLines.forEach(line => {
        const category = CATEGORIES.find(cat => cat.name === line.category_name);
        if (category) {
          const percentage = budget.total_amount > 0
            ? (line.limit_amount / budget.total_amount) * 100
            : 0;
          allocations[category.id] = Math.round(percentage * 10) / 10; // Round to 1 decimal
        }
      });

      setCategoryAllocations(allocations);
      setHasPrePopulated(true);
    }

    // Reset the flag when the form is hidden
    if (!showBudgetSetup && hasPrePopulated) {
      setHasPrePopulated(false);
    }
  }, [showBudgetSetup, budget, budgetLines, hasPrePopulated]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Зареждане на бюджета...</p>
        </div>
      </div>
    );
  }

  const currentMonth = getCurrentMonth();
  const totalSpent = categorySpending.reduce((sum, cat) => sum + cat.actual_amount, 0);
  const totalBudgetAmount = budget?.total_amount || 0;
  const overallPercentage = totalBudgetAmount > 0 ? (totalSpent / totalBudgetAmount) * 100 : 0;
  const averageDailySpend = totalSpent / (new Date().getDate());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <PiggyBank className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Бюджет
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              {budget && (
                <>
                  <div className="flex space-x-1 mr-4">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        activeTab === 'overview'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Преглед
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        activeTab === 'history'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <History className="w-4 h-4 mr-1 inline" />
                      История
                    </button>
                    <button
                      onClick={() => setActiveTab('smart')}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        activeTab === 'smart'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 mr-1 inline" />
                      Интелигентни
                    </button>
                  </div>
                  {activeTab === 'overview' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setShowBudgetSetup(true)}
                        className="flex items-center space-x-2"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Редактирай</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push('/upload-receipt')}
                        className="flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Добави бон</span>
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && budget && (
          <BudgetHistory />
        )}

        {/* Smart Features Tab */}
        {activeTab === 'smart' && budget && (
          <SmartBudgetFeatures />
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* SECTION 1: BUDGET SETUP */}
            {(!budget || showBudgetSetup) && (
          <Card className="mb-8 p-6">
            <div className="text-center mb-6">
              <PiggyBank className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {budget ? 'Редактирай бюджета' : 'Създайте вашия първи бюджет'}
              </h2>
              <p className="text-gray-600">
                Настройте месечния си бюджет и разпределете средствата по категории
              </p>
            </div>

            {/* Total Budget Input */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Общ месечен бюджет
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-semibold text-center"
                  placeholder="500"
                />
                <span className="absolute right-3 top-3 text-gray-500">лв</span>
              </div>
            </div>

            {/* Category Allocations */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Разпределение по категории
              </h3>

              {CATEGORIES.map((category) => {
                const percentage = categoryAllocations[category.id];
                const amount = (totalBudget * percentage) / 100;

                return (
                  <div key={category.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{category.icon}</span>
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(amount)}</div>
                        <div className="text-sm text-gray-500">{percentage}%</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={percentage}
                        onChange={(e) => updateAllocation(category.id, Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={percentage}
                        onChange={(e) => updateAllocation(category.id, Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </div>
                );
              })}

              {/* Total Percentage Check */}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Общо разпределение:</span>
                  <span className={`font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalPercentage}%
                  </span>
                </div>
                {totalPercentage !== 100 && (
                  <p className="text-sm text-red-600 mt-1">
                    Общото разпределение трябва да е точно 100%
                  </p>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end space-x-3">
              {budget && (
                <Button
                  variant="outline"
                  onClick={() => setShowBudgetSetup(false)}
                >
                  Отказ
                </Button>
              )}
              <Button
                onClick={createBudget}
                disabled={totalPercentage !== 100 || loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {budget ? 'Запази промените' : 'Създай бюджет'}
              </Button>
            </div>
          </Card>
        )}

        {/* SECTION 2: BUDGET OVERVIEW */}
        {budget && !showBudgetSetup && (
          <>
            <Card className="mb-8 p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {currentMonth.name} {currentMonth.year}
                </h2>
                <div className="text-4xl font-bold mb-2">
                  {formatCurrency(totalSpent)} <span className="text-lg text-gray-500">от</span> {formatCurrency(totalBudgetAmount)}
                </div>
                <div className="text-lg text-gray-600">
                  ({overallPercentage.toFixed(1)}% използвано)
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full transition-all duration-300 ${getProgressColor(overallPercentage)}`}
                    style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(totalBudgetAmount - totalSpent)}
                  </div>
                  <div className="text-sm text-gray-600">Остават</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {currentMonth.daysLeft}
                  </div>
                  <div className="text-sm text-gray-600">Дни до края</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(averageDailySpend)}
                  </div>
                  <div className="text-sm text-gray-600">Средно на ден</div>
                </div>
              </div>
            </Card>

            {/* SECTION 3: CATEGORY BREAKDOWN */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {categorySpending.map((category) => (
                <Card key={category.category_id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{category.category_icon}</span>
                      <h3 className="font-semibold">{category.category_name}</h3>
                    </div>
                    {getStatusIcon(category.percentage_used)}
                  </div>

                  {/* Budget vs Actual */}
                  <div className="mb-4">
                    <div className="text-lg font-bold">
                      {formatCurrency(category.actual_amount)} / {formatCurrency(category.budget_amount)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {category.percentage_used.toFixed(1)}% използвано
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(category.percentage_used)}`}
                        style={{ width: `${Math.min(category.percentage_used, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Remaining Amount */}
                  <div className="mb-4">
                    <div className="text-sm text-gray-600">
                      {category.remaining_amount > 0
                        ? `Остават ${formatCurrency(category.remaining_amount)}`
                        : `Превишение с ${formatCurrency(-category.remaining_amount)}`
                      }
                    </div>
                  </div>

                  {/* Recent Items */}
                  {category.recent_items.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Последни покупки:
                      </h4>
                      <div className="space-y-1">
                        {category.recent_items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex justify-between text-xs text-gray-600">
                            <span className="truncate flex-1 mr-2">{item.product_name}</span>
                            <span>{formatCurrency(item.total_price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View All Button */}
                  {category.items_count > 3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedCategory(
                        expandedCategory === category.category_id ? null : category.category_id
                      )}
                      className="w-full flex items-center justify-center space-x-2"
                    >
                      <span>Виж всички ({category.items_count})</span>
                      {expandedCategory === category.category_id ?
                        <ChevronUp className="w-4 h-4" /> :
                        <ChevronDown className="w-4 h-4" />
                      }
                    </Button>
                  )}
                </Card>
              ))}
            </div>

            {/* SECTION 4: CATEGORY DETAIL VIEW */}
            {expandedCategory && (
              <Card className="p-6">
                {(() => {
                  const category = categorySpending.find(c => c.category_id === expandedCategory);
                  if (!category) return null;

                  return (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{category.category_icon}</span>
                          <h3 className="text-xl font-semibold">{category.category_name}</h3>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setExpandedCategory(null)}
                        >
                          Затвори
                        </Button>
                      </div>

                      {/* Category Summary */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold">{formatCurrency(category.budget_amount)}</div>
                            <div className="text-sm text-gray-600">Бюджет</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{formatCurrency(category.actual_amount)}</div>
                            <div className="text-sm text-gray-600">Харчени</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{category.percentage_used.toFixed(1)}%</div>
                            <div className="text-sm text-gray-600">Използвано</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{category.items_count}</div>
                            <div className="text-sm text-gray-600">Покупки</div>
                          </div>
                        </div>
                      </div>

                      {/* Items Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Продукт
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Магазин
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Дата
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Количество
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Сума
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {category.recent_items
                              .sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime())
                              .map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {item.product_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {item.store_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(item.purchased_at)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {item.qty}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {formatCurrency(item.total_price)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Category Total */}
                        <div className="bg-gray-50 px-6 py-3 border-t">
                          <div className="flex justify-between items-center font-semibold">
                            <span>Общо за категорията:</span>
                            <span>{formatCurrency(category.actual_amount)}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </Card>
            )}
          </>
        )}
          </>
        )}
      </main>
    </div>
  );
}