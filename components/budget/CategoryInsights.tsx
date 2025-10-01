'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createBrowserClient } from '@/lib/supabase-simple';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Lightbulb,
  Star,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  PieChart,
  DollarSign
} from 'lucide-react';

interface CategoryInsight {
  category_id: string;
  category_name: string;
  category_icon: string;

  // Spending Analytics
  current_month_spending: number;
  previous_month_spending: number;
  average_monthly_spending: number;
  trend_percentage: number;
  trend_direction: 'up' | 'down' | 'stable';

  // Budget Performance
  budget_allocated: number;
  budget_used_percentage: number;
  efficiency_score: number; // 0-100 scale

  // Behavioral Insights
  spending_frequency: number; // purchases per month
  average_transaction_size: number;
  peak_spending_day: string;

  // Optimization Suggestions
  optimization_score: number; // 0-100 scale
  savings_potential: number;
  recommendations: string[];

  // Comparison Metrics
  vs_similar_users?: number; // compared to users with similar spending patterns
  seasonal_factor?: number; // seasonal adjustment factor
}

interface OptimizationSuggestion {
  category: string;
  type: 'reduce_frequency' | 'reduce_amount' | 'timing_optimization' | 'substitute_products' | 'bulk_buying';
  title: string;
  description: string;
  potential_savings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  implementation_tips: string[];
  confidence: number;
}

