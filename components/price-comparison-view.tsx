'use client';

import { useState, useEffect } from 'react';
import { PriceComparisonResponse, ProductSearchResult } from '@/types/normalization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, TrendingDown, TrendingUp, Minus, Store, Tag } from 'lucide-react';

interface PriceComparisonViewProps {
  productId?: number;
  productName?: string;
}

export function PriceComparisonView({ productId, productName }: PriceComparisonViewProps) {
  const [searchQuery, setSearchQuery] = useState(productName || '');
  const [comparison, setComparison] = useState<PriceComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      fetchComparison(productId);
    }
  }, [productId]);

  const fetchComparison = async (id?: number, name?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (id) params.set('product_id', id.toString());
      if (name) params.set('name', name);

      const response = await fetch(`/api/products/compare?${params}`);
      if (!response.ok) throw new Error('Failed to fetch comparison');

      const data = await response.json();
      setComparison(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      fetchComparison(undefined, searchQuery);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Зареждане на сравнение...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Грешка: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Section */}
      {!productId && (
        <Card>
          <CardHeader>
            <CardTitle>Сравнение на цени</CardTitle>
            <CardDescription>
              Търсете продукт и вижте цените в различни магазини
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Търси продукт..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" />
                Търси
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Results */}
      {comparison && (
        <>
          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                {comparison.product.normalized_name}
              </CardTitle>
              <CardDescription>
                {comparison.product.brand && (
                  <span className="mr-4">Марка: {comparison.product.brand}</span>
                )}
                {comparison.product.size && (
                  <span>
                    Размер: {comparison.product.size}
                    {comparison.product.unit}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Price Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Минимална цена</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {comparison.statistics.min_price.toFixed(2)} лв
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Средна цена</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comparison.statistics.avg_price.toFixed(2)} лв
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Максимална цена</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {comparison.statistics.max_price.toFixed(2)} лв
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Разлика</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {comparison.statistics.price_range.toFixed(2)} лв
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Price Comparison by Retailer */}
          <Card>
            <CardHeader>
              <CardTitle>Цени по магазини</CardTitle>
              <CardDescription>
                Сравнение в {comparison.statistics.total_retailers} магазина
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {comparison.prices
                  .sort((a, b) => a.current_price - b.current_price)
                  .map((price, index) => (
                    <div
                      key={price.retailer.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        price.is_best_price
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Store className="w-5 h-5 text-gray-500" />
                          <div>
                            <div className="font-semibold">{price.retailer.name}</div>
                            {price.location && (
                              <div className="text-xs text-gray-500">{price.location}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {price.savings_percent !== null && price.savings_percent !== 0 && (
                          <div className="flex items-center gap-1">
                            {price.savings_percent > 0 ? (
                              <>
                                <TrendingDown className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-green-600 font-medium">
                                  -{Math.abs(price.savings_percent).toFixed(1)}%
                                </span>
                              </>
                            ) : (
                              <>
                                <TrendingUp className="w-4 h-4 text-red-600" />
                                <span className="text-sm text-red-600 font-medium">
                                  +{Math.abs(price.savings_percent).toFixed(1)}%
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        <div className="text-right">
                          <div className="text-xl font-bold">
                            {price.current_price.toFixed(2)} лв
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(price.last_seen).toLocaleDateString('bg-BG')}
                          </div>
                        </div>

                        {price.is_best_price && (
                          <Badge className="bg-green-600">Най-ниска</Badge>
                        )}
                        {price.rank === 1 && !price.is_best_price && (
                          <Badge variant="outline">#{price.rank}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Savings Insight */}
          {comparison.statistics.price_range > 0.5 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">💡</div>
                  <div>
                    <div className="font-semibold text-blue-900 mb-1">
                      Можете да спестите до{' '}
                      {comparison.statistics.price_range.toFixed(2)} лв
                    </div>
                    <div className="text-sm text-blue-700">
                      Като пазарувате от {comparison.prices[0].retailer.name} вместо от{' '}
                      {comparison.prices[comparison.prices.length - 1].retailer.name}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
