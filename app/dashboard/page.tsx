'use client';

/**
 * Dashboard Feature Hub for Призма
 * Engaging feature hub showing personalized overview, quick actions, insights, and recent activity
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createBrowserClient } from '@/lib/supabase-simple';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import {
  Camera,
  PiggyBank,
  BarChart3,
  TrendingUp,
  Target,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Upload,
  Eye,
  Plus,
  Star,
  Award,
  Zap,
  Heart,
  Calendar
} from 'lucide-react';

// Lazy load ProtectedRoute since it's a wrapper component
const ProtectedRoute = dynamic(() => import('@/components/auth/ProtectedRoute'), {
  ssr: true,
});

// Types
interface DashboardData {
  user: any;
  currentMonth: {
    name: string;
    year: number;
    spent: number;
    budget: number;
    percentage: number;
    isOverBudget: boolean;
  };
  recentReceipts: Array<{
    id: number;
    retailer_name: string;
    total_amount: number;
    purchased_at: string;
    retailer_icon?: string;
  }>;
  categorySpending: Array<{
    category_name: string;
    category_icon: string;
    spent: number;
    budget: number;
    percentage: number;
    isOverBudget: boolean;
  }>;
  insights: {
    totalReceipts: number;
    totalSpent: number;
    avgReceiptAmount: number;
    daysPassed: number;
    topCategory: string;
    savingsThisMonth: number;
  };
  isNewUser: boolean;
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="h-8 bg-gray-200 rounded-lg w-64 animate-pulse"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section Skeleton */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mb-6 animate-pulse"></div>
          <div className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6">
              <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFeatures, setShowFeatures] = useState(false);
  const supabase = createBrowserClient();

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Get current month data
      const currentDate = new Date();
      const currentMonth = {
        name: currentDate.toLocaleDateString('bg-BG', { month: 'long' }),
        year: currentDate.getFullYear(),
        startDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999)
      };

      // Fetch budget data - use simple query to avoid 406 errors
      const { data: budgetsData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('period_type', 'monthly')
        .order('created_at', { ascending: false });

      if (budgetError) {
        console.error('Dashboard: Budget error', budgetError);
        throw budgetError;
      }

      // Find budget that overlaps with current month
      const budgetData = budgetsData?.find((b: any) => {
        const startDate = new Date(b.start_date);
        const endDate = new Date(b.end_date);
        return startDate <= currentMonth.endDate && endDate >= currentMonth.startDate;
      });

      // Fetch recent receipts - simplified to avoid 406 errors
      const { data: recentReceiptsData } = await supabase
        .from('receipts')
        .select('id, total_amount, purchased_at, retailer_id')
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false })
        .limit(5);

      // Fetch all retailers for mapping
      const { data: retailersData } = await supabase
        .from('retailers')
        .select('*');

      const retailersMap = new Map(retailersData?.map((r: any) => [r.id, r]) || []);

      const receiptsData = recentReceiptsData?.map((r: any) => ({
        id: r.id,
        total_amount: r.total_amount,
        purchased_at: r.purchased_at,
        retailers: retailersMap.get(r.retailer_id) ? { name: retailersMap.get(r.retailer_id)!.name } : null
      })) || [];

      // Fetch receipt items for current month - simplified to avoid 406 errors
      const { data: currentMonthReceipts } = await supabase
        .from('receipts')
        .select('id, purchased_at, retailer_id')
        .eq('user_id', user.id)
        .gte('purchased_at', currentMonth.startDate.toISOString())
        .lte('purchased_at', currentMonth.endDate.toISOString());

      const receiptIds = currentMonthReceipts?.map(r => r.id) || [];

      let receiptItemsData: any[] = [];
      if (receiptIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('items')
          .select('id, product_name, total_price, qty, category_id, receipt_id')
          .in('receipt_id', receiptIds);

        const receiptsMap = new Map(currentMonthReceipts?.map(r => [r.id, r]) || []);

        receiptItemsData = (itemsData || []).map(item => {
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

      // Fetch budget lines to get budget allocations (only if budget exists)
      let budgetLinesData = [];
      if (budgetData) {
        const { data: linesData } = await supabase
          .from('budget_lines')
          .select('*')
          .eq('budget_id', budgetData.id);

        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*');

        const categoriesMap = new Map(categoriesData?.map(cat => [cat.id, cat]) || []);

        budgetLinesData = (linesData || []).map(line => {
          const category = categoriesMap.get(line.category_id);
          return {
            id: line.id,
            category_id: line.category_id,
            category_name: category?.name || 'Неизвестна категория',
            limit_amount: line.limit_amount,
            icon: category?.icon || '📦',
            color: category?.color || 'gray'
          };
        });
      }

      // Calculate spending by category (same logic as budget page)
      const spendingByCategory = new Map();

      receiptItemsData?.forEach(item => {
        const categoryId = item.category_id || 'uncategorized';
        const current = spendingByCategory.get(categoryId) || { total: 0, items: [] };
        current.total += item.total_price;
        current.items.push(item);
        spendingByCategory.set(categoryId, current);
      });

      // Calculate insights
      const totalReceipts = receiptsData?.length || 0;
      const totalSpent = Array.from(spendingByCategory.values()).reduce((sum, cat) => sum + cat.total, 0);
      const avgReceiptAmount = totalReceipts > 0 ? totalSpent / totalReceipts : 0;

      const isNewUser = totalReceipts === 0;
      const budgetAmount = budgetData?.total_amount || 0;
      const budgetPercentage = budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;

      setData({
        user,
        currentMonth: {
          ...currentMonth,
          spent: totalSpent,
          budget: budgetAmount,
          percentage: budgetPercentage,
          isOverBudget: budgetPercentage > 100
        },
        recentReceipts: (receiptsData || []).map(receipt => ({
          id: receipt.id,
          retailer_name: receipt.retailers?.name || 'Неизвестен магазин',
          total_amount: receipt.total_amount,
          purchased_at: receipt.purchased_at,
          retailer_icon: getRetailerIcon(receipt.retailers?.name)
        })),
        categorySpending: (budgetLinesData || []).map(line => {
          const spending = spendingByCategory.get(line.category_id) || { total: 0, items: [] };
          const percentageUsed = line.limit_amount > 0 ? (spending.total / line.limit_amount) * 100 : 0;

          return {
            category_name: line.category_name,
            category_icon: line.icon || getCategoryIcon(line.category_name),
            spent: spending.total,
            budget: line.limit_amount,
            percentage: percentageUsed,
            isOverBudget: spending.total > line.limit_amount
          };
        }),
        insights: {
          totalReceipts,
          totalSpent,
          avgReceiptAmount,
          daysPassed: currentDate.getDate(), // Current day of the month
          topCategory: budgetLinesData?.find(line => {
            const spending = spendingByCategory.get(line.category_id);
            return spending && spending.total > 0;
          })?.category_name || 'Основни храни',
          savingsThisMonth: Math.max(0, budgetAmount - totalSpent)
        },
        isNewUser
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Грешка при зареждането на данните');
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getRetailerIcon = (retailerName: string) => {
    const name = retailerName?.toLowerCase() || '';
    if (name.includes('лидл') || name.includes('lidl')) return '🛒';
    if (name.includes('билла') || name.includes('billa')) return '🏪';
    if (name.includes('кауфланд') || name.includes('kaufland')) return '🏬';
    if (name.includes('фантастико') || name.includes('fantastico')) return '🎪';
    if (name.includes('пиколо') || name.includes('piccolo')) return '🏪';
    return '🏪';
  };

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName?.toLowerCase() || '';
    if (name.includes('храни') || name.includes('food')) return '🍎';
    if (name.includes('напитки') || name.includes('drink')) return '🍺';
    if (name.includes('готови') || name.includes('готово')) return '🍕';
    if (name.includes('закуски') || name.includes('snack')) return '🍭';
    if (name.includes('нехранителни')) return '🧴';
    if (name.includes('транспорт')) return '🚗';
    if (name.includes('развлечения')) return '🎮';
    return '📦';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('bg-BG', {
      style: 'currency',
      currency: 'BGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bg-BG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBudgetStatusMessage = (percentage: number, isOverBudget: boolean, hasBudget: boolean, spent: number) => {
    if (!hasBudget && spent > 0) {
      return { message: 'Започнете да следите разходите с бюджет 💰', color: 'text-blue-600' };
    }
    if (!hasBudget) {
      return { message: 'Добре дошли! Създайте първия си бюджет 🎯', color: 'text-gray-600' };
    }
    if (isOverBudget) {
      return { message: 'Надвишихте бюджета си 😟', color: 'text-red-600' };
    } else if (percentage > 80) {
      return { message: 'Внимание! Близо до лимита 🟡', color: 'text-orange-600' };
    } else if (percentage > 50) {
      return { message: 'На добър път 👍', color: 'text-blue-600' };
    } else {
      return { message: 'Отлично! Спазвате бюджета си 🎉', color: 'text-green-600' };
    }
  };

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Грешка при зареждането</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData} className="flex items-center space-x-2">
            <span>Опитайте отново</span>
          </Button>
        </Card>
      </div>
    );
  }

  if (!data) return <DashboardSkeleton />;

  const statusMessage = getBudgetStatusMessage(
    data.currentMonth.percentage,
    data.currentMonth.isOverBudget,
    data.currentMonth.budget > 0,
    data.currentMonth.spent
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Здравей, {data.user?.user_metadata?.full_name || data.user?.email?.split('@')[0] || 'потребител'}! 👋
                </h1>
                <p className="text-gray-600">Вашият умен асистент за пазаруване и бюджетиране</p>
              </div>
            </div>

            {!data.isNewUser && (
              <div className="hidden sm:flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-orange-600">
                  <Calendar className="w-5 h-5" />
                  <span className="font-semibold">Ден {data.insights.daysPassed}</span>
                </div>
                <div className="flex items-center space-x-2 text-green-600">
                  <Award className="w-5 h-5" />
                  <span className="font-semibold">{data.insights.totalReceipts} бона</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* SECTION 1: HERO / WELCOME SECTION */}
        {!data.isNewUser ? (
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-6 lg:mb-0">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {data.currentMonth.name} {data.currentMonth.year}
                </h2>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(data.currentMonth.spent)}
                  </div>
                  <div className="text-gray-600">
                    {data.currentMonth.budget > 0
                      ? `от ${formatCurrency(data.currentMonth.budget)} бюджет`
                      : 'без зададен бюджет'
                    }
                  </div>
                </div>

                {/* Progress Bar */}
                {data.currentMonth.budget > 0 ? (
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        data.currentMonth.isOverBudget
                          ? 'bg-gradient-to-r from-red-500 to-red-600'
                          : 'bg-gradient-to-r from-green-500 to-green-600'
                      }`}
                      style={{ width: `${Math.min(data.currentMonth.percentage, 100)}%` }}
                    ></div>
                  </div>
                ) : (
                  <div className="w-full bg-blue-100 rounded-lg p-3 mb-3">
                    <p className="text-blue-700 text-sm">
                      💡 Създайте бюджет, за да следите разходите си
                    </p>
                  </div>
                )}

                <p className={`font-semibold ${statusMessage.color}`}>
                  {statusMessage.message}
                </p>
              </div>

              <div className="flex flex-col space-y-3 lg:items-end">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Спестени този месец</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(data.insights.savingsThisMonth)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Среден бон</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {formatCurrency(data.insights.avgReceiptAmount)}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          // New User Welcome
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 p-6 lg:p-8 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Добре дошли в Призма! 🎉
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Готови ли сте да започнете умното управление на вашите разходи?
                Качете първия си касов бон и открийте магията на автоматичното проследяване!
              </p>
              <Link href="/upload-receipt">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                  <Camera className="w-5 h-5 mr-2" />
                  Качете първия си бон
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* SECTION 2: QUICK ACTIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Upload Receipt */}
          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-green-200">
            <Link href="/upload-receipt">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <div className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                    Най-често
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">📸 КАЧИ КАСОВ БОН</h3>
                <p className="text-gray-600 mb-4">Сканирай или качи снимка на касовия си бон</p>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Качи сега
                </Button>
              </div>
            </Link>
          </Card>

          {/* Budget */}
          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-blue-200">
            <Link href="/budget">
              <div className="p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <PiggyBank className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">💰 БЮДЖЕТ</h3>
                <p className="text-gray-600 mb-2">Виж и управлявай месечния си бюджет</p>
                {!data.isNewUser && (
                  <p className="text-sm font-semibold text-blue-600 mb-4">
                    {Math.round(data.currentMonth.percentage)}% използван
                  </p>
                )}
                <Button variant="outline" className="w-full border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Target className="w-4 h-4 mr-2" />
                  Управлявай
                </Button>
              </div>
            </Link>
          </Card>

          {/* Analytics */}
          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-purple-200">
            <Link href="/analytics">
              <div className="p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">📊 АНАЛИЗИ</h3>
                <p className="text-gray-600 mb-2">AI препоръки и smart insights за спестяване</p>
                {!data.isNewUser && (
                  <p className="text-sm font-semibold text-purple-600 mb-4">
                    {data.insights.totalReceipts} обработени бона
                  </p>
                )}
                <Button variant="outline" className="w-full border-purple-200 text-purple-700 hover:bg-purple-50">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Виж анализи
                </Button>
              </div>
            </Link>
          </Card>
        </div>

        {!data.isNewUser && (
          <>
            {/* SECTION 3: INSIGHTS & ANALYTICS */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">📈 Прозрения и статистики</h3>
                <Link href="/receipts">
                  <Button variant="ghost" size="sm">
                    Виж всички <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{data.insights.totalReceipts}</div>
                  <div className="text-sm text-gray-600">Общо бонове</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(data.insights.totalSpent)}</div>
                  <div className="text-sm text-gray-600">Общо похарчено</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{data.insights.daysPassed}/30</div>
                  <div className="text-sm text-gray-600">Дни от месеца</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">#{data.insights.topCategory}</div>
                  <div className="text-sm text-gray-600">Топ категория</div>
                </div>
              </div>
            </Card>

            {/* SECTION 4: RECENT RECEIPTS */}
            {data.recentReceipts.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">🧾 Последни касови бонове</h3>
                  <Link href="/receipts">
                    <Button variant="ghost" size="sm">
                      Виж всички <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>

                <div className="space-y-4">
                  {data.recentReceipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">{receipt.retailer_icon}</div>
                        <div>
                          <div className="font-semibold text-gray-900">{receipt.retailer_name}</div>
                          <div className="text-sm text-gray-600">{formatDate(receipt.purchased_at)}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(receipt.total_amount)}
                        </div>
                        <Link href={`/verify-receipt/${receipt.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" />
                            Виж
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* SECTION 5: CATEGORY HIGHLIGHTS */}
            {data.categorySpending.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">🏷️ Разходи по категории</h3>
                  <Link href="/budget">
                    <Button variant="ghost" size="sm">
                      Виж бюджета <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {data.categorySpending.slice(0, 5).map((category, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xl">{category.category_icon}</span>
                        <span className="font-semibold text-gray-900 text-sm">{category.category_name}</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900 mb-1">
                        {formatCurrency(category.spent)}/{formatCurrency(category.budget)}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full ${
                            category.isOverBudget ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(category.percentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className={`text-xs font-semibold ${
                        category.isOverBudget ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {Math.round(category.percentage)}%
                        {category.isOverBudget && ' - Над лимита!'}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* SECTION 6: FEATURES SHOWCASE */}
        <Card className="p-6">
          <button
            onClick={() => setShowFeatures(!showFeatures)}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="text-xl font-bold text-gray-900">🌟 Какво може Призма?</h3>
            <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${showFeatures ? 'rotate-90' : ''}`} />
          </button>

          {showFeatures && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">✓ Автоматично разпознаване</h4>
                <p className="text-sm text-gray-600">Просто снимайте бона и ние обработваме всичко</p>
              </div>

              <div className="text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">✓ Умно бюджетиране</h4>
                <p className="text-sm text-gray-600">Задавайте цели и следете прогреса в реално време</p>
              </div>

              <div className="text-center p-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">✓ Прозрачна аналитика</h4>
                <p className="text-sm text-gray-600">Детайлни отчети и прозрения за вашите разходи</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}