const CategoryInsights = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<CategoryInsight[]>([]);
  const [optimizations, setOptimizations] = useState<OptimizationSuggestion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'3months' | '6months' | '1year'>('6months');

  const supabase = createBrowserClient();

  useEffect(() => {
    if (user?.id) {
      generateCategoryInsights();
    }
  }, [user?.id, timeRange]);

  const generateCategoryInsights = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get time range
      const monthsBack = timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : 12;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);

      const currentMonth = new Date();
      const currentStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const currentEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const previousStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
      const previousEnd = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);

      // Fetch current budget for context
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*, budget_lines(*, categories(name, icon))')
        .eq('user_id', user.id)
        .gte('start_date', currentStart.toISOString())
        .lte('end_date', currentEnd.toISOString())
        .single();

      // Fetch historical spending data
      const { data: spendingData } = await supabase
        .from('items')
        .select(`
          total_price,
          qty,
          category_id,
          receipts!inner(purchased_at, user_id),
          categories(name, icon)
        `)
        .eq('receipts.user_id', user.id)
        .gte('receipts.purchased_at', startDate.toISOString());

      if (!spendingData) return;

      // Process insights for each category
      const categoryInsights = await Promise.all(
        (budgetData?.budget_lines || []).map(async (budgetLine: any) => {
          const categoryId = budgetLine.category_id;
          const categoryName = budgetLine.categories?.name || 'Unknown';
          const categoryIcon = budgetLine.categories?.icon || '📦';

          // Filter spending for this category
          const categorySpending = spendingData.filter(item => item.category_id === categoryId);

          // Current month spending
          const currentMonthSpending = categorySpending
            .filter(item => {
              const date = new Date(item.receipts.purchased_at);
              return date >= currentStart && date <= currentEnd;
            })
            .reduce((sum, item) => sum + item.total_price, 0);

          // Previous month spending
          const previousMonthSpending = categorySpending
            .filter(item => {
              const date = new Date(item.receipts.purchased_at);
              return date >= previousStart && date <= previousEnd;
            })
            .reduce((sum, item) => sum + item.total_price, 0);

          // Calculate averages and trends
          const monthlySpending = calculateMonthlyAverages(categorySpending, monthsBack);
          const averageMonthlySpending = monthlySpending.reduce((a, b) => a + b, 0) / monthlySpending.length || 0;

          const trendPercentage = previousMonthSpending > 0
            ? ((currentMonthSpending - previousMonthSpending) / previousMonthSpending) * 100
            : 0;

          const trendDirection = Math.abs(trendPercentage) < 5 ? 'stable' :
                               trendPercentage > 0 ? 'up' : 'down';

          // Budget performance
          const budgetUsedPercentage = budgetLine.limit_amount > 0
            ? (currentMonthSpending / budgetLine.limit_amount) * 100
            : 0;

          // Behavioral insights
          const currentMonthTransactions = categorySpending.filter(item => {
            const date = new Date(item.receipts.purchased_at);
            return date >= currentStart && date <= currentEnd;
          });

          const spendingFrequency = currentMonthTransactions.length;
          const averageTransactionSize = spendingFrequency > 0
            ? currentMonthSpending / spendingFrequency
            : 0;

          // Peak spending analysis
          const peakSpendingDay = calculatePeakSpendingDay(currentMonthTransactions);

          // Calculate efficiency and optimization scores
          const efficiencyScore = calculateEfficiencyScore(
            budgetUsedPercentage,
            trendDirection,
            averageMonthlySpending,
            currentMonthSpending
          );

          const optimizationScore = calculateOptimizationScore(
            categorySpending,
            budgetLine.limit_amount,
            currentMonthSpending
          );

          const savingsPotential = calculateSavingsPotential(
            currentMonthSpending,
            averageMonthlySpending,
            budgetLine.limit_amount
          );

          const recommendations = generateCategoryRecommendations(
            categoryName,
            trendDirection,
            budgetUsedPercentage,
            spendingFrequency,
            averageTransactionSize
          );

          return {
            category_id: categoryId,
            category_name: categoryName,
            category_icon: categoryIcon,
            current_month_spending: currentMonthSpending,
            previous_month_spending: previousMonthSpending,
            average_monthly_spending: averageMonthlySpending,
            trend_percentage: trendPercentage,
            trend_direction: trendDirection,
            budget_allocated: budgetLine.limit_amount,
            budget_used_percentage: budgetUsedPercentage,
            efficiency_score: efficiencyScore,
            spending_frequency: spendingFrequency,
            average_transaction_size: averageTransactionSize,
            peak_spending_day: peakSpendingDay,
            optimization_score: optimizationScore,
            savings_potential: savingsPotential,
            recommendations: recommendations
          } as CategoryInsight;
        })
      );

      // Generate optimization suggestions
      const optimizationSuggestions = generateOptimizationSuggestions(categoryInsights);

      setInsights(categoryInsights);
      setOptimizations(optimizationSuggestions);
    } catch (error) {
      console.error('Error generating category insights:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, timeRange, supabase]);

  // Helper functions
  const calculateMonthlyAverages = (spendingData: any[], monthsBack: number) => {
    const monthlyTotals: number[] = [];

    for (let i = 0; i < monthsBack; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthTotal = spendingData
        .filter(item => {
          const itemDate = new Date(item.receipts.purchased_at);
          return itemDate >= monthStart && itemDate <= monthEnd;
        })
        .reduce((sum, item) => sum + item.total_price, 0);

      monthlyTotals.push(monthTotal);
    }

    return monthlyTotals;
  };

  const calculatePeakSpendingDay = (transactions: any[]) => {
    const dayTotals = new Map<string, number>();

    transactions.forEach(transaction => {
      const day = new Date(transaction.receipts.purchased_at).toLocaleDateString('bg-BG', { weekday: 'long' });
      dayTotals.set(day, (dayTotals.get(day) || 0) + transaction.total_price);
    });

    let peakDay = 'Неизвестен';
    let maxAmount = 0;

    dayTotals.forEach((amount, day) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        peakDay = day;
      }
    });

    return peakDay;
  };

  const calculateEfficiencyScore = (
    budgetUsedPercentage: number,
    trendDirection: string,
    averageSpending: number,
    currentSpending: number
  ) => {
    let score = 50; // Base score

    // Budget adherence (40% of score)
    if (budgetUsedPercentage <= 80) score += 40;
    else if (budgetUsedPercentage <= 100) score += 20;
    else score -= 20;

    // Trend stability (30% of score)
    if (trendDirection === 'stable') score += 30;
    else if (trendDirection === 'down') score += 15;
    else score -= 15;

    // Consistency (30% of score)
    const variance = averageSpending > 0 ? Math.abs(currentSpending - averageSpending) / averageSpending : 0;
    if (variance <= 0.2) score += 30;
    else if (variance <= 0.5) score += 15;
    else score -= 15;

    return Math.max(0, Math.min(100, score));
  };

  const calculateOptimizationScore = (spendingData: any[], budgetAmount: number, currentSpending: number) => {
    let score = 0;

    // Frequency optimization potential
    const transactions = spendingData.length;
    if (transactions > 20) score += 25; // High frequency = high optimization potential
    else if (transactions > 10) score += 15;
    else score += 5;

    // Amount optimization potential
    if (currentSpending > budgetAmount * 1.2) score += 35; // High overspending
    else if (currentSpending > budgetAmount) score += 20;
    else score += 10;

    // Variance-based optimization
    const amounts = spendingData.map(item => item.total_price);
    const variance = calculateVariance(amounts);
    if (variance > 100) score += 25; // High variance = optimization potential
    else if (variance > 50) score += 15;
    else score += 10;

    // Seasonal optimization
    score += 15; // Always some seasonal optimization potential

    return Math.min(100, score);
  };

  const calculateVariance = (numbers: number[]) => {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((acc, num) => acc + Math.pow(num - mean, 2), 0) / numbers.length;
    return variance;
  };

  const calculateSavingsPotential = (current: number, average: number, budget: number) => {
    if (current <= budget) return Math.max(0, current - average) * 0.1;
    return (current - budget) * 0.7; // Higher savings potential for overspending
  };

  const generateCategoryRecommendations = (
    categoryName: string,
    trend: string,
    budgetUsage: number,
    frequency: number,
    avgTransaction: number
  ) => {
    const recommendations: string[] = [];

    if (budgetUsage > 100) {
      recommendations.push(`Намалете разходите в "${categoryName}" с ${(budgetUsage - 100).toFixed(1)}%`);
    }

    if (trend === 'up') {
      recommendations.push(`Следете растящите разходи в "${categoryName}"`);
    }

    if (frequency > 15) {
      recommendations.push(`Планирайте покупките в "${categoryName}" - твърде чести транзакции`);
    }

    if (avgTransaction > 50) {
      recommendations.push(`Търсете по-изгодни алтернативи за "${categoryName}"`);
    }

    // Category-specific recommendations
    if (categoryName.includes('храни')) {
      recommendations.push('Планирайте меню седмично за икономия');
      recommendations.push('Сравнявайте цени между магазини');
    }

    if (categoryName.includes('напитки')) {
      recommendations.push('Ограничете покупките на скъпи напитки');
    }

    return recommendations.slice(0, 3); // Limit to top 3 recommendations
  };

  const generateOptimizationSuggestions = (insights: CategoryInsight[]) => {
    const suggestions: OptimizationSuggestion[] = [];

    insights.forEach(insight => {
      if (insight.optimization_score > 60) {
        // High-frequency shopping optimization
        if (insight.spending_frequency > 15) {
          suggestions.push({
            category: insight.category_name,
            type: 'reduce_frequency',
            title: `Намалете честотата на пазаруване за ${insight.category_name}`,
            description: `Правите ${insight.spending_frequency} покупки месечно. Консолидирането им може да спести време и пари.`,
            potential_savings: insight.savings_potential * 0.3,
            difficulty: 'easy',
            implementation_tips: [
              'Планирайте седмично меню',
              'Направете списък преди пазаруване',
              'Пазарувайте веднъж седмично вместо всеки ден'
            ],
            confidence: 85
          });
        }

        // Large transaction optimization
        if (insight.average_transaction_size > 100) {
          suggestions.push({
            category: insight.category_name,
            type: 'reduce_amount',
            title: `Оптимизирайте размера на покупките за ${insight.category_name}`,
            description: `Средната ви покупка е ${insight.average_transaction_size.toFixed(2)} лв. Има място за оптимизация.`,
            potential_savings: insight.savings_potential * 0.4,
            difficulty: 'medium',
            implementation_tips: [
              'Сравнявайте цени преди големи покупки',
              'Търсете промоции и отстъпки',
              'Помислете за алтернативни марки'
            ],
            confidence: 75
          });
        }

        // Budget overspending optimization
        if (insight.budget_used_percentage > 120) {
          suggestions.push({
            category: insight.category_name,
            type: 'substitute_products',
            title: `Заместете продукти в ${insight.category_name}`,
            description: `Превишавате бюджета с ${(insight.budget_used_percentage - 100).toFixed(1)}%. Заместването на продукти може да помогне.`,
            potential_savings: insight.savings_potential * 0.6,
            difficulty: 'medium',
            implementation_tips: [
              'Изберете частни марки вместо брандове',
              'Купувайте сезонни продукти',
              'Търсете еквиваленти с по-добро съотношение цена-качество'
            ],
            confidence: 80
          });
        }
      }
    });

    return suggestions.slice(0, 5); // Limit to top 5 suggestions
  };

  const getTrendIcon = (direction: string, percentage: number) => {
    if (direction === 'up') return <ArrowUpRight className="w-5 h-5 text-red-500" />;
    if (direction === 'down') return <ArrowDownRight className="w-5 h-5 text-green-500" />;
    return <Minus className="w-5 h-5 text-gray-500" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDifficultyBadge = (difficulty: string) => {
    const colors = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800'
    };

    const labels = {
      easy: 'Лесно',
      medium: 'Средно',
      hard: 'Трудно'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[difficulty as keyof typeof colors]}`}>
        {labels[difficulty as keyof typeof labels]}
      </span>
    );
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
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Анализ по категории</h2>
        </div>
        <div className="flex space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="3months">Последни 3 месеца</option>
            <option value="6months">Последни 6 месеца</option>
            <option value="1year">Последна година</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Общ резултат</p>
              <p className="text-2xl font-bold text-gray-900">
                {insights.length > 0 ? Math.round(insights.reduce((sum, i) => sum + i.efficiency_score, 0) / insights.length) : 0}
              </p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Потенциал за спестяване</p>
              <p className="text-2xl font-bold text-gray-900">
                {insights.reduce((sum, i) => sum + i.savings_potential, 0).toFixed(0)} лв
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Активни препоръки</p>
              <p className="text-2xl font-bold text-gray-900">{optimizations.length}</p>
            </div>
            <Lightbulb className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Category Insights */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Анализ по категории</h3>

        {insights.length === 0 ? (
          <div className="text-center py-12">
            <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Няма данни за анализ</h4>
            <p className="text-gray-500">Необходими са повече данни за генериране на анализ по категории.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {insights.map((insight) => (
              <div key={insight.category_id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{insight.category_icon}</span>
                    <h4 className="text-xl font-semibold text-gray-900">{insight.category_name}</h4>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${getScoreColor(insight.efficiency_score)}`}>
                        {insight.efficiency_score}
                      </div>
                      <div className="text-xs text-gray-600">Ефективност</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${getScoreColor(insight.optimization_score)}`}>
                        {insight.optimization_score}
                      </div>
                      <div className="text-xs text-gray-600">Оптимизация</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  {/* Current Month */}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Текущ месец</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {insight.current_month_spending.toFixed(2)} лв
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      {getTrendIcon(insight.trend_direction, insight.trend_percentage)}
                      <span className={`text-sm ${
                        insight.trend_direction === 'up' ? 'text-red-600' :
                        insight.trend_direction === 'down' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {Math.abs(insight.trend_percentage).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Budget Usage */}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Използване на бюджета</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {insight.budget_used_percentage.toFixed(1)}%
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full ${
                          insight.budget_used_percentage > 100 ? 'bg-red-500' :
                          insight.budget_used_percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(insight.budget_used_percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Frequency */}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Честота</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {insight.spending_frequency} пъти
                    </p>
                    <p className="text-sm text-gray-600">
                      {insight.peak_spending_day}
                    </p>
                  </div>

                  {/* Average Transaction */}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Средна покупка</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {insight.average_transaction_size.toFixed(2)} лв
                    </p>
                    {insight.savings_potential > 0 && (
                      <p className="text-sm text-green-600">
                        Спестяване: {insight.savings_potential.toFixed(2)} лв
                      </p>
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                {insight.recommendations.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-blue-900 mb-2">Препоръки</h5>
                    <ul className="space-y-1">
                      {insight.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-blue-800 flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Optimization Suggestions */}
      {optimizations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Препоръки за оптимизация</h3>

          <div className="grid gap-4">
            {optimizations.map((suggestion, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{suggestion.title}</h4>
                      {getDifficultyBadge(suggestion.difficulty)}
                    </div>
                    <p className="text-gray-700 mb-3">{suggestion.description}</p>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                      <span>Спестяване: {suggestion.potential_savings.toFixed(2)} лв/месец</span>
                      <span>Увереност: {suggestion.confidence}%</span>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Как да внедрите:</h5>
                      <ul className="space-y-1">
                        {suggestion.implementation_tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="text-sm text-gray-700 flex items-start space-x-2">
                            <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryInsights;