'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase-simple';
import { TrendingUp, Clock, DollarSign, ShoppingCart } from 'lucide-react';

interface StandardProduct {
  position: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  unit: string;
  retailer_count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  promotion_count: number;
  prices: Array<{
    retailer: string;
    price: number;
    is_promotion: boolean;
    promotion_text?: string;
    source: 'manual' | 'user_receipts';
    last_updated: string;
  }>;
  manual_count: number;
  user_data_count: number;
  last_updated: string;
}

export default function PriceComparisonPage() {
  const [products, setProducts] = useState<StandardProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrices();
  }, []);

  async function loadPrices() {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from('aggregated_standard_prices')
      .select('*')
      .order('position');

    if (!error && data) {
      setProducts(data);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Зареждане на цени...</p>
        </div>
      </div>
    );
  }

  const totalSavings = products.reduce((sum, p) => sum + (p.max_price - p.min_price), 0);
  const hasData = products.some(p => p.retailer_count > 0);

  if (!hasData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-6xl mb-4">📊</p>
          <h2 className="text-2xl font-bold mb-2">Скоро!</h2>
          <p className="text-gray-600 mb-6">
            Цените се актуализират седмично. Проверете отново скоро!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-6xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-2">
            💰 Сравни цените
          </h1>
          <p className="text-green-100">
            10-те основни продукта във всички магазини
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm text-green-100">
            <Clock className="w-4 h-4" />
            Актуализация: {new Date().toLocaleDateString('bg-BG', { weekday: 'long' })}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              title="Продукта"
              value={products.length}
              icon={ShoppingCart}
              color="green"
            />
            <SummaryCard
              title="Магазина"
              value={products[0]?.retailer_count || 0}
              icon={DollarSign}
              color="blue"
            />
            <SummaryCard
              title="Промоции"
              value={products.reduce((sum, p) => sum + p.promotion_count, 0)}
              icon={TrendingUp}
              color="red"
            />
            <SummaryCard
              title="Макс. спестяване"
              value={`${totalSavings.toFixed(2)} лв`}
              icon={DollarSign}
              color="purple"
            />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid md:grid-cols-2 gap-4">
          {products.filter(p => p.retailer_count > 0).map((product) => (
            <ProductCard key={product.position} product={product} />
          ))}
        </div>
      </div>

      {/* Info Footer */}
      <div className="max-w-6xl mx-auto p-4 mt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Как работи?
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✅ Цените се актуализират седмично от проверени източници</li>
            <li>✅ Данните се обогатяват автоматично от касовите бележки на потребителите</li>
            <li>✅ Промоциите се актуализират при наличие</li>
            <li>✅ Спести до {totalSavings.toFixed(2)} лв като избираш най-евтиното</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }: any) {
  const colors = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
    purple: 'text-purple-600'
  };

  return (
    <div className="text-center">
      <div className={`text-3xl font-bold ${colors[color]}`}>
        {value}
      </div>
      <div className="text-sm text-gray-600 flex items-center justify-center gap-1 mt-1">
        <Icon className="w-4 h-4" />
        {title}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: StandardProduct }) {
  const [expanded, setExpanded] = useState(false);

  if (!product.prices || product.prices.length === 0) {
    return null;
  }

  const priceDiff = product.max_price - product.min_price;
  const savingsPercent = ((priceDiff / product.max_price) * 100).toFixed(0);

  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{product.icon}</span>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{product.name}</h3>
            <p className="text-sm text-gray-600">{product.description}</p>
            <div className="flex gap-2 mt-1 text-xs">
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                {product.unit}
              </span>
              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                {product.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Price Stats */}
      <div className="grid grid-cols-3 gap-2 p-4 bg-gray-50 border-b text-center">
        <div>
          <div className="text-xs text-gray-600 mb-1">Средна</div>
          <div className="font-bold text-blue-600">
            {product.avg_price?.toFixed(2)} лв
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Най-ниска</div>
          <div className="font-bold text-green-600">
            {product.min_price?.toFixed(2)} лв
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Най-висока</div>
          <div className="font-bold text-red-600">
            {product.max_price?.toFixed(2)} лв
          </div>
        </div>
      </div>

      {/* Prices List */}
      <div className="p-4">
        <div className="space-y-2">
          {product.prices.slice(0, expanded ? undefined : 3).map((price, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-3 rounded-lg ${
                idx === 0 ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                {idx === 0 && <span className="text-xl">🏆</span>}
                <div>
                  <div className="font-semibold">{price.retailer}</div>
                  {price.is_promotion && (
                    <div className="text-xs text-red-600 font-medium">
                      🔥 {price.promotion_text || 'Промоция'}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {price.source === 'manual' ? '📋 Ръчно' : '🧾 От бележки'}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-lg">
                  {price.price.toFixed(2)} лв
                </div>
                {idx > 0 && (
                  <div className="text-xs text-red-600">
                    +{(price.price - product.min_price).toFixed(2)} лв
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {product.prices.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 text-sm text-green-600 font-medium hover:text-green-700"
          >
            {expanded
              ? '▲ По-малко'
              : `▼ Виж още ${product.prices.length - 3} магазина`
            }
          </button>
        )}

        {/* Savings Info */}
        {priceDiff > 0 && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm">
              <span className="font-semibold text-blue-900">
                💡 Спести {priceDiff.toFixed(2)} лв ({savingsPercent}%)
              </span>
              <div className="text-blue-700 mt-1">
                като избереш {product.prices[0]?.retailer} вместо {product.prices[product.prices.length - 1]?.retailer}
              </div>
            </div>
          </div>
        )}

        {/* Data Source Info */}
        <div className="mt-3 flex gap-2 text-xs text-gray-600">
          {product.manual_count > 0 && (
            <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
              📋 {product.manual_count} ръчни
            </span>
          )}
          {product.user_data_count > 0 && (
            <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
              🧾 {product.user_data_count} от бележки
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
