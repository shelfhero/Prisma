'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, TrendingDown, Store, MapPin } from 'lucide-react';

export interface StoreRecommendation {
  retailer_id: string;
  retailer_name: string;
  total_price: number;
  estimated_savings: number;
  savings_percentage: number;
  product_count: number;
}

export interface MultiStoreOptimization {
  stores: {
    retailer_name: string;
    products: string[];
    total: number;
  }[];
  total_cost: number;
  total_savings: number;
  single_store_cost: number;
}

interface ShoppingRecommendationsProps {
  singleStore?: StoreRecommendation;
  multiStore?: MultiStoreOptimization;
  productCount?: number;
}

export function ShoppingRecommendations({
  singleStore,
  multiStore,
  productCount = 0,
}: ShoppingRecommendationsProps) {
  if (!singleStore && !multiStore) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Single store recommendation */}
      {singleStore && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              <CardTitle className="text-xl">Препоръка за пазаруване</CardTitle>
            </div>
            <CardDescription>
              Най-изгодният магазин за вашата кошница
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                <div>
                  <h3 className="font-bold text-2xl text-primary">
                    {singleStore.retailer_name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {singleStore.product_count} продукта
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">
                    {singleStore.total_price.toFixed(2)} лв
                  </p>
                </div>
              </div>

              {singleStore.estimated_savings > 0 && (
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <TrendingDown className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-200">
                      Спестете {singleStore.estimated_savings.toFixed(2)} лв (
                      {singleStore.savings_percentage.toFixed(1)}%)
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      В сравнение с най-скъпия магазин
                    </p>
                  </div>
                </div>
              )}

              <Button className="w-full" size="lg">
                <MapPin className="w-4 h-4 mr-2" />
                Намери {singleStore.retailer_name} наблизо
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multi-store optimization */}
      {multiStore && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <CardTitle className="text-xl">Мулти-магазин оптимизация</CardTitle>
            </div>
            <CardDescription>
              Купете от различни магазини за максимални спестявания
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Store breakdown */}
              {multiStore.stores.map((store, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-muted-foreground" />
                      <h4 className="font-semibold">{store.retailer_name}</h4>
                      <Badge variant="secondary">
                        {store.products.length} продукта
                      </Badge>
                    </div>
                    <p className="font-bold">
                      {store.total.toFixed(2)} лв
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground pl-6">
                    {store.products.slice(0, 3).join(', ')}
                    {store.products.length > 3 && ` и още ${store.products.length - 3}...`}
                  </div>
                </div>
              ))}

              {/* Total savings */}
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between text-lg">
                  <span className="font-medium">Обща цена:</span>
                  <span className="font-bold">
                    {multiStore.total_cost.toFixed(2)} лв
                  </span>
                </div>

                {multiStore.total_savings > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                        Спестявате {multiStore.total_savings.toFixed(2)} лв
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Спрямо еднократно пазаруване ({multiStore.single_store_cost.toFixed(2)} лв)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
