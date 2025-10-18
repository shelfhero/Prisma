/**
 * Budget Edit Page for Призма
 * Edit existing budgets, adjust category allocations, track changes
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { createBrowserClient } from '@/lib/supabase-simple';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Save,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  History,
  Calculator,
  Percent
} from 'lucide-react';

// Types
interface Budget {
  id: string;
  name: string;
  total_amount: number;
  period_type: string;
  start_date: string;
  end_date: string;
}

interface BudgetLine {
  id: string;
  budget_id: string;
  category_id: number;
  category_name: string;
  limit_amount: number;
}

interface CategorySpending {
  category_id: number;
  category_name: string;
  actual_amount: number;
  items_count: number;
  average_monthly: number;
  trend: 'up' | 'down' | 'stable';
}

interface BudgetSuggestion {
  category_id: number;
  category_name: string;
  suggested_amount: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export default function BudgetEditPage() {
  return (
    <ProtectedRoute>
      <BudgetEditContent />
    </ProtectedRoute>
  );
}

function BudgetEditContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const budgetId = searchParams.get('id');
  const supabase = createBrowserClient();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [suggestions, setSuggestions] = useState<BudgetSuggestion[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [originalBudget, setOriginalBudget] = useState<{ total: number; lines: BudgetLine[] }>({ total: 0, lines: [] });

  // Editable state
  const [editedTotalAmount, setEditedTotalAmount] = useState(0);
  const [editedAllocations, setEditedAllocations] = useState<Record<number, number>>({});

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('bg-BG', {
      style: 'currency',
      currency: 'BGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount).replace('BGN', 'лв');
  }, []);

  // Calculate spending trends and suggestions
  const calculateSuggestions = useCallback(async () => {
    if (!categorySpending.length) return;

    const budgetSuggestions: BudgetSuggestion[] = [];

    categorySpending.forEach(category => {
      let suggestedAmount = category.average_monthly;
      let reason = '';
      let confidence: 'high' | 'medium' | 'low' = 'medium';

      // Trend-based adjustments
      if (category.trend === 'up' && category.actual_amount > category.average_monthly) {
        suggestedAmount = category.actual_amount * 1.1; // 10% buffer
        reason = 'Разходите нарастват - препоръчваме 10% увеличение';
        confidence = 'high';
      } else if (category.trend === 'down' && category.actual_amount < category.average_monthly * 0.8) {
        suggestedAmount = category.actual_amount * 1.05; // 5% buffer
        reason = 'Разходите намаляват - може да намалите бюджета';
        confidence = 'medium';
      } else if (category.actual_amount > category.average_monthly * 1.2) {
        suggestedAmount = category.actual_amount * 1.15;
        reason = 'Месечните разходи са над средното - увеличете бюджета';
        confidence = 'high';
      } else {
        suggestedAmount = category.average_monthly * 1.05;
        reason = 'Базирано на средните разходи с малък резерв';
        confidence = 'medium';
      }

      // Seasonal adjustments (basic implementation)
      const currentMonth = new Date().getMonth();
      if (category.category_name === 'Основни храни' && [11, 0, 1].includes(currentMonth)) {
        suggestedAmount *= 1.2; // 20% more for winter months
        reason += ' (+ зимно увеличение)';
      }

      budgetSuggestions.push({
        category_id: category.category_id,
        category_name: category.category_name,
        suggested_amount: Math.round(suggestedAmount * 100) / 100,
        reason,
        confidence
      });
    });

    setSuggestions(budgetSuggestions);
  }, [categorySpending]);

  // Fetch budget data
  const fetchBudgetData = useCallback(async () => {
    if (!user?.id || !budgetId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch budget
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .eq('user_id', user.id)
        .single();

      if (budgetError) throw budgetError;

      setBudget(budgetData);
      setEditedTotalAmount(budgetData.total_amount);
      setOriginalBudget({ total: budgetData.total_amount, lines: [] });

      // Fetch budget lines
      const { data: linesData, error: linesError } = await supabase
        .from('budget_lines')
        .select(`
          *,
          categories(name)
        `)
        .eq('budget_id', budgetId);

      if (linesError) throw linesError;

      const processedLines = (linesData || []).map((line: any) => ({
        id: line.id,
        budget_id: line.budget_id,
        category_id: line.category_id,
        category_name: line.categories?.name || 'Неизвестна категория',
        limit_amount: line.limit_amount
      }));

      setBudgetLines(processedLines);
      setOriginalBudget(prev => ({ ...prev, lines: processedLines }));

      // Initialize edited allocations
      const allocations: Record<number, number> = {};
      processedLines.forEach(line => {
        allocations[line.category_id] = line.limit_amount;
      });
      setEditedAllocations(allocations);

      // Fetch historical spending data for analysis
      const currentDate = new Date();
      const threeMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);

      const { data: historicalSpending, error: spendingError } = await supabase
        .from('items')
        .select(`
          category_id,
          total_price,
          receipts!inner(purchased_at, user_id),
          categories(name)
        `)
        .eq('receipts.user_id', user.id)
        .gte('receipts.purchased_at', threeMonthsAgo.toISOString());

      if (spendingError) throw spendingError;

      // Process spending data for trends and averages
      const spendingByCategory: Record<number, { total: number; months: Set<string> }> = {};

      (historicalSpending || []).forEach(item => {
        const categoryId = item.category_id;
        const month = new Date(item.receipts.purchased_at).toISOString().slice(0, 7);

        if (!spendingByCategory[categoryId]) {
          spendingByCategory[categoryId] = { total: 0, months: new Set() };
        }

        spendingByCategory[categoryId].total += item.total_price;
        spendingByCategory[categoryId].months.add(month);
      });

      // Calculate category spending with trends
      const categorySpendingData: CategorySpending[] = Object.entries(spendingByCategory).map(([categoryId, data]) => {
        const category = historicalSpending.find(item => item.category_id == parseInt(categoryId));
        const monthCount = Math.max(data.months.size, 1);
        const averageMonthly = data.total / monthCount;

        // Simple trend calculation (would be more sophisticated with more data)
        const trend: 'up' | 'down' | 'stable' =
          averageMonthly > data.total * 0.8 ? 'up' :
          averageMonthly < data.total * 0.6 ? 'down' : 'stable';

        return {
          category_id: parseInt(categoryId),
          category_name: category?.categories?.name || 'Неизвестна',
          actual_amount: data.total,
          items_count: historicalSpending.filter(item => item.category_id == parseInt(categoryId)).length,
          average_monthly: averageMonthly,
          trend
        };
      });

      setCategorySpending(categorySpendingData);

    } catch (err) {
      console.error('Error fetching budget data:', err);
      setError(err instanceof Error ? err.message : 'Грешка при зареждане на данните');
    } finally {
      setLoading(false);
    }
  }, [user?.id, budgetId, supabase]);

  // Calculate suggestions when category spending changes
  useEffect(() => {
    if (categorySpending.length > 0) {
      calculateSuggestions();
    }
  }, [categorySpending, calculateSuggestions]);

  // Load data on mount
  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  // Handle allocation change
  const handleAllocationChange = (categoryId: number, amount: number) => {
    setEditedAllocations(prev => ({
      ...prev,
      [categoryId]: Math.max(0, amount)
    }));
  };

  // Auto-distribute remaining budget
  const autoDistributeRemaining = () => {
    const currentTotal = Object.values(editedAllocations).reduce((sum, amount) => sum + amount, 0);
    const remaining = editedTotalAmount - currentTotal;

    if (remaining <= 0) return;

    const categoriesCount = budgetLines.length;
    const perCategory = remaining / categoriesCount;

    const newAllocations = { ...editedAllocations };
    budgetLines.forEach(line => {
      newAllocations[line.category_id] += perCategory;
    });

    setEditedAllocations(newAllocations);
  };

  // Apply suggestions
  const applySuggestion = (categoryId: number, suggestedAmount: number) => {
    handleAllocationChange(categoryId, suggestedAmount);
  };

  // Apply all suggestions
  const applyAllSuggestions = () => {
    const newAllocations = { ...editedAllocations };
    let newTotal = 0;

    suggestions.forEach(suggestion => {
      newAllocations[suggestion.category_id] = suggestion.suggested_amount;
      newTotal += suggestion.suggested_amount;
    });

    setEditedAllocations(newAllocations);
    setEditedTotalAmount(Math.round(newTotal * 100) / 100);
  };

  // Save changes
  const saveChanges = async () => {
    if (!budget || !user?.id) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Update budget total amount
      const { error: budgetError } = await supabase
        .from('budgets')
        .update({
          total_amount: editedTotalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', budget.id)
        .eq('user_id', user.id);

      if (budgetError) throw budgetError;

      // Update budget lines
      for (const line of budgetLines) {
        const newAmount = editedAllocations[line.category_id] || 0;

        const { error: lineError } = await supabase
          .from('budget_lines')
          .update({
            limit_amount: newAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', line.id);

        if (lineError) throw lineError;
      }

      // Show success message
      setSuccessMessage('Бюджетът беше успешно запазен!');

      // Redirect back to budget page after showing success message
      setTimeout(() => {
        router.push('/budget');
      }, 1500);

    } catch (err) {
      console.error('Error saving budget:', err);
      setError(err instanceof Error ? err.message : 'Грешка при запазване на промените');
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const currentTotal = Object.values(editedAllocations).reduce((sum, amount) => sum + amount, 0);
  const remaining = editedTotalAmount - currentTotal;
  const hasChanges = editedTotalAmount !== originalBudget.total ||
    budgetLines.some(line => editedAllocations[line.category_id] !== line.limit_amount);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Зареждане...</p>
        </div>
      </div>
    );
  }

  if (error && !budget) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Грешка при зареждане</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/budget')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад към бюджет
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/budget')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Редактиране на бюджет
              </h1>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowComparison(!showComparison)}
              >
                <History className="w-4 h-4 mr-2" />
                {showComparison ? 'Скрий' : 'Покажи'} сравнение
              </Button>
              <Button
                onClick={saveChanges}
                disabled={!hasChanges || saving}
                loading={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                Запази промени
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Edit Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Budget Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Общ бюджет</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Обща сума
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={editedTotalAmount}
                      onChange={(e) => setEditedTotalAmount(parseFloat(e.target.value) || 0)}
                      className="block w-full pl-3 pr-16 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      step="0.01"
                      min="0"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">лв</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-blue-600 font-medium">Разпределени</p>
                    <p className="text-lg font-bold text-blue-900">{formatCurrency(currentTotal)}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${remaining >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className={`font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {remaining >= 0 ? 'Остават' : 'Превишение'}
                    </p>
                    <p className={`text-lg font-bold ${remaining >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                      {formatCurrency(Math.abs(remaining))}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-600 font-medium">Общо</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(editedTotalAmount)}</p>
                  </div>
                </div>

                {remaining > 0 && (
                  <Button
                    variant="outline"
                    onClick={autoDistributeRemaining}
                    className="w-full"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Разпредели останалите {formatCurrency(remaining)}
                  </Button>
                )}
              </div>
            </div>

            {/* Category Allocations */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Разпределение по категории</h2>
                {suggestions.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={applyAllSuggestions}
                    size="sm"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Приложи всички предложения
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {budgetLines.map((line) => {
                  const currentAmount = editedAllocations[line.category_id] || 0;
                  const originalAmount = line.limit_amount;
                  const suggestion = suggestions.find(s => s.category_id === line.category_id);
                  const spending = categorySpending.find(s => s.category_id === line.category_id);
                  const hasChanged = currentAmount !== originalAmount;

                  return (
                    <div key={line.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">{line.category_name}</h3>
                          {spending && (
                            <div className="flex items-center space-x-1">
                              {spending.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
                              {spending.trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
                            </div>
                          )}
                          {hasChanged && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Променено
                            </span>
                          )}
                        </div>
                        {suggestion && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => applySuggestion(line.category_id, suggestion.suggested_amount)}
                          >
                            <Lightbulb className="w-4 h-4 mr-1" />
                            Предложение: {formatCurrency(suggestion.suggested_amount)}
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="number"
                            value={currentAmount}
                            onChange={(e) => handleAllocationChange(line.category_id, parseFloat(e.target.value) || 0)}
                            className="block w-full pl-3 pr-16 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            step="0.01"
                            min="0"
                          />
                          <span className="absolute right-3 top-2 text-gray-500">лв</span>
                        </div>

                        {spending && (
                          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                            <div>Средно месечно: {formatCurrency(spending.average_monthly)}</div>
                            <div>Текущо: {formatCurrency(spending.actual_amount)}</div>
                          </div>
                        )}

                        {suggestion && (
                          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                            💡 {suggestion.reason}
                          </div>
                        )}

                        {showComparison && originalAmount !== currentAmount && (
                          <div className="text-xs bg-yellow-50 p-2 rounded">
                            <span className="text-yellow-700">
                              Оригинално: {formatCurrency(originalAmount)} →
                              Ново: {formatCurrency(currentAmount)}
                              ({currentAmount > originalAmount ? '+' : ''}{formatCurrency(currentAmount - originalAmount)})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar - Insights and Suggestions */}
          <div className="space-y-6">
            {/* Smart Insights */}
            {suggestions.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                  Умни препоръки
                </h3>
                <div className="space-y-3">
                  {suggestions.map((suggestion) => (
                    <div key={suggestion.category_id} className="border-l-4 border-yellow-400 bg-yellow-50 p-3 rounded-r">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-yellow-800">
                          {suggestion.category_name}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          suggestion.confidence === 'high' ? 'bg-green-100 text-green-700' :
                          suggestion.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {suggestion.confidence === 'high' ? 'Високо' :
                           suggestion.confidence === 'medium' ? 'Средно' : 'Ниско'} доверие
                        </span>
                      </div>
                      <p className="text-xs text-yellow-700 mb-2">{suggestion.reason}</p>
                      <div className="text-sm font-medium text-yellow-900">
                        Препоръчано: {formatCurrency(suggestion.suggested_amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spending Analysis */}
            {categorySpending.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Анализ на разходите</h3>
                <div className="space-y-3">
                  {categorySpending.map((category) => (
                    <div key={category.category_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">{category.category_name}</span>
                        {category.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
                        {category.trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(category.average_monthly)}
                        </div>
                        <div className="text-xs text-gray-500">средно/месец</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Бързи действия</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset to original values
                    setEditedTotalAmount(originalBudget.total);
                    const resetAllocations: Record<number, number> = {};
                    originalBudget.lines.forEach(line => {
                      resetAllocations[line.category_id] = line.limit_amount;
                    });
                    setEditedAllocations(resetAllocations);
                  }}
                  className="w-full"
                  size="sm"
                >
                  Възстанови оригинала
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    const totalSpending = categorySpending.reduce((sum, cat) => sum + cat.average_monthly, 0);
                    setEditedTotalAmount(Math.round(totalSpending * 1.1 * 100) / 100); // 10% buffer
                  }}
                  className="w-full"
                  size="sm"
                >
                  Базирай на средните разходи
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    // Increase all by 10%
                    const newAllocations: Record<number, number> = {};
                    budgetLines.forEach(line => {
                      newAllocations[line.category_id] = Math.round((editedAllocations[line.category_id] || 0) * 1.1 * 100) / 100;
                    });
                    setEditedAllocations(newAllocations);
                    setEditedTotalAmount(Math.round(editedTotalAmount * 1.1 * 100) / 100);
                  }}
                  className="w-full"
                  size="sm"
                >
                  Увеличи всички с 10%
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}