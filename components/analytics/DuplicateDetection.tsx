'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DuplicateItemGroup, DuplicateItem } from '@/types/analytics';
import { AlertTriangle, Eye, Trash2, GitMerge, X, Check } from 'lucide-react';

interface DuplicateDetectionProps {
  data: DuplicateItemGroup[];
  loading?: boolean;
  onMergeItems?: (groupId: string, keepItemId: string, removeItemIds: string[]) => Promise<void>;
  onKeepAll?: (groupId: string) => Promise<void>;
  onRemoveItem?: (itemId: string) => Promise<void>;
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

function getSimilarityColor(score: number): string {
  if (score >= 0.9) return 'bg-red-100 text-red-800';
  if (score >= 0.7) return 'bg-yellow-100 text-yellow-800';
  return 'bg-blue-100 text-blue-800';
}

function getReasonIcon(type: string): string {
  switch (type) {
    case 'exact_name': return '📝';
    case 'similar_name': return '🔤';
    case 'same_barcode': return '📊';
    case 'same_store_same_day': return '🏪';
    case 'price_similarity': return '💰';
    default: return '❓';
  }
}

function getReasonLabel(type: string): string {
  switch (type) {
    case 'exact_name': return 'Точно име';
    case 'similar_name': return 'Подобно име';
    case 'same_barcode': return 'Еднакъв баркод';
    case 'same_store_same_day': return 'Същия ден, същия магазин';
    case 'price_similarity': return 'Подобна цена';
    default: return type;
  }
}

interface DuplicateGroupCardProps {
  group: DuplicateItemGroup;
  onMerge?: (keepItemId: string, removeItemIds: string[]) => Promise<void>;
  onKeepAll?: () => Promise<void>;
  onRemoveItem?: (itemId: string) => Promise<void>;
}

function DuplicateGroupCard({ group, onMerge, onKeepAll, onRemoveItem }: DuplicateGroupCardProps) {
  const [selectedKeepItem, setSelectedKeepItem] = useState<string | null>(null);
  const [selectedRemoveItems, setSelectedRemoveItems] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleSelectKeepItem = (itemId: string) => {
    setSelectedKeepItem(itemId);
    // Remove from remove list if it was selected
    const newRemoveItems = new Set(selectedRemoveItems);
    newRemoveItems.delete(itemId);
    setSelectedRemoveItems(newRemoveItems);
  };

  const handleToggleRemoveItem = (itemId: string) => {
    const newRemoveItems = new Set(selectedRemoveItems);
    if (newRemoveItems.has(itemId)) {
      newRemoveItems.delete(itemId);
    } else {
      newRemoveItems.add(itemId);
      // Remove from keep selection if it was selected
      if (selectedKeepItem === itemId) {
        setSelectedKeepItem(null);
      }
    }
    setSelectedRemoveItems(newRemoveItems);
  };

  const handleMerge = async () => {
    if (!selectedKeepItem || selectedRemoveItems.size === 0 || !onMerge) return;

    setProcessing(true);
    try {
      await onMerge(selectedKeepItem, Array.from(selectedRemoveItems));
    } finally {
      setProcessing(false);
    }
  };

  const handleKeepAll = async () => {
    if (!onKeepAll) return;

    setProcessing(true);
    try {
      await onKeepAll();
    } finally {
      setProcessing(false);
    }
  };

  const totalValue = group.items.reduce((sum, item) => sum + item.price, 0);
  const avgPrice = totalValue / group.items.length;
  const priceVariation = Math.max(...group.items.map(i => i.price)) - Math.min(...group.items.map(i => i.price));

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {group.productName}
              </h3>
              <div className="flex items-center gap-2">
                <Badge className={getSimilarityColor(group.similarityScore)}>
                  {(group.similarityScore * 100).toFixed(0)}% сходство
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {group.potentialDuplicates} възможни дубликата
                </Badge>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">
              {formatBulgarianCurrency(totalValue)}
            </div>
            <div className="text-sm text-gray-500">
              {group.items.length} записа
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Средна цена:</span>
            <div className="font-medium">{formatBulgarianCurrency(avgPrice)}</div>
          </div>
          <div>
            <span className="text-gray-500">Ценова разлика:</span>
            <div className="font-medium">{formatBulgarianCurrency(priceVariation)}</div>
          </div>
          <div>
            <span className="text-gray-500">Препоръка:</span>
            <div className="font-medium">
              {group.recommendedAction === 'merge' ? '🔀 Обедини' :
               group.recommendedAction === 'keep_all' ? '✅ Запази всички' :
               '👀 Прегледай ръчно'}
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="p-4">
        <div className="space-y-3">
          {group.items.map((item, index) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border transition-all ${
                selectedKeepItem === item.id ? 'border-green-300 bg-green-50' :
                selectedRemoveItems.has(item.id) ? 'border-red-300 bg-red-50' :
                'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {item.productName}
                    </span>
                    {index === 0 && <Badge variant="secondary" className="text-xs">Оригинал</Badge>}
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <div>📍 {item.storeName} • 📅 {formatBulgarianDate(item.purchaseDate)}</div>
                    <div>💰 {formatBulgarianCurrency(item.price)} • 📦 {item.quantity} бр.</div>
                  </div>

                  {/* Duplicate Reasons */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.reasons.map((reason, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {getReasonIcon(reason.type)} {getReasonLabel(reason.type)}
                        <span className="ml-1 text-gray-500">
                          ({(reason.confidence * 100).toFixed(0)}%)
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 ml-3">
                  <Button
                    size="sm"
                    variant={selectedKeepItem === item.id ? "default" : "outline"}
                    onClick={() => handleSelectKeepItem(item.id)}
                    disabled={processing}
                    className="text-xs"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Запази
                  </Button>

                  <Button
                    size="sm"
                    variant={selectedRemoveItems.has(item.id) ? "destructive" : "outline"}
                    onClick={() => handleToggleRemoveItem(item.id)}
                    disabled={processing}
                    className="text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Премахни
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(`/receipts/${item.receiptId}`, '_blank')}
                    className="text-xs"
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedKeepItem && selectedRemoveItems.size > 0 && (
              <span>Ще запази 1 запис и премахне {selectedRemoveItems.size} записа</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleKeepAll}
              disabled={processing}
            >
              <Check className="w-4 h-4 mr-2" />
              Запази всички
            </Button>

            <Button
              size="sm"
              onClick={handleMerge}
              disabled={!selectedKeepItem || selectedRemoveItems.size === 0 || processing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <GitMerge className="w-4 h-4 mr-2" />
              {processing ? 'Обработва...' : `Обедини (${selectedRemoveItems.size})`}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function DuplicateDetection({
  data,
  loading = false,
  onMergeItems,
  onKeepAll,
  onRemoveItem
}: DuplicateDetectionProps) {
  const [processedGroups, setProcessedGroups] = useState<Set<string>>(new Set());

  const handleMergeGroup = async (groupId: string, keepItemId: string, removeItemIds: string[]) => {
    if (onMergeItems) {
      await onMergeItems(groupId, keepItemId, removeItemIds);
      const newProcessed = new Set(processedGroups);
      newProcessed.add(groupId);
      setProcessedGroups(newProcessed);
    }
  };

  const handleKeepAllGroup = async (groupId: string) => {
    if (onKeepAll) {
      await onKeepAll(groupId);
      const newProcessed = new Set(processedGroups);
      newProcessed.add(groupId);
      setProcessedGroups(newProcessed);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const activeGroups = data.filter(group => !processedGroups.has(group.groupId));
  const totalDuplicates = data.reduce((sum, group) => sum + group.potentialDuplicates, 0);
  const potentialSavings = data.reduce((sum, group) => {
    const maxPrice = Math.max(...group.items.map(i => i.price));
    const minPrice = Math.min(...group.items.map(i => i.price));
    return sum + (maxPrice - minPrice) * group.potentialDuplicates;
  }, 0);

  if (!data.length) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            🎉 Няма открити дубликати!
          </h3>
          <p className="text-gray-500">
            Всички ваши записи изглеждат уникални. Продължавайте така!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🔍 Откриване на дубликати
            </h3>
            <p className="text-sm text-gray-600">
              Автоматично откриване на възможни дублирани записи за почистване
            </p>
          </div>
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            {totalDuplicates} възможни дубликата
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-sm font-medium text-red-700 mb-1">Открити групи</div>
            <div className="text-2xl font-bold text-red-900">{data.length}</div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-sm font-medium text-orange-700 mb-1">Общо дубликати</div>
            <div className="text-2xl font-bold text-orange-900">{totalDuplicates}</div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm font-medium text-green-700 mb-1">Потенциални спестявания</div>
            <div className="text-2xl font-bold text-green-900">
              {formatBulgarianCurrency(potentialSavings)}
            </div>
          </div>
        </div>

        {totalDuplicates > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 mt-0.5">💡</div>
              <div>
                <div className="text-sm font-medium text-blue-900 mb-1">
                  Препоръки за почистване:
                </div>
                <div className="text-xs text-blue-700">
                  Прегледайте всяка grupa внимателно. Обединете записите, които са същият продукт,
                  или ги запазете отделно, ако са различни покупки.
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Duplicate Groups */}
      <div className="space-y-4">
        {activeGroups.map((group) => (
          <DuplicateGroupCard
            key={group.groupId}
            group={group}
            onMerge={(keepItemId, removeItemIds) => handleMergeGroup(group.groupId, keepItemId, removeItemIds)}
            onKeepAll={() => handleKeepAllGroup(group.groupId)}
            onRemoveItem={onRemoveItem}
          />
        ))}
      </div>

      {processedGroups.size > 0 && (
        <Card className="p-4">
          <div className="text-center text-sm text-gray-500">
            ✅ Обработени {processedGroups.size} групи дубликати
          </div>
        </Card>
      )}
    </div>
  );
}