'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryInsight } from '@/types/analytics';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Target, Calendar, Eye } from 'lucide-react';

interface CategoryInsightsProps {
  data: CategoryInsight[];
  loading?: boolean;
  onCategoryClick?: (categoryId: string) => void;
}

function formatBulgarianCurrency(amount: number): string {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: 'BGN',
    minimumFractionDigits: 2,
  }).format(amount).replace('BGN', 'лв');
}

function getTrendIcon(direction: string, size = 'w-4 h-4') {
  switch (direction) {
    case 'growing':
      return <TrendingUp className={`${size} text-red-500`} />;
    case 'shrinking':
      return <TrendingDown className={`${size} text-green-500`} />;
    default:
      return <Minus className={`${size} text-gray-400`} />;
  }
}

function getTrendColor(direction: string) {
  switch (direction) {
    case 'growing':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'shrinking':
      return 'text-green-600 bg-green-50 border-green-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

function getSeasonalityDescription(pattern: string): { text: string; icon: string } {
  switch (pattern) {
    case 'seasonal':
      return { text: 'Сезонна', icon: '🌿' };
    case 'steady':
      return { text: 'Постоянна', icon: '📊' };
    case 'irregular':
      return { text: 'Нередовна', icon: '📈' };
    default:
      return { text: 'Неопределена', icon: '❓' };
  }
}

function getRecommendationIcon(type: string): string {
  switch (type) {
    case 'budget_warning': return '⚠️';
    case 'seasonal_tip': return '🌟';
    case 'price_alert': return '💰';
    case 'saving_opportunity': return '💡';
    default: return '💭';
  }
}

interface CategoryCardProps {
  category: CategoryInsight;
  rank: number;
  onCategoryClick?: (categoryId: string) => void;
  showDetails: boolean;
  onToggleDetails: () => void;
}

function CategoryCard({ category, rank, onCategoryClick, showDetails, onToggleDetails }: CategoryCardProps) {
  const monthTrend = category.trend.monthOverMonth;
  const yearTrend = category.trend.yearOverYear;
  const seasonality = getSeasonalityDescription(category.seasonality.pattern);

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg">
      {/* Header */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-full text-2xl"
              style={{ backgroundColor: category.color + '20' }}
            >
              {category.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{category.categoryName}</h3>
                <Badge variant="secondary" className="text-xs">
                  #{rank}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-xs ${seasonality.icon} border-none bg-blue-50 text-blue-700`}>
                  {seasonality.icon} {seasonality.text}
                </Badge>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: category.color }}>
              {formatBulgarianCurrency(category.currentMonthSpent)}
            </div>
            <div className="text-sm text-gray-500">
              този месец
            </div>
          </div>
        </div>

        {/* Trend Indicators */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`p-3 rounded-lg border ${getTrendColor(monthTrend.direction)}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Спрямо миналия месец</span>
              {getTrendIcon(monthTrend.direction, 'w-3 h-3')}
            </div>
            <div className="text-sm font-bold">
              {monthTrend.percentage > 0 ? '+' : ''}{monthTrend.percentage.toFixed(1)}%
            </div>
            <div className="text-xs opacity-75">
              {formatBulgarianCurrency(monthTrend.amount)}
            </div>
          </div>

          <div className={`p-3 rounded-lg border ${getTrendColor(yearTrend.direction)}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Спрямо миналата година</span>
              {getTrendIcon(yearTrend.direction, 'w-3 h-3')}
            </div>
            <div className="text-sm font-bold">
              {yearTrend.percentage > 0 ? '+' : ''}{yearTrend.percentage.toFixed(1)}%
            </div>
            <div className="text-xs opacity-75">
              {formatBulgarianCurrency(yearTrend.amount)}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex justify-between items-center text-sm">
          <div>
            <span className="text-gray-500">Година до момента:</span>
            <div className="font-medium">{formatBulgarianCurrency(category.yearToDateSpent)}</div>
          </div>
          <div className="text-right">
            <span className="text-gray-500">Предишен месец:</span>
            <div className="font-medium">{formatBulgarianCurrency(category.previousMonthSpent)}</div>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="px-4 pb-4 border-t bg-gray-50">
          {/* Price Evolution Chart */}
          {category.priceEvolution.length > 0 && (
            <div className="mb-4 pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Ценова еволюция</h4>
              <div className="flex items-end justify-between space-x-1 h-20">
                {category.priceEvolution.slice(-6).map((point, index) => {
                  const maxPrice = Math.max(...category.priceEvolution.map(p => p.averagePrice));
                  const height = (point.averagePrice / maxPrice) * 100;

                  return (
                    <div key={`${point.year}-${point.month}`} className="flex-1 flex flex-col items-center">
                      <div className="text-xs text-gray-500 mb-1">
                        {formatBulgarianCurrency(point.averagePrice)}
                      </div>
                      <div
                        className="w-full rounded-t transition-all duration-300"
                        style={{
                          height: `${height}%`,
                          backgroundColor: category.color + '80'
                        }}
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        {point.month.toString().padStart(2, '0')}/{point.year}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seasonality */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Сезонност</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">Пикови месеци:</span>
                <div className="font-medium">
                  {category.seasonality.peak_months.length > 0
                    ? category.seasonality.peak_months.map(m =>
                        new Date(2024, m - 1).toLocaleDateString('bg-BG', { month: 'short' })
                      ).join(', ')
                    : 'Няма данни'
                  }
                </div>
              </div>
              <div>
                <span className="text-gray-500">Слаби месеци:</span>
                <div className="font-medium">
                  {category.seasonality.low_months.length > 0
                    ? category.seasonality.low_months.map(m =>
                        new Date(2024, m - 1).toLocaleDateString('bg-BG', { month: 'short' })
                      ).join(', ')
                    : 'Няма данни'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Insights & Recommendations */}
          {category.insights.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Препоръки</h4>
              <div className="space-y-2">
                {category.insights.slice(0, 2).map((insight, idx) => (
                  <div key={idx} className={`p-2 rounded text-xs ${
                    insight.priority === 'high' ? 'bg-red-50 text-red-700' :
                    insight.priority === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5">{getRecommendationIcon(insight.type)}</span>
                      <div className="flex-1">
                        <div className="font-medium mb-1">{insight.type.replace('_', ' ')}</div>
                        <div>{insight.message}</div>
                        {insight.potentialSaving && (
                          <div className="mt-1 font-medium">
                            Потенциални спестявания: {formatBulgarianCurrency(insight.potentialSaving)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-3 border-t flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleDetails}
          className="text-xs"
        >
          {showDetails ? 'Скрий детайли' : 'Покажи детайли'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCategoryClick?.(category.categoryId)}
          className="text-xs"
        >
          <Eye className="w-3 h-3 mr-1" />
          Виж продукти
        </Button>
      </div>
    </Card>
  );
}

export default function CategoryInsights({ data, loading = false, onCategoryClick }: CategoryInsightsProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'current' | 'trend' | 'ytd'>('current');

  const toggleCategoryDetails = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const sortedData = [...data].sort((a, b) => {
    switch (sortBy) {
      case 'trend':
        return Math.abs(b.trend.monthOverMonth.percentage) - Math.abs(a.trend.monthOverMonth.percentage);
      case 'ytd':
        return b.yearToDateSpent - a.yearToDateSpent;
      default:
        return b.currentMonthSpent - a.currentMonthSpent;
    }
  });

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Няма данни за категории
          </h3>
          <p className="text-gray-500">
            Добавете касови бележки за да видите анализ по категории.
          </p>
        </div>
      </Card>
    );
  }

  const totalCurrentMonth = data.reduce((sum, cat) => sum + cat.currentMonthSpent, 0);
  const totalYTD = data.reduce((sum, cat) => sum + cat.yearToDateSpent, 0);
  const avgMonthlyGrowth = data.reduce((sum, cat) => sum + cat.trend.monthOverMonth.percentage, 0) / data.length;

  const growingCategories = data.filter(cat => cat.trend.monthOverMonth.direction === 'growing').length;
  const shrinkingCategories = data.filter(cat => cat.trend.monthOverMonth.direction === 'shrinking').length;

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📊 Анализ по категории
            </h3>
            <p className="text-sm text-gray-600">
              Детайлен анализ на тенденциите в разходите по категории
            </p>
          </div>
          <Badge className="bg-purple-100 text-purple-800">
            {data.length} категории
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Този месец</span>
            </div>
            <div className="text-lg font-bold text-blue-900">
              {formatBulgarianCurrency(totalCurrentMonth)}
            </div>
            <div className="text-sm text-blue-600">
              Общо разходи
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">Намаляващи</span>
            </div>
            <div className="text-lg font-bold text-green-900">{shrinkingCategories}</div>
            <div className="text-sm text-green-600">
              от {data.length} категории
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-700">Растящи</span>
            </div>
            <div className="text-lg font-bold text-red-900">{growingCategories}</div>
            <div className="text-sm text-red-600">
              от {data.length} категории
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">Година до момента</span>
            </div>
            <div className="text-lg font-bold text-yellow-900">
              {formatBulgarianCurrency(totalYTD)}
            </div>
            <div className="text-sm text-yellow-600">
              Общо разходи
            </div>
          </div>
        </div>

        {/* Sorting Controls */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600">Сортирай по:</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={sortBy === 'current' ? 'default' : 'outline'}
              onClick={() => setSortBy('current')}
              className="text-xs"
            >
              Този месец
            </Button>
            <Button
              size="sm"
              variant={sortBy === 'trend' ? 'default' : 'outline'}
              onClick={() => setSortBy('trend')}
              className="text-xs"
            >
              Тенденция
            </Button>
            <Button
              size="sm"
              variant={sortBy === 'ytd' ? 'default' : 'outline'}
              onClick={() => setSortBy('ytd')}
              className="text-xs"
            >
              Година до момента
            </Button>
          </div>
        </div>

        {/* Insights */}
        <div className="p-3 bg-indigo-50 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="text-indigo-600 mt-0.5">📈</div>
            <div>
              <div className="text-sm font-medium text-indigo-900 mb-1">
                Анализ на тенденциите:
              </div>
              <div className="text-xs text-indigo-700">
                {avgMonthlyGrowth > 10 ? (
                  <>Общо увеличение в разходите с {avgMonthlyGrowth.toFixed(1)}% спрямо миналия месец. Прегледайте категориите за оптимизация.</>
                ) : avgMonthlyGrowth < -10 ? (
                  <>Отлично! Общо намаление в разходите с {Math.abs(avgMonthlyGrowth).toFixed(1)}% спрямо миналия месец.</>
                ) : (
                  <>Стабилни разходи с минимални промени спрямо миналия месец ({avgMonthlyGrowth.toFixed(1)}%).</>
                )}
                {' '}
                {growingCategories > shrinkingCategories ?
                  `Повече категории показват ръст (${growingCategories}) от тези, които намаляват (${shrinkingCategories}).` :
                  `Повече категории показват намаление (${shrinkingCategories}) от тези, които растат (${growingCategories}).`
                }
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Category Cards */}
      <div className="grid gap-4">
        {sortedData.map((category, index) => (
          <CategoryCard
            key={category.categoryId}
            category={category}
            rank={index + 1}
            onCategoryClick={onCategoryClick}
            showDetails={expandedCategories.has(category.categoryId)}
            onToggleDetails={() => toggleCategoryDetails(category.categoryId)}
          />
        ))}
      </div>
    </div>
  );
}