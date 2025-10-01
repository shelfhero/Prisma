'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createBrowserClient } from '@/lib/supabase-simple';

interface BudgetHistoryItem {
  id: string;
  name: string;
  total_amount: number;
  period_type: 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

interface BudgetTrend {
  period: string;
  budget_amount: number;
  actual_spent: number;
  variance: number;
  variance_percentage: number;
  category_breakdown: {
    category_name: string;
    budgeted: number;
    spent: number;
    variance: number;
  }[];
}

interface MonthlyComparison {
  current_month: {
    budget: number;
    spent: number;
    remaining: number;
  };
  previous_month: {
    budget: number;
    spent: number;
    remaining: number;
  };
  change: {
    budget_change: number;
    spending_change: number;
    efficiency_improvement: number;
  };
}

const BudgetHistory = () => {
  const { user } = useAuth();
  const [budgetHistory, setBudgetHistory] = useState<BudgetHistoryItem[]>([]);
  const [budgetTrends, setBudgetTrends] = useState<BudgetTrend[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparison | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year'>('6months');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'trends' | 'comparison'>('history');

  const supabase = createBrowserClient();

  useEffect(() => {
    if (user?.id) {
      fetchBudgetHistory();
      fetchBudgetTrends();
      fetchMonthlyComparison();
    }
  }, [user?.id, selectedPeriod]);

  const fetchBudgetHistory = async () => {
    if (!user?.id) return;

    const monthsBack = selectedPeriod === '3months' ? 3 : selectedPeriod === '6months' ? 6 : 12;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching budget history:', error);
      return;
    }

    setBudgetHistory(data || []);
  };

  const fetchBudgetTrends = async () => {
    if (!user?.id) return;

    const monthsBack = selectedPeriod === '3months' ? 3 : selectedPeriod === '6months' ? 6 : 12;
    const trends: BudgetTrend[] = [];

    for (let i = 0; i < monthsBack; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      // Get budget for this month
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('total_amount, budget_lines(limit_amount, categories(name))')
        .eq('user_id', user.id)
        .gte('start_date', startOfMonth.toISOString())
        .lte('end_date', endOfMonth.toISOString())
        .single();

      // Get actual spending for this month
      const { data: spendingData } = await supabase
        .from('items')
        .select('total_price, receipts!inner(purchased_at), categories(name)')
        .eq('receipts.user_id', user.id)
        .gte('receipts.purchased_at', startOfMonth.toISOString())
        .lte('receipts.purchased_at', endOfMonth.toISOString());

      const budget_amount = budgetData?.total_amount || 0;
      const actual_spent = spendingData?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
      const variance = budget_amount - actual_spent;
      const variance_percentage = budget_amount > 0 ? (variance / budget_amount) * 100 : 0;

      // Category breakdown
      const category_breakdown = budgetData?.budget_lines?.map((line: any) => {
        const categorySpent = spendingData
          ?.filter(item => item.categories?.name === line.categories?.name)
          .reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;

        return {
          category_name: line.categories?.name || 'Unknown',
          budgeted: line.limit_amount || 0,
          spent: categorySpent,
          variance: (line.limit_amount || 0) - categorySpent
        };
      }) || [];

      trends.push({
        period: date.toLocaleDateString('bg-BG', { year: 'numeric', month: 'long' }),
        budget_amount,
        actual_spent,
        variance,
        variance_percentage,
        category_breakdown
      });
    }

    setBudgetTrends(trends);
  };

  const fetchMonthlyComparison = async () => {
    if (!user?.id) return;

    const currentMonth = new Date();
    const currentStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const currentEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const previousStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
    const previousEnd = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);

    // Current month data
    const { data: currentBudget } = await supabase
      .from('budgets')
      .select('total_amount')
      .eq('user_id', user.id)
      .gte('start_date', currentStart.toISOString())
      .lte('end_date', currentEnd.toISOString())
      .single();

    const { data: currentSpending } = await supabase
      .from('items')
      .select('total_price, receipts!inner(purchased_at)')
      .eq('receipts.user_id', user.id)
      .gte('receipts.purchased_at', currentStart.toISOString())
      .lte('receipts.purchased_at', currentEnd.toISOString());

    // Previous month data
    const { data: previousBudget } = await supabase
      .from('budgets')
      .select('total_amount')
      .eq('user_id', user.id)
      .gte('start_date', previousStart.toISOString())
      .lte('end_date', previousEnd.toISOString())
      .single();

    const { data: previousSpending } = await supabase
      .from('items')
      .select('total_price, receipts!inner(purchased_at)')
      .eq('receipts.user_id', user.id)
      .gte('receipts.purchased_at', previousStart.toISOString())
      .lte('receipts.purchased_at', previousEnd.toISOString());

    const currentBudgetAmount = currentBudget?.total_amount || 0;
    const currentSpentAmount = currentSpending?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
    const previousBudgetAmount = previousBudget?.total_amount || 0;
    const previousSpentAmount = previousSpending?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;

    const comparison: MonthlyComparison = {
      current_month: {
        budget: currentBudgetAmount,
        spent: currentSpentAmount,
        remaining: currentBudgetAmount - currentSpentAmount
      },
      previous_month: {
        budget: previousBudgetAmount,
        spent: previousSpentAmount,
        remaining: previousBudgetAmount - previousSpentAmount
      },
      change: {
        budget_change: currentBudgetAmount - previousBudgetAmount,
        spending_change: currentSpentAmount - previousSpentAmount,
        efficiency_improvement:
          previousBudgetAmount > 0 && currentBudgetAmount > 0
            ? ((currentBudgetAmount - currentSpentAmount) / currentBudgetAmount) -
              ((previousBudgetAmount - previousSpentAmount) / previousBudgetAmount)
            : 0
      }
    };

    setMonthlyComparison(comparison);
    setLoading(false);
  };

