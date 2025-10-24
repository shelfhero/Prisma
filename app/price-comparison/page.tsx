'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-simple';
import { getTopProductsForUser } from '@/lib/queries/top-products';
import { TOTAL_MONTHLY_SAVINGS } from '@/lib/essential-products';

interface PriceData {
  products: any[];
  type: string;
  message: string;
}

export default function PriceComparisonPage() {
  const router = useRouter();
  const [data, setData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      const result = await getTopProductsForUser(user?.id);
      setData(result);
      setLoading(false);
    }
    loadData();
  }, []);

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

  if (!data || data.products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-6xl mb-4">📊</p>
          <h2 className="text-2xl font-bold mb-2">Няма данни за цени</h2>
          <p className="text-gray-600 mb-6">
            Качете касови бонове, за да видите сравнение на цени
          </p>
          <button
            onClick={() => router.push('/upload-receipt')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700"
          >
            Качи касов бон
          </button>
        </div>
      </div>
    );
  }

  const totalSavings = data.products
    .reduce((sum, p) => sum + (p.potential_savings || 0), 0)
    .toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
        <h1 className="text-2xl font-bold mb-2">
          💰 Сравни цените
        </h1>
        <p className="text-green-100 text-sm">
          {data.message}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="bg-white border-b p-4">
        <div className="flex justify-around items-center max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {data.products.length}
            </div>
            <div className="text-sm text-gray-600">
              Продукта
            </div>
          </div>
          {data.type === 'personalized' && parseFloat(totalSavings) > 0 && (
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {totalSavings} лв
              </div>
              <div className="text-sm text-gray-600">
                Потенциални спестявания
              </div>
            </div>
          )}
          {data.type !== 'personalized' && (
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                до {TOTAL_MONTHLY_SAVINGS} лв
              </div>
              <div className="text-sm text-gray-600">
                Месечни спестявания
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Products List */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {data.products.map((product, index) => (
          <ProductPriceCard
            key={product.master_product_id}
            product={product}
            rank={index + 1}
            showSavings={data.type === 'personalized'}
          />
        ))}
      </div>

      {/* Call to Action */}
      {data.type !== 'personalized' && (
        <div className="max-w-4xl mx-auto p-4 mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-xl font-semibold mb-2">
              💡 Искаш персонализирани препоръки?
            </p>
            <p className="text-gray-600 mb-4">
              Качи 5+ касови бона, за да видиш ТВОИТЕ спестявания
            </p>
            <button
              onClick={() => router.push('/upload-receipt')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              Качи касов бон
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductPriceCard({ product, rank, showSavings }: any) {
  const [expanded, setExpanded] = useState(false);

  if (!product.prices || product.prices.length === 0) {
    return null;
  }

  const cheapestPrice = product.prices[0].price;
  const mostExpensivePrice = product.prices[product.prices.length - 1].price;
  const priceDiff = mostExpensivePrice - cheapestPrice;
  const savingsPercent = priceDiff > 0
    ? ((priceDiff / mostExpensivePrice) * 100).toFixed(0)
    : '0';

  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden">
      {/* Product Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-start gap-3">
          {/* Rank Badge */}
          <div className="flex-shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
            {rank}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-2">
              {product.normalized_name}
            </h3>

            <div className="flex flex-wrap gap-2 text-sm">
              {product.brand && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {product.brand}
                </span>
              )}
              {product.size && product.unit && (
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                  {product.size}{product.unit}
                </span>
              )}
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                {product.category_name}
              </span>
            </div>

            {/* User purchase info */}
            {showSavings && product.purchase_count && (
              <div className="mt-2 text-sm text-gray-600">
                📊 Купувано {product.purchase_count}× •
                Обикновено плащаш {product.avg_user_paid?.toFixed(2)} лв
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Price Comparison */}
      <div className="p-4">
        {/* Top 3 Stores */}
        <div className="space-y-2">
          {product.prices.slice(0, 3).map((price: any, idx: number) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-3 rounded-lg ${
                idx === 0 ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {idx === 0 && <span className="text-xl">⭐</span>}
                <div>
                  <div className="font-semibold">{price.store}</div>
                  {idx === 0 && (
                    <div className="text-xs text-green-600 font-medium">
                      Най-евтино
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold">
                  {price.price.toFixed(2)} лв
                </div>
                {idx > 0 && (
                  <div className="text-sm text-red-600">
                    +{(price.price - cheapestPrice).toFixed(2)} лв
                    ({(((price.price - cheapestPrice) / cheapestPrice) * 100).toFixed(0)}%)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Expand for more stores */}
        {product.prices.length > 3 && (
          <>
            {expanded && (
              <div className="space-y-2 mt-2">
                {product.prices.slice(3).map((price: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="font-semibold">{price.store}</div>
                    <div className="text-right">
                      <div className="font-bold">{price.price.toFixed(2)} лв</div>
                      <div className="text-sm text-red-600">
                        +{(price.price - cheapestPrice).toFixed(2)} лв
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full mt-3 text-sm text-green-600 font-medium hover:text-green-700"
            >
              {expanded
                ? '▲ По-малко'
                : `▼ Виж още ${product.prices.length - 3} магазина`
              }
            </button>
          </>
        )}

        {/* Savings Highlight */}
        {showSavings && product.potential_savings > 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💡</span>
              <div className="flex-1">
                <div className="font-semibold text-yellow-900">
                  Спести {product.potential_savings.toFixed(2)} лв
                </div>
                <div className="text-sm text-yellow-700">
                  Купувайки от {product.cheapest_store} вместо обичайното място
                </div>
              </div>
            </div>
          </div>
        )}

        {/* General savings */}
        {!showSavings && priceDiff > 0 && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-900">
              💰 Разлика между най-евтино и най-скъпо:
              <span className="font-bold"> {priceDiff.toFixed(2)} лв</span>
              <span className="text-blue-600"> ({savingsPercent}%)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
