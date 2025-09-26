'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PriceComparison as PriceComparisonType, StorePriceData } from '@/types/analytics';
import { Store, TrendingUp, TrendingDown, Target, Award, AlertTriangle, Eye, BarChart3 } from 'lucide-react';

interface PriceComparisonProps {
  data: PriceComparisonType[];
  loading?: boolean;
  onProductClick?: (productName: string) => void;
  showHistory?: boolean;
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

function getPriceStabilityIcon(stability: string) {
  switch (stability) {
    case 'stable':
      return <Target className="w-4 h-4 text-green-500" />;
    case 'increasing':
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    case 'decreasing':
      return <TrendingDown className="w-4 h-4 text-green-500" />;
    case 'fluctuating':
      return <BarChart3 className="w-4 h-4 text-yellow-500" />;
    default:
      return <Target className="w-4 h-4 text-gray-400" />;
  }
}

function getPriceStabilityColor(stability: string): string {
  switch (stability) {
    case 'stable':
      return 'text-green-700 bg-green-50';
    case 'increasing':
      return 'text-red-700 bg-red-50';
    case 'decreasing':
      return 'text-green-700 bg-green-50';
    case 'fluctuating':
      return 'text-yellow-700 bg-yellow-50';
    default:
      return 'text-gray-700 bg-gray-50';
  }
}

function getPriceStabilityText(stability: string): string {
  switch (stability) {
    case 'stable':
      return 'Стабилна';
    case 'increasing':
      return 'Растяща';
    case 'decreasing':
      return 'Намаляваща';
    case 'fluctuating':
      return 'Променлива';
    default:
      return 'Неизвестна';
  }
}

function getRecommendationIcon(type: string): string {
  switch (type) {
    case 'switch_store': return '🏪';
    case 'buy_in_bulk': return '📦';
    case 'wait_for_price_drop': return '⏰';
    case 'stock_up_now': return '🛒';
    default: return '💡';
  }
}

function getRecommendationText(type: string): string {
  switch (type) {
    case 'switch_store': return 'Смени магазин';
    case 'buy_in_bulk': return 'Купи на едро';
    case 'wait_for_price_drop': return 'Изчакай спад в цената';
    case 'stock_up_now': return 'Зарежи се сега';
    default: return type;
  }
}

interface StoreRowProps {
  store: StorePriceData;
  rank: number;
  averagePrice: number;
  cheapestPrice: number;
}

function StoreRow({ store, rank, averagePrice, cheapestPrice }: StoreRowProps) {
  const savingsVsCheapest = store.currentPrice - cheapestPrice;
  const savingsPercent = ((store.currentPrice - cheapestPrice) / cheapestPrice) * 100;

  return (
    <tr className={`border-b hover:bg-gray-50 ${rank === 1 ? 'bg-green-50' : ''}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {rank === 1 && <Award className="w-4 h-4 text-green-600" />}
          <span className={`font-medium ${rank === 1 ? 'text-green-900' : 'text-gray-900'}`}>
            {store.storeName}
          </span>
          {rank === 1 && (
            <Badge className="text-xs bg-green-100 text-green-800 border-none">
              Най-евтин
            </Badge>
          )}
        </div>
      </td>

      <td className="px-4 py-3">
        <div className={`text-lg font-bold ${rank === 1 ? 'text-green-600' : 'text-gray-900'}`}>
          {formatBulgarianCurrency(store.currentPrice)}
        </div>
        {store.unit && (
          <div className="text-xs text-gray-500">за {store.unit}</div>
        )}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {getPriceStabilityIcon(store.priceStability)}
          <Badge className={`text-xs ${getPriceStabilityColor(store.priceStability)}`}>
            {getPriceStabilityText(store.priceStability)}
          </Badge>
        </div>
      </td>

      <td className="px-4 py-3 text-sm">
        <div>{formatBulgarianDate(store.lastPurchase)}</div>
        <div className="text-xs text-gray-500">{store.purchaseCount} покупки</div>
      </td>

      <td className="px-4 py-3">
        {savingsVsCheapest > 0 ? (
          <div className="text-red-600">
            <div className="font-medium">+{formatBulgarianCurrency(savingsVsCheapest)}</div>
            <div className="text-xs">(+{savingsPercent.toFixed(1)}%)</div>
          </div>
        ) : (
          <div className="text-green-600 font-medium">
            Най-евтин
          </div>
        )}
      </td>
    </tr>
  );
}

interface ProductComparisonCardProps {
  product: PriceComparisonType;
  onProductClick?: (productName: string) => void;
  showHistory: boolean;
  onToggleHistory: () => void;
}

function ProductComparisonCard({ product, onProductClick, showHistory, onToggleHistory }: ProductComparisonCardProps) {
  const topRecommendations = product.analysis.recommendations
    .filter(r => r.priority === 'high')
    .slice(0, 2);

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {product.productName}
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Badge variant="secondary" className="text-xs">
                📂 {product.category}
              </Badge>
              {product.barcode && (
                <Badge variant="secondary" className="text-xs">
                  🏷️ {product.barcode}
                </Badge>
              )}
              <span>{product.stores.length} магазина</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatBulgarianCurrency(product.analysis.averagePrice)}
            </div>
            <div className="text-sm text-gray-500">средна цена</div>
          </div>
        </div>

        {/* Price Range Stats */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-green-700 font-medium">Най-евтин</div>
            <div className="text-lg font-bold text-green-900">
              {formatBulgarianCurrency(product.analysis.priceRange.min)}
            </div>
            <div className="text-xs text-green-600">{product.analysis.cheapestStore}</div>
          </div>

          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-red-700 font-medium">Най-скъп</div>
            <div className="text-lg font-bold text-red-900">
              {formatBulgarianCurrency(product.analysis.priceRange.max)}
            </div>
            <div className="text-xs text-red-600">{product.analysis.mostExpensiveStore}</div>
          </div>

          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-orange-700 font-medium">Разлика</div>
            <div className="text-lg font-bold text-orange-900">
              {formatBulgarianCurrency(product.analysis.priceRange.spread)}
            </div>
            <div className="text-xs text-orange-600">
              {product.analysis.priceRange.spreadPercentage.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Stores Comparison Table */}
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Магазин</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Цена</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Тенденция</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Последна покупка</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Разлика</th>
              </tr>
            </thead>
            <tbody>
              {product.stores.map((store, index) => (
                <StoreRow
                  key={store.storeId}
                  store={store}
                  rank={store.priceRank}
                  averagePrice={product.analysis.averagePrice}
                  cheapestPrice={product.analysis.priceRange.min}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price History Chart */}
      {showHistory && product.priceHistory.length > 0 && (
        <div className="px-6 pb-6 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-3 mt-4">Ценова история</h4>
          <div className="flex items-end justify-between space-x-1 h-32 bg-gray-50 rounded-lg p-4">
            {product.priceHistory.slice(-10).map((point, index) => {
              const maxPrice = Math.max(...product.priceHistory.map(p => p.price));
              const height = (point.price / maxPrice) * 100;
              const store = product.stores.find(s => s.storeId === point.storeId);

              return (
                <div key={index} className="flex-1 flex flex-col items-center group relative">
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <div>{store?.storeName}</div>
                    <div>{formatBulgarianCurrency(point.price)}</div>
                    <div>{formatBulgarianDate(point.date)}</div>
                  </div>

                  <div
                    className="w-full rounded-t transition-all duration-300 cursor-pointer"
                    style={{
                      height: `${Math.max(height, 5)}%`,
                      backgroundColor: store?.storeId === product.stores.find(s => s.priceRank === 1)?.storeId ? '#10b981' : '#3b82f6'
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {topRecommendations.length > 0 && (
        <div className="px-6 pb-6 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-3 mt-4">Препоръки за пестене</h4>
          <div className="space-y-2">
            {topRecommendations.map((rec, idx) => (
              <div key={idx} className={`p-3 rounded-lg ${
                rec.priority === 'high' ? 'bg-green-50 text-green-700' :
                rec.priority === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                'bg-blue-50 text-blue-700'
              }`}>
                <div className="flex items-start gap-2">
                  <span className="text-lg">{getRecommendationIcon(rec.type)}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {getRecommendationText(rec.type)}
                    </div>
                    <div className="text-sm opacity-90">{rec.message}</div>
                    <div className="text-sm font-semibold mt-1">
                      Спестявания: {formatBulgarianCurrency(rec.potentialSaving)}
                      <span className="text-xs opacity-75 ml-1">
                        (доверие: {rec.confidence}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleHistory}
          className="text-xs"
        >
          <BarChart3 className="w-3 h-3 mr-1" />
          {showHistory ? 'Скрий история' : 'Покажи история'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onProductClick?.(product.productName)}
          className="text-xs"
        >
          <Eye className="w-3 h-3 mr-1" />
          Виж детайли
        </Button>
      </div>
    </Card>
  );
}

export default function PriceComparison({ data, loading = false, onProductClick, showHistory = false }: PriceComparisonProps) {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'savings' | 'average' | 'stores'>('savings');

  const toggleProductHistory = (productName: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productName)) {
      newExpanded.delete(productName);
    } else {
      newExpanded.add(productName);
    }
    setExpandedProducts(newExpanded);
  };

  const sortedData = [...data].sort((a, b) => {
    switch (sortBy) {
      case 'savings':
        return b.analysis.priceRange.spread - a.analysis.priceRange.spread;
      case 'average':
        return b.analysis.averagePrice - a.analysis.averagePrice;
      case 'stores':
        return b.stores.length - a.stores.length;
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
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
            Няма данни за сравнение на цени
          </h3>
          <p className="text-gray-500">
            Добавете повече касови бележки от различни магазини за сравнение на цени.
          </p>
        </div>
      </Card>
    );
  }

  const totalPotentialSavings = data.reduce((sum, product) => {
    return sum + product.analysis.recommendations.reduce((recSum, rec) => recSum + rec.potentialSaving, 0);
  }, 0);

  const averagePriceSpread = data.reduce((sum, product) => sum + product.analysis.priceRange.spreadPercentage, 0) / data.length;
  const bestDeals = data.filter(product => product.analysis.priceRange.spreadPercentage > 20).length;

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              💰 Сравнение на цени
            </h3>
            <p className="text-sm text-gray-600">
              Анализ на цените в различни магазини за намиране на най-добрите оферти
            </p>
          </div>
          <Badge className="bg-green-100 text-green-800">
            {data.length} продукта
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">Потенциални спестявания</span>
            </div>
            <div className="text-lg font-bold text-green-900">
              {formatBulgarianCurrency(totalPotentialSavings)}
            </div>
            <div className="text-sm text-green-600">
              При оптимален избор на магазини
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Средна ценова разлика</span>
            </div>
            <div className="text-lg font-bold text-orange-900">
              {averagePriceSpread.toFixed(1)}%
            </div>
            <div className="text-sm text-orange-600">
              Между най-евтин и най-скъп
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Големи разлики</span>
            </div>
            <div className="text-lg font-bold text-blue-900">{bestDeals}</div>
            <div className="text-sm text-blue-600">
              продукта с над 20% разлика
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Магазини</span>
            </div>
            <div className="text-lg font-bold text-purple-900">
              {[...new Set(data.flatMap(p => p.stores.map(s => s.storeId)))].length}
            </div>
            <div className="text-sm text-purple-600">
              В сравнението
            </div>
          </div>
        </div>

        {/* Sorting Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Сортирай по:</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={sortBy === 'savings' ? 'default' : 'outline'}
              onClick={() => setSortBy('savings')}
              className="text-xs"
            >
              Спестявания
            </Button>
            <Button
              size="sm"
              variant={sortBy === 'average' ? 'default' : 'outline'}
              onClick={() => setSortBy('average')}
              className="text-xs"
            >
              Средна цена
            </Button>
            <Button
              size="sm"
              variant={sortBy === 'stores' ? 'default' : 'outline'}
              onClick={() => setSortBy('stores')}
              className="text-xs"
            >
              Брой магазини
            </Button>
          </div>
        </div>
      </Card>

      {/* Product Comparison Cards */}
      <div className="space-y-4">
        {sortedData.map((product) => (
          <ProductComparisonCard
            key={product.normalizedName}
            product={product}
            onProductClick={onProductClick}
            showHistory={expandedProducts.has(product.productName)}
            onToggleHistory={() => toggleProductHistory(product.productName)}
          />
        ))}
      </div>
    </div>
  );
}