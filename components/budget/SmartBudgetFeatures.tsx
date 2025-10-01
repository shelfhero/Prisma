'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createBrowserClient } from '@/lib/supabase-simple';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Snowflake,
  Sun,
  Leaf,
  Cloud,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Zap,
  Shield,
  BarChart3
} from 'lucide-react';
import CategoryInsights from './CategoryInsights';

interface SmartSuggestion {
  id: string;
  type: 'budget_increase' | 'budget_decrease' | 'category_reallocation' | 'seasonal_adjustment' | 'spending_alert';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  savings_potential?: number;
  category_affected?: string;
  action_button?: string;
  timestamp: string;
}

interface BudgetAlert {
  id: string;
  type: 'overspend' | 'underspend' | 'trend_change' | 'seasonal_reminder';
  severity: 'critical' | 'warning' | 'info';
  category?: string;
  title: string;
  message: string;
  percentage?: number;
  amount?: number;
  created_at: string;
  dismissed: boolean;
}

interface SeasonalInsight {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  category: string;
  predicted_increase: number;
  historical_pattern: number[];
  confidence: number;
  recommendation: string;
}

const SmartBudgetFeatures = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [seasonalInsights, setSeasonalInsights] = useState<SeasonalInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'alerts' | 'seasonal' | 'insights'>('suggestions');

  const supabase = createBrowserClient();

  useEffect(() => {
    if (user?.id) {
      generateSmartSuggestions();
      generateBudgetAlerts();
      generateSeasonalInsights();
    }
  }, [user?.id]);

  const generateSmartSuggestions = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get current month data
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      // Get last 3 months for trend analysis
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Fetch current budget
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*, budget_lines(*)')
        .eq('user_id', user.id)
        .gte('start_date', startOfMonth.toISOString())
        .lte('end_date', endOfMonth.toISOString())
        .single();

      // Fetch spending data for trend analysis
      const { data: spendingData } = await supabase
        .from('items')
        .select('total_price, category_id, receipts!inner(purchased_at)')
        .eq('receipts.user_id', user.id)
        .gte('receipts.purchased_at', threeMonthsAgo.toISOString());

      if (!budgetData || !spendingData) return;

      const smartSuggestions: SmartSuggestion[] = [];

      // Analyze spending trends and generate suggestions
      const spendingByMonth = organizeSpendingByMonth(spendingData);
      const currentMonthSpending = getCurrentMonthSpending(spendingData);

      // 1. Auto-suggest budget adjustments based on spending patterns
      const budgetAdjustmentSuggestions = analyzeBudgetAdjustments(
        budgetData,
        spendingByMonth,
        currentMonthSpending
      );
      smartSuggestions.push(...budgetAdjustmentSuggestions);

      // 2. Category reallocation suggestions
      const reallocationSuggestions = suggestCategoryReallocations(
        budgetData.budget_lines,
        currentMonthSpending
      );
      smartSuggestions.push(...reallocationSuggestions);

      // 3. Spending pattern alerts
      const spendingAlerts = generateSpendingPatternAlerts(spendingByMonth);
      smartSuggestions.push(...spendingAlerts);

      setSuggestions(smartSuggestions);
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
    }
  }, [user?.id, supabase]);

  const generateBudgetAlerts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      // Fetch current spending and budget
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*, budget_lines(*, categories(name))')
        .eq('user_id', user.id)
        .gte('start_date', startOfMonth.toISOString())
        .lte('end_date', endOfMonth.toISOString())
        .single();

      const { data: spendingData } = await supabase
        .from('items')
        .select('total_price, category_id, receipts!inner(purchased_at)')
        .eq('receipts.user_id', user.id)
        .gte('receipts.purchased_at', startOfMonth.toISOString())
        .lte('receipts.purchased_at', endOfMonth.toISOString());

      if (!budgetData || !spendingData) return;

      const budgetAlerts: BudgetAlert[] = [];
      const spendingByCategory = organizeSpendingByCategory(spendingData);

      // Check each budget line for overspending
      budgetData.budget_lines.forEach((line: any) => {
        const categorySpending = spendingByCategory.get(line.category_id) || 0;
        const percentage = (categorySpending / line.limit_amount) * 100;

        if (percentage > 100) {
          budgetAlerts.push({
            id: `overspend-${line.category_id}`,
            type: 'overspend',
            severity: 'critical',
            category: line.categories?.name,
            title: 'Превишение на бюджета',
            message: `Категория "${line.categories?.name}" е превишила бюджета с ${(percentage - 100).toFixed(1)}%`,
            percentage,
            amount: categorySpending - line.limit_amount,
            created_at: new Date().toISOString(),
            dismissed: false
          });
        } else if (percentage > 80) {
          budgetAlerts.push({
            id: `warning-${line.category_id}`,
            type: 'overspend',
            severity: 'warning',
            category: line.categories?.name,
            title: 'Приближаване към лимита',
            message: `Категория "${line.categories?.name}" е използвала ${percentage.toFixed(1)}% от бюджета`,
            percentage,
            amount: categorySpending,
            created_at: new Date().toISOString(),
            dismissed: false
          });
        }

        // Check for significant underspending
        if (percentage < 30 && currentMonth.getDate() > 20) {
          budgetAlerts.push({
            id: `underspend-${line.category_id}`,
            type: 'underspend',
            severity: 'info',
            category: line.categories?.name,
            title: 'Нисък разход',
            message: `Категория "${line.categories?.name}" използва само ${percentage.toFixed(1)}% от бюджета`,
            percentage,
            amount: categorySpending,
            created_at: new Date().toISOString(),
            dismissed: false
          });
        }
      });

      setAlerts(budgetAlerts);
    } catch (error) {
      console.error('Error generating budget alerts:', error);
    }
  }, [user?.id, supabase]);

  const generateSeasonalInsights = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get historical data for seasonal analysis (last 2 years)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const { data: historicalData } = await supabase
        .from('items')
        .select('total_price, category_id, receipts!inner(purchased_at)')
        .eq('receipts.user_id', user.id)
        .gte('receipts.purchased_at', twoYearsAgo.toISOString());

      if (!historicalData || historicalData.length === 0) return;

      const currentSeason = getCurrentSeason();
      const seasonalInsights = analyzeSeasonalPatterns(historicalData, currentSeason);

      setSeasonalInsights(seasonalInsights);
    } catch (error) {
      console.error('Error generating seasonal insights:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  // Helper functions
  const organizeSpendingByMonth = (spendingData: any[]) => {
    const byMonth = new Map<string, number>();
    spendingData.forEach(item => {
      const date = new Date(item.receipts.purchased_at);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      byMonth.set(monthKey, (byMonth.get(monthKey) || 0) + item.total_price);
    });
    return byMonth;
  };

  const getCurrentMonthSpending = (spendingData: any[]) => {
    const currentMonth = new Date();
    const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
    return spendingData
      .filter(item => {
        const date = new Date(item.receipts.purchased_at);
        return `${date.getFullYear()}-${date.getMonth()}` === monthKey;
      })
      .reduce((sum, item) => sum + item.total_price, 0);
  };

  const organizeSpendingByCategory = (spendingData: any[]) => {
    const byCategory = new Map<string, number>();
    spendingData.forEach(item => {
      byCategory.set(item.category_id, (byCategory.get(item.category_id) || 0) + item.total_price);
    });
    return byCategory;
  };

  const analyzeBudgetAdjustments = (budgetData: any, spendingByMonth: Map<string, number>, currentSpending: number) => {
    const suggestions: SmartSuggestion[] = [];
    const monthlyAverages = Array.from(spendingByMonth.values());
    const avgMonthlySpending = monthlyAverages.reduce((a, b) => a + b, 0) / monthlyAverages.length;

    if (currentSpending > budgetData.total_amount * 1.2) {
      suggestions.push({
        id: 'increase-budget',
        type: 'budget_increase',
        priority: 'high',
        title: 'Препоръка за увеличаване на бюджета',
        description: `Текущите разходи (${currentSpending.toFixed(2)} лв) значително превишават планирания бюджет.`,
        recommendation: `Препоръчваме увеличаване на месечния бюджет до ${Math.ceil(avgMonthlySpending * 1.1)} лв.`,
        confidence: 85,
        action_button: 'Увеличи бюджета',
        timestamp: new Date().toISOString()
      });
    } else if (avgMonthlySpending < budgetData.total_amount * 0.7) {
      suggestions.push({
        id: 'decrease-budget',
        type: 'budget_decrease',
        priority: 'medium',
        title: 'Възможност за намаляване на бюджета',
        description: `Средните месечни разходи са значително под планирания бюджет.`,
        recommendation: `Може да намалите бюджета до ${Math.ceil(avgMonthlySpending * 1.2)} лв и да пренасочите средствата.`,
        confidence: 75,
        savings_potential: budgetData.total_amount - (avgMonthlySpending * 1.2),
        action_button: 'Оптимизирай бюджета',
        timestamp: new Date().toISOString()
      });
    }

    return suggestions;
  };

  const suggestCategoryReallocations = (budgetLines: any[], currentSpending: number) => {
    const suggestions: SmartSuggestion[] = [];

    // This would analyze spending patterns and suggest reallocations
    // For now, implementing a basic version

    return suggestions;
  };

  const generateSpendingPatternAlerts = (spendingByMonth: Map<string, number>) => {
    const suggestions: SmartSuggestion[] = [];
    const spendingValues = Array.from(spendingByMonth.values());

    if (spendingValues.length >= 2) {
      const lastMonth = spendingValues[spendingValues.length - 1];
      const previousMonth = spendingValues[spendingValues.length - 2];
      const increase = ((lastMonth - previousMonth) / previousMonth) * 100;

      if (increase > 20) {
        suggestions.push({
          id: 'spending-spike',
          type: 'spending_alert',
          priority: 'high',
          title: 'Рязко увеличение на разходите',
          description: `Разходите са нараснали с ${increase.toFixed(1)}% спрямо предишния месец.`,
          recommendation: 'Прегледайте последните покупки и потърсете възможности за оптимизация.',
          confidence: 90,
          action_button: 'Прегледай разходите',
          timestamp: new Date().toISOString()
        });
      }
    }

    return suggestions;
  };

  const getCurrentSeason = () => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  };

  const analyzeSeasonalPatterns = (historicalData: any[], currentSeason: string) => {
    const insights: SeasonalInsight[] = [];

    // Basic seasonal analysis - in a real app this would be more sophisticated
    const seasonalCategories = [
      { category: 'Напитки', season: 'summer', expected_increase: 25 },
      { category: 'Основни храни', season: 'winter', expected_increase: 15 },
      { category: 'Закуски', season: 'winter', expected_increase: 20 }
    ];

    seasonalCategories.forEach(pattern => {
      if (pattern.season === currentSeason) {
        insights.push({
          season: pattern.season as any,
          category: pattern.category,
          predicted_increase: pattern.expected_increase,
          historical_pattern: [100, 110, 125, 120], // Mock historical data
          confidence: 75,
          recommendation: `Очаква се увеличение от ${pattern.expected_increase}% в категория "${pattern.category}" през ${pattern.season}.`
        });
      }
    });

    return insights;
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));
  };

  const getSeasonIcon = (season: string) => {
    switch (season) {
      case 'spring': return <Leaf className="w-5 h-5 text-green-500" />;
      case 'summer': return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'autumn': return <Cloud className="w-5 h-5 text-orange-500" />;
      case 'winter': return <Snowflake className="w-5 h-5 text-blue-500" />;
      default: return <Calendar className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info': return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
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
      <div className="flex items-center space-x-3">
        <Brain className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Интелигентни функции</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'suggestions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Препоръки
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'alerts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Предупреждения
            {alerts.filter(a => !a.dismissed).length > 0 && (
              <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {alerts.filter(a => !a.dismissed).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('seasonal')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'seasonal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Сезонни анализи
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'insights'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Анализ по категории
          </button>
        </nav>
      </div>

      {/* Suggestions Tab */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Няма нови препоръки</h3>
              <p className="text-gray-500">Системата анализира вашите разходи и ще ви предложи оптимизации.</p>
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <div key={suggestion.id} className={`border rounded-lg p-6 ${getPriorityColor(suggestion.priority)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{suggestion.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                        suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {suggestion.priority === 'high' ? 'Висок' :
                         suggestion.priority === 'medium' ? 'Среден' : 'Нисък'} приоритет
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{suggestion.description}</p>
                    <p className="text-gray-800 font-medium mb-3">{suggestion.recommendation}</p>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Увереност: {suggestion.confidence}%</span>
                      {suggestion.savings_potential && (
                        <span>Потенциал за спестяване: {suggestion.savings_potential.toFixed(2)} лв</span>
                      )}
                    </div>
                  </div>

                  {suggestion.action_button && (
                    <button className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                      {suggestion.action_button}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.filter(a => !a.dismissed).length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Няма активни предупреждения</h3>
              <p className="text-gray-500">Всички бюджети са в норма.</p>
            </div>
          ) : (
            alerts.filter(a => !a.dismissed).map((alert) => (
              <div key={alert.id} className={`border rounded-lg p-6 ${
                alert.severity === 'critical' ? 'border-red-200 bg-red-50' :
                alert.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                'border-blue-200 bg-blue-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getSeverityIcon(alert.severity)}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{alert.title}</h3>
                      {alert.category && (
                        <p className="text-sm text-gray-600 mb-1">Категория: {alert.category}</p>
                      )}
                      <p className="text-gray-700">{alert.message}</p>
                      {alert.percentage && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Използвано:</span>
                            <span className="font-medium">{alert.percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                alert.percentage > 100 ? 'bg-red-500' :
                                alert.percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Seasonal Tab */}
      {activeTab === 'seasonal' && (
        <div className="space-y-4">
          {seasonalInsights.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Няма сезонни анализи</h3>
              <p className="text-gray-500">Необходими са повече данни за сезонен анализ.</p>
            </div>
          ) : (
            seasonalInsights.map((insight, index) => (
              <div key={index} className="border border-gray-200 bg-white rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  {getSeasonIcon(insight.season)}
                  <h3 className="text-lg font-medium text-gray-900">
                    Сезонен анализ: {insight.category}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      +{insight.predicted_increase}%
                    </div>
                    <div className="text-sm text-gray-600">Прогнозно увеличение</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {insight.confidence}%
                    </div>
                    <div className="text-sm text-gray-600">Увереност</div>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="w-8 h-8 text-green-500 mx-auto" />
                    <div className="text-sm text-gray-600">Тенденция</div>
                  </div>
                </div>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                  {insight.recommendation}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Category Insights Tab */}
      {activeTab === 'insights' && (
        <CategoryInsights />
      )}
    </div>
  );
};

export default SmartBudgetFeatures;