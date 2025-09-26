'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MonthlySpendingData } from '@/types/analytics';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

interface SpendingTrendsChartProps {
  data: MonthlySpendingData[];
  loading?: boolean;
  height?: number;
  showComparison?: boolean;
}

function formatBulgarianCurrency(amount: number): string {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: 'BGN',
    minimumFractionDigits: 2,
  }).format(amount).replace('BGN', 'лв');
}

export default function SpendingTrendsChart({
  data,
  loading = false,
  height = 400,
  showComparison = true
}: SpendingTrendsChartProps) {
  const chartData = useMemo(() => {
    if (!data.length) return null;

    const maxValue = Math.max(...data.map(d => d.totalSpent));
    const avgValue = data.reduce((sum, d) => sum + d.totalSpent, 0) / data.length;

    return {
      maxValue,
      avgValue,
      months: data,
      totalSpent: data.reduce((sum, d) => sum + d.totalSpent, 0),
      totalReceipts: data.reduce((sum, d) => sum + d.receiptsCount, 0)
    };
  }, [data]);

  const getBarHeight = (value: number, max: number): number => {
    return Math.max((value / max) * 80, 2); // Minimum 2% height for visibility
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up':
        return 'text-red-600 bg-red-50';
      case 'down':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  if (!chartData) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Няма данни за тенденции
          </h3>
          <p className="text-gray-500">
            Няма достатъчно данни за показване на тенденциите в разходите.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            📈 Тенденции в разходите
          </h3>
          <p className="text-sm text-gray-600">
            Месечно сравнение на разходите за последните {data.length} месеца
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {formatBulgarianCurrency(chartData.totalSpent)}
          </div>
          <div className="text-sm text-gray-500">
            Общо за периода
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative mb-6" style={{ height: `${height}px` }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-gray-500 py-4">
          <span>{formatBulgarianCurrency(chartData.maxValue)}</span>
          <span>{formatBulgarianCurrency(chartData.maxValue * 0.75)}</span>
          <span>{formatBulgarianCurrency(chartData.maxValue * 0.5)}</span>
          <span>{formatBulgarianCurrency(chartData.maxValue * 0.25)}</span>
          <span>0 лв</span>
        </div>

        {/* Average line */}
        <div
          className="absolute left-16 right-4 border-t border-dashed border-blue-300 z-10"
          style={{
            top: `${20 + (1 - chartData.avgValue / chartData.maxValue) * 80}%`
          }}
        >
          <span className="absolute -top-2 -right-2 text-xs text-blue-600 bg-white px-2 rounded">
            Средно: {formatBulgarianCurrency(chartData.avgValue)}
          </span>
        </div>

        {/* Chart area */}
        <div className="absolute left-16 right-4 top-4 bottom-8 flex items-end justify-between space-x-1">
          {data.map((month, index) => {
            const barHeight = getBarHeight(month.totalSpent, chartData.maxValue);
            const isHighest = month.totalSpent === chartData.maxValue;
            const isLowest = month.totalSpent === Math.min(...data.map(d => d.totalSpent));

            return (
              <div key={`${month.year}-${month.month}`} className="flex-1 flex flex-col items-center group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap">
                  <div className="font-semibold">{month.monthName}</div>
                  <div>{formatBulgarianCurrency(month.totalSpent)}</div>
                  <div>{month.receiptsCount} бележки</div>
                  <div>Средно: {formatBulgarianCurrency(month.averageReceiptValue)}</div>
                  {month.trend.percentage > 0 && (
                    <div className="flex items-center gap-1">
                      {getTrendIcon(month.trend.direction)}
                      {month.trend.percentage.toFixed(1)}%
                    </div>
                  )}
                </div>

                {/* Bar */}
                <div
                  className={`w-full rounded-t transition-all duration-300 cursor-pointer ${
                    isHighest ? 'bg-gradient-to-t from-green-400 to-green-500' :
                    isLowest ? 'bg-gradient-to-t from-red-400 to-red-500' :
                    'bg-gradient-to-t from-blue-400 to-blue-500'
                  } hover:from-blue-500 hover:to-blue-600`}
                  style={{ height: `${barHeight}%` }}
                />

                {/* Trend indicator */}
                {month.trend.percentage > 0 && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge variant="secondary" className={`text-xs px-1 py-0 ${getTrendColor(month.trend.direction)}`}>
                      {getTrendIcon(month.trend.direction)}
                    </Badge>
                  </div>
                )}

                {/* Month label */}
                <div className="text-xs text-gray-500 mt-2 text-center">
                  <div className="font-medium">
                    {month.month.toString().padStart(2, '0')}
                  </div>
                  <div>
                    {month.year}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">
            {formatBulgarianCurrency(chartData.avgValue)}
          </div>
          <div className="text-xs text-gray-500">Средно месечно</div>
        </div>

        <div className="text-center">
          <div className="text-lg font-bold text-green-600">
            {formatBulgarianCurrency(Math.min(...data.map(d => d.totalSpent)))}
          </div>
          <div className="text-xs text-gray-500">Най-малко</div>
        </div>

        <div className="text-center">
          <div className="text-lg font-bold text-red-600">
            {formatBulgarianCurrency(Math.max(...data.map(d => d.totalSpent)))}
          </div>
          <div className="text-xs text-gray-500">Най-много</div>
        </div>

        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">
            {chartData.totalReceipts}
          </div>
          <div className="text-xs text-gray-500">Общо бележки</div>
        </div>
      </div>

      {/* Insights */}
      {showComparison && data.length >= 2 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="text-blue-600 mt-0.5">💡</div>
            <div>
              <div className="text-sm font-medium text-blue-900 mb-1">
                Анализ на тенденциите:
              </div>
              <div className="text-xs text-blue-700 space-y-1">
                {(() => {
                  const lastMonth = data[data.length - 1];
                  const previousMonth = data[data.length - 2];
                  const change = lastMonth.totalSpent - previousMonth.totalSpent;
                  const changePercent = (change / previousMonth.totalSpent) * 100;

                  if (Math.abs(changePercent) < 5) {
                    return <p>Разходите са стабилни през последния месец.</p>;
                  } else if (changePercent > 0) {
                    return (
                      <p>
                        Разходите са се увеличили с {formatBulgarianCurrency(change)} ({changePercent.toFixed(1)}%)
                        спрямо предишния месец. Прегледайте категориите за оптимизация.
                      </p>
                    );
                  } else {
                    return (
                      <p>
                        Отлично! Разходите са намалели с {formatBulgarianCurrency(Math.abs(change))} ({Math.abs(changePercent).toFixed(1)}%)
                        спрямо предишния месец.
                      </p>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}