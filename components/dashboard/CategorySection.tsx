'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CategorySectionProps, DetailedReceiptItem, StoreGroup } from '@/types/dashboard';
import { ChevronDown, ChevronRight, Store, ShoppingBag, TrendingUp, TrendingDown, Edit, Trash2, Eye } from 'lucide-react';
import ItemTable from './ItemTable';

function formatBulgarianCurrency(amount: number): string {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: 'BGN',
    minimumFractionDigits: 2,
  }).format(amount).replace('BGN', 'лв');
}

function formatBulgarianNumber(num: number): string {
  return new Intl.NumberFormat('bg-BG').format(num);
}

function formatBulgarianDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

interface BudgetProgressProps {
  budgetAmount?: number;
  used: number;
  status: 'good' | 'warning' | 'danger';
}

function BudgetProgress({ budgetAmount, used, status }: BudgetProgressProps) {
  if (!budgetAmount) return null;

  const percentage = (used / budgetAmount) * 100;
  const remaining = budgetAmount - used;

  const statusColors = {
    good: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500'
  };

  const statusLabels = {
    good: '✅ В рамките на бюджета',
    warning: '⚠️ Внимание - близо до лимита',
    danger: '❌ Бюджетът е превишен'
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">Прогрес на бюджета</span>
        <Badge variant={status === 'good' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}>
          {statusLabels[status]}
        </Badge>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${statusColors[status]} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatBulgarianCurrency(used)}</span>
        <span>{percentage.toFixed(1)}%</span>
        <span>{formatBulgarianCurrency(budgetAmount)}</span>
      </div>

      {remaining < 0 ? (
        <p className="text-xs text-red-600 font-medium">
          Превишение с {formatBulgarianCurrency(Math.abs(remaining))}
        </p>
      ) : (
        <p className="text-xs text-green-600">
          Остават {formatBulgarianCurrency(remaining)}
        </p>
      )}
    </div>
  );
}

export default function CategorySection({
  category,
  isExpanded,
  onToggle,
  onItemEdit,
  onItemDelete,
  filters,
  onFiltersChange
}: CategorySectionProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const handleStoreFilter = (storeId: string | null) => {
    setSelectedStoreId(storeId);
    onFiltersChange({ storeFilter: storeId || '' });
  };

  const filteredItems = selectedStoreId
    ? category.category.items.filter(item => item.storeId === selectedStoreId)
    : category.category.items;

  const getCategoryIcon = (categoryName: string): string => {
    switch (categoryName.toLowerCase()) {
      case 'основни храни': return '🍎';
      case 'готови храни': return '🍕';
      case 'напитки': return '🍺';
      case 'закуски': return '🍭';
      case 'нехранителни': return '🧴';
      default: return '📦';
    }
  };

  const getCategoryColor = (categoryName: string): string => {
    switch (categoryName.toLowerCase()) {
      case 'основни храни': return 'bg-green-100 border-green-200 text-green-800';
      case 'готови храни': return 'bg-orange-100 border-orange-200 text-orange-800';
      case 'напитки': return 'bg-blue-100 border-blue-200 text-blue-800';
      case 'закуски': return 'bg-purple-100 border-purple-200 text-purple-800';
      case 'нехранителни': return 'bg-gray-100 border-gray-200 text-gray-800';
      default: return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  const trendIcon = category.spendingTrend === 'up' ?
    <TrendingUp className="w-4 h-4 text-red-500" /> :
    category.spendingTrend === 'down' ?
    <TrendingDown className="w-4 h-4 text-green-500" /> :
    null;

  return (
    <Card className={`overflow-hidden ${getCategoryColor(category.category.name)}`}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full p-6 h-auto justify-between hover:bg-white/50 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">
                  {getCategoryIcon(category.category.name)}
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold">
                    {category.category.name}
                  </h3>
                  <p className="text-sm opacity-80">
                    {formatBulgarianNumber(category.itemCount)} продукта от {category.stores.length} магазина
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {formatBulgarianCurrency(category.totalSpent)}
                  </div>
                  <div className="text-sm opacity-80 flex items-center gap-1">
                    {category.category.percentage.toFixed(1)}% от общо
                    {trendIcon}
                  </div>
                </div>

                {isExpanded ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </div>
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-6 pt-0 bg-white">
            {/* Budget Progress */}
            {category.category.budgetAmount && (
              <div className="mb-6">
                <BudgetProgress
                  budgetAmount={category.category.budgetAmount}
                  used={category.category.budgetUsed}
                  status={category.category.budgetStatus}
                />
              </div>
            )}

            {/* Category Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">Общо продукти</span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {formatBulgarianNumber(category.itemCount)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">Различни магазини</span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {category.stores.length}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-600">Средна цена</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatBulgarianCurrency(category.averageItemPrice)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-600">Най-често от</div>
                <div className="text-lg font-bold text-gray-900 truncate">
                  {category.mostFrequentStore || 'N/A'}
                </div>
              </div>
            </div>

            {/* Store Filter Buttons */}
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                variant={selectedStoreId === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStoreFilter(null)}
              >
                Всички магазини ({formatBulgarianNumber(category.category.items.length)})
              </Button>

              {category.stores.map((store) => (
                <Button
                  key={store.storeId || 'unknown'}
                  variant={selectedStoreId === store.storeId ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStoreFilter(store.storeId)}
                  className="flex items-center gap-1"
                >
                  <Store className="w-3 h-3" />
                  {store.storeName} ({formatBulgarianNumber(store.items.length)})
                </Button>
              ))}
            </div>

            {/* Items Table */}
            <ItemTable
              items={filteredItems}
              loading={false}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSort={(column) => {
                const newOrder = filters.sortBy === column && filters.sortOrder === 'desc' ? 'asc' : 'desc';
                onFiltersChange({ sortBy: column as any, sortOrder: newOrder });
              }}
              onEdit={onItemEdit}
              onDelete={onItemDelete}
              showReceipt={(receiptId) => {
                window.open(`/receipts/${receiptId}`, '_blank');
              }}
            />

            {/* Most Expensive Item Highlight */}
            {category.mostExpensiveItem && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">
                  💰 Най-скъп продукт в категорията:
                </h4>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-yellow-900">
                      {category.mostExpensiveItem.productName}
                    </span>
                    <span className="text-sm text-yellow-700 ml-2">
                      от {category.mostExpensiveItem.storeName}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-yellow-900">
                      {formatBulgarianCurrency(category.mostExpensiveItem.totalPrice)}
                    </div>
                    <div className="text-xs text-yellow-700">
                      {formatBulgarianDate(category.mostExpensiveItem.purchaseDate)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}