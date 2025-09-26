'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StoreLoyaltyAnalysis as StoreLoyaltyType } from '@/types/analytics';
import { Store, Heart, TrendingUp, TrendingDown, Award, Calendar, ShoppingBag } from 'lucide-react';

interface StoreLoyaltyAnalysisProps {
  data: StoreLoyaltyType[];
  loading?: boolean;
  showDetails?: boolean;
}

function formatBulgarianCurrency(amount: number): string {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: 'BGN',
    minimumFractionDigits: 2,
  }).format(amount).replace('BGN', 'лв');
}

function formatBulgarianDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getLoyaltyLevel(score: number): { level: string; color: string; icon: string } {
  if (score >= 80) return { level: 'Златен клиент', color: 'text-yellow-600 bg-yellow-50', icon: '🥇' };
  if (score >= 60) return { level: 'Сребърен клиент', color: 'text-gray-600 bg-gray-50', icon: '🥈' };
  if (score >= 40) return { level: 'Бронзов клиент', color: 'text-amber-600 bg-amber-50', icon: '🥉' };
  if (score >= 20) return { level: 'Обичайен клиент', color: 'text-blue-600 bg-blue-50', icon: '👤' };
  return { level: 'Нов клиент', color: 'text-green-600 bg-green-50', icon: '🆕' };
}

function getVisitFrequencyDescription(avgDays: number): string {
  if (avgDays <= 3) return 'Много често (всеки 2-3 дни)';
  if (avgDays <= 7) return 'Често (веднъж седмично)';
  if (avgDays <= 14) return 'Редовно (на 2 седмици)';
  if (avgDays <= 30) return 'Месечно';
  return 'Рядко (над месец)';
}

interface StoreCardProps {
  store: StoreLoyaltyType;
  rank: number;
  onViewDetails: () => void;
  showDetails: boolean;
}

function StoreCard({ store, rank, onViewDetails, showDetails }: StoreCardProps) {
  const loyaltyInfo = getLoyaltyLevel(store.loyaltyScore);
  const visitDescription = getVisitFrequencyDescription(store.visitFrequency.average);

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg">
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
              <Store className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{store.storeName}</h3>
                <Badge variant="secondary" className="text-xs">
                  #{rank}
                </Badge>
              </div>
              <Badge className={`text-xs ${loyaltyInfo.color} border-none`}>
                {loyaltyInfo.icon} {loyaltyInfo.level}
              </Badge>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatBulgarianCurrency(store.totalSpent)}
            </div>
            <div className="text-sm text-gray-500">
              {store.receiptsCount} покупки
            </div>
          </div>
        </div>

        {/* Loyalty Score */}
        <div className="mb-3">
          <div className="flex justify-between items-center text-sm mb-1">
            <span className="text-gray-600">Лоялност</span>
            <span className="font-medium">{store.loyaltyScore}/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${store.loyaltyScore}%` }}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-gray-400" />
            <div>
              <div className="font-medium">{store.itemsCount}</div>
              <div className="text-gray-500">продукта</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <div className="font-medium">{visitDescription}</div>
              <div className="text-gray-500">честота</div>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="p-4 pt-0 border-t bg-gray-50">
          {/* Visit History */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">История на посещенията</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">Първо посещение:</span>
                <div className="font-medium">{formatBulgarianDate(store.firstVisit)}</div>
              </div>
              <div>
                <span className="text-gray-500">Последно посещение:</span>
                <div className="font-medium">{formatBulgarianDate(store.lastVisit)}</div>
              </div>
            </div>
          </div>

          {/* Favorite Categories */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Любими категории</h4>
            <div className="space-y-2">
              {store.favoriteCategories.slice(0, 3).map((category, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">{category.categoryName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {formatBulgarianCurrency(category.amount)}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({category.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Comparison */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Ценово сравнение</h4>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Спрямо средните цени:</span>
              <Badge
                variant="secondary"
                className={
                  store.priceComparison.ranking === 'cheapest' ? 'text-green-600 bg-green-50' :
                  store.priceComparison.ranking === 'expensive' ? 'text-red-600 bg-red-50' :
                  'text-gray-600 bg-gray-50'
                }
              >
                {store.priceComparison.ranking === 'cheapest' ? '💰 Евтин' :
                 store.priceComparison.ranking === 'expensive' ? '💸 Скъп' :
                 '⚖️ Среден'}
              </Badge>
            </div>
          </div>

          {/* Average Receipt Value */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Средна стойност на покупка</h4>
            <div className="text-lg font-bold text-blue-600">
              {formatBulgarianCurrency(store.averageReceiptValue)}
            </div>
          </div>

          {/* Recommendations */}
          {store.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Препоръки</h4>
              <div className="space-y-2">
                {store.recommendations.slice(0, 2).map((rec, idx) => (
                  <div key={idx} className={`p-2 rounded text-xs ${
                    rec.priority === 'high' ? 'bg-red-50 text-red-700' :
                    rec.priority === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    <div className="font-medium">{rec.type}</div>
                    <div>{rec.message}</div>
                    {rec.potentialSaving && (
                      <div className="mt-1 font-medium">
                        Потенциални спестявания: {formatBulgarianCurrency(rec.potentialSaving)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewDetails}
          className="w-full text-xs"
        >
          {showDetails ? 'Скрий детайли' : 'Покажи детайли'}
        </Button>
      </div>
    </Card>
  );
}

export default function StoreLoyaltyAnalysis({ data, loading = false, showDetails = false }: StoreLoyaltyAnalysisProps) {
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());

  const toggleStoreDetails = (storeId: string) => {
    const newExpanded = new Set(expandedStores);
    if (newExpanded.has(storeId)) {
      newExpanded.delete(storeId);
    } else {
      newExpanded.add(storeId);
    }
    setExpandedStores(newExpanded);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
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
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Няма данни за лоялност към магазини
          </h3>
          <p className="text-gray-500">
            Добавете повече касови бележки за да видите анализ на лоялността.
          </p>
        </div>
      </Card>
    );
  }

  const totalSpent = data.reduce((sum, store) => sum + store.totalSpent, 0);
  const topStore = data[0];
  const averageLoyalty = data.reduce((sum, store) => sum + store.loyaltyScore, 0) / data.length;

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🏪 Анализ на лоялността към магазини
            </h3>
            <p className="text-sm text-gray-600">
              Детайлен анализ на вашите предпочитания при пазаруване
            </p>
          </div>
          <Badge className="bg-blue-100 text-blue-800">
            {data.length} магазина
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">Най-лоялен</span>
            </div>
            <div className="text-lg font-bold text-green-900">{topStore.storeName}</div>
            <div className="text-sm text-green-600">
              {formatBulgarianCurrency(topStore.totalSpent)} • {topStore.receiptsCount} покупки
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Средна лоялност</span>
            </div>
            <div className="text-lg font-bold text-blue-900">{averageLoyalty.toFixed(0)}/100</div>
            <div className="text-sm text-blue-600">
              Общо {data.reduce((sum, store) => sum + store.receiptsCount, 0)} покупки
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Общо харчене</span>
            </div>
            <div className="text-lg font-bold text-purple-900">
              {formatBulgarianCurrency(totalSpent)}
            </div>
            <div className="text-sm text-purple-600">
              Средно {formatBulgarianCurrency(totalSpent / data.length)} на магазин
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-4 p-3 bg-amber-50 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="text-amber-600 mt-0.5">💡</div>
            <div>
              <div className="text-sm font-medium text-amber-900 mb-1">
                Анализ на лоялността:
              </div>
              <div className="text-xs text-amber-700">
                {(() => {
                  const topStorePercentage = (topStore.totalSpent / totalSpent) * 100;
                  if (topStorePercentage > 50) {
                    return `Вие харчите ${topStorePercentage.toFixed(0)}% от средствата си в ${topStore.storeName}. Помислете за сравняване на цени в други магазини.`;
                  } else if (data.length >= 5) {
                    return `Добро разпределение - пазарувате от ${data.length} различни магазини, което ви помага да намирате най-добрите цени.`;
                  } else {
                    return `Пазарувате основно от ${data.length} магазина. Разгледайте и други опции за по-добри цени.`;
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Store Cards */}
      <div className="grid gap-4">
        {data.slice(0, 10).map((store, index) => (
          <StoreCard
            key={store.storeId}
            store={store}
            rank={index + 1}
            onViewDetails={() => toggleStoreDetails(store.storeId)}
            showDetails={expandedStores.has(store.storeId)}
          />
        ))}
      </div>

      {data.length > 10 && (
        <Card className="p-4">
          <div className="text-center text-sm text-gray-500">
            Показани са топ 10 магазина. Общо {data.length} магазина в анализа.
          </div>
        </Card>
      )}
    </div>
  );
}