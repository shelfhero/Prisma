'use client';

import { useState, useEffect } from 'react';
import { ProductPriceCard, ProductPriceData } from '@/components/product-price-card';
import { ShoppingRecommendations, StoreRecommendation, MultiStoreOptimization } from '@/components/shopping-recommendations';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PriceComparisonPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<ProductPriceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [singleStoreRec, setSingleStoreRec] = useState<StoreRecommendation | null>(null);
  const [multiStoreRec, setMultiStoreRec] = useState<MultiStoreOptimization | null>(null);

  // Load initial data
  useEffect(() => {
    loadProducts();
    loadRecommendations();
  }, []);

  const loadProducts = async (query?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      params.set('limit', '20');

      const response = await fetch(`/api/products/list-with-prices?${params}`);
      const data = await response.json();

      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    // Skip loading recommendations for now - requires user authentication
    // TODO: Implement when user context is available
    return;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts(searchQuery);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Сравнение на цени</h1>
          <p className="text-muted-foreground">
            Открийте най-добрите цени на продукти в различни магазини
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Търсете продукти... (например: мляко верея)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>

        {/* Tabs for different views */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products">Продукти</TabsTrigger>
            <TabsTrigger value="recommendations">Препоръки</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? 'Няма намерени продукти' : 'Заредете продукти'}
              </div>
            ) : (
              <div className="grid gap-4">
                {products.map((product) => (
                  <ProductPriceCard key={product.master_product_id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommendations">
            <ShoppingRecommendations
              singleStore={singleStoreRec || undefined}
              multiStore={multiStoreRec || undefined}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