  const getBudgetOptimizationSuggestions = () => {
    if (!budgetTrends.length) return [];

    const suggestions = [];
    const latestTrend = budgetTrends[0];

    // High spending categories
    const highSpendingCategories = latestTrend.category_breakdown
      .filter(cat => cat.variance < 0)
      .sort((a, b) => a.variance - b.variance)
      .slice(0, 3);

    if (highSpendingCategories.length > 0) {
      suggestions.push({
        type: 'warning',
        title: 'Превишаване на бюджета',
        description: `Категориите ${highSpendingCategories.map(c => c.category_name).join(', ')} превишават планирания бюджет.`,
        action: 'Помислете за увеличаване на бюджета или намаляване на разходите.'
      });
    }

    // Consistent underspending
    const underspendingCategories = latestTrend.category_breakdown
      .filter(cat => cat.variance > cat.budgeted * 0.3)
      .slice(0, 2);

    if (underspendingCategories.length > 0) {
      suggestions.push({
        type: 'info',
        title: 'Възможност за оптимизация',
        description: `Категориите ${underspendingCategories.map(c => c.category_name).join(', ')} имат значително неизползван бюджет.`,
        action: 'Може да прехвърлите част от бюджета към други категории.'
      });
    }

    // Overall trend
    if (latestTrend.variance_percentage < -10) {
      suggestions.push({
        type: 'alert',
        title: 'Общо превишаване на бюджета',
        description: `Общите разходи превишават бюджета с ${Math.abs(latestTrend.variance_percentage).toFixed(1)}%.`,
        action: 'Препоръчваме преглед и корекция на месечния бюджет.'
      });
    }

    return suggestions;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">История на бюджета</h2>
        <div className="flex space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="3months">Последни 3 месеца</option>
            <option value="6months">Последни 6 месеца</option>
            <option value="1year">Последна година</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            История на промените
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'trends'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Тенденции в разходите
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'comparison'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Месечно сравнение
          </button>
        </nav>
      </div>

      {/* Budget History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Промени в бюджета</h3>
          {budgetHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Няма история на бюджета за избрания период.</p>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Име на бюджета
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Сума
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Период
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Създаден
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Последна промяна
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {budgetHistory.map((budget) => (
                    <tr key={budget.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {budget.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {budget.total_amount.toFixed(2)} лв
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {budget.period_type === 'monthly' ? 'Месечен' :
                         budget.period_type === 'weekly' ? 'Седмичен' : 'Годишен'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(budget.created_at).toLocaleDateString('bg-BG')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(budget.updated_at).toLocaleDateString('bg-BG')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Budget Trends Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Тенденции в разходите</h3>

          {/* Optimization Suggestions */}
          {getBudgetOptimizationSuggestions().length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-3">Препоръки за оптимизация</h4>
              <div className="space-y-2">
                {getBudgetOptimizationSuggestions().map((suggestion, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      suggestion.type === 'warning' ? 'bg-yellow-400' :
                      suggestion.type === 'alert' ? 'bg-red-400' : 'bg-blue-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-blue-900">{suggestion.title}</p>
                      <p className="text-sm text-blue-700">{suggestion.description}</p>
                      <p className="text-xs text-blue-600 mt-1">{suggestion.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {budgetTrends.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Няма достатъчно данни за показване на тенденции.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {budgetTrends.map((trend, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium text-gray-900">{trend.period}</h4>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      trend.variance >= 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {trend.variance >= 0 ? '+' : ''}{trend.variance.toFixed(2)} лв
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-500">Планиран бюджет</p>
                      <p className="text-xl font-semibold text-gray-900">{trend.budget_amount.toFixed(2)} лв</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Реални разходи</p>
                      <p className="text-xl font-semibold text-gray-900">{trend.actual_spent.toFixed(2)} лв</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Ефективност</p>
                      <p className={`text-xl font-semibold ${
                        trend.variance_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {trend.variance_percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  {trend.category_breakdown.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-3">Разходи по категории</h5>
                      <div className="space-y-2">
                        {trend.category_breakdown.map((category, catIndex) => (
                          <div key={catIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-900">{category.category_name}</span>
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="text-gray-600">
                                {category.spent.toFixed(2)} / {category.budgeted.toFixed(2)} лв
                              </span>
                              <span className={`font-medium ${
                                category.variance >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {category.variance >= 0 ? '+' : ''}{category.variance.toFixed(2)} лв
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monthly Comparison Tab */}
      {activeTab === 'comparison' && monthlyComparison && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Месечно сравнение</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Month */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-blue-900 mb-4">Текущ месец</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-blue-700">Бюджет:</span>
                  <span className="font-semibold text-blue-900">
                    {monthlyComparison.current_month.budget.toFixed(2)} лв
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Изразходвано:</span>
                  <span className="font-semibold text-blue-900">
                    {monthlyComparison.current_month.spent.toFixed(2)} лв
                  </span>
                </div>
                <div className="flex justify-between border-t border-blue-200 pt-2">
                  <span className="text-blue-700">Остатък:</span>
                  <span className={`font-semibold ${
                    monthlyComparison.current_month.remaining >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {monthlyComparison.current_month.remaining.toFixed(2)} лв
                  </span>
                </div>
              </div>
            </div>

            {/* Previous Month */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Предишен месец</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Бюджет:</span>
                  <span className="font-semibold text-gray-900">
                    {monthlyComparison.previous_month.budget.toFixed(2)} лв
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Изразходвано:</span>
                  <span className="font-semibold text-gray-900">
                    {monthlyComparison.previous_month.spent.toFixed(2)} лв
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-gray-700">Остатък:</span>
                  <span className={`font-semibold ${
                    monthlyComparison.previous_month.remaining >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {monthlyComparison.previous_month.remaining.toFixed(2)} лв
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Changes */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Промени спрямо предишния месец</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Промяна в бюджета</p>
                <p className={`text-2xl font-bold ${
                  monthlyComparison.change.budget_change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {monthlyComparison.change.budget_change >= 0 ? '+' : ''}
                  {monthlyComparison.change.budget_change.toFixed(2)} лв
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Промяна в разходите</p>
                <p className={`text-2xl font-bold ${
                  monthlyComparison.change.spending_change <= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {monthlyComparison.change.spending_change >= 0 ? '+' : ''}
                  {monthlyComparison.change.spending_change.toFixed(2)} лв
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Подобрение на ефективността</p>
                <p className={`text-2xl font-bold ${
                  monthlyComparison.change.efficiency_improvement >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {monthlyComparison.change.efficiency_improvement >= 0 ? '+' : ''}
                  {(monthlyComparison.change.efficiency_improvement * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetHistory;