'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, Store, TrendingDown } from 'lucide-react';

export interface RetailerPrice {
  retailer_id: string;
  retailer_name: string;
  unit_price: number;
  last_seen: string;
  is_cheapest: boolean;
  savings_vs_cheapest?: number;
}

export interface ProductPriceData {
  master_product_id: number;
  normalized_name: string;
  display_name?: string;
  brand?: string;
  size?: number;
  unit?: string;
  prices: RetailerPrice[];
  cheapest_price: number;
  cheapest_retailer: string;
  avg_price: number;
  max_savings: number;
  price_trend?: 'up' | 'down' | 'stable';
  trend_percentage?: number;
}

interface ProductPriceCardProps {
  product: ProductPriceData;
}

export function ProductPriceCard({ product }: ProductPriceCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{product.display_name || product.normalized_name}</h3>
            {product.brand && (
              <p className="text-sm text-muted-foreground mt-1">
                {product.brand}
                {product.size && product.unit && ` • ${product.size} ${product.unit}`}
              </p>
            )}
          </div>

          {product.price_trend && product.price_trend !== 'stable' && (
            <Badge
              variant={product.price_trend === 'down' ? 'default' : 'destructive'}
              className="ml-2"
            >
              {product.price_trend === 'down' ? (
                <ArrowDown className="w-3 h-3 mr-1" />
              ) : (
                <ArrowUp className="w-3 h-3 mr-1" />
              )}
              {product.trend_percentage?.toFixed(1)}%
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Price list */}
        <div className="space-y-2">
          {product.prices
            .sort((a, b) => a.unit_price - b.unit_price)
            .map((price) => (
              <div
                key={price.retailer_id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  price.is_cheapest
                    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                    : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{price.retailer_name}</span>
                  {price.is_cheapest && (
                    <Badge variant="default" className="text-xs">
                      Най-евтино
                    </Badge>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-bold text-lg">
                    {price.unit_price.toFixed(2)} лв
                  </p>
                  {!price.is_cheapest && price.savings_vs_cheapest && (
                    <p className="text-xs text-muted-foreground">
                      +{price.savings_vs_cheapest.toFixed(2)} лв
                    </p>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Savings summary */}
        {product.max_savings > 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Спести <span className="font-bold">{product.max_savings.toFixed(2)} лв</span>,
              купувайки от {product.cheapest_retailer}
            </p>
          </div>
        )}

        {/* Average price info */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Средна цена: {product.avg_price.toFixed(2)} лв
        </div>
      </CardContent>
    </Card>
  );
}
