'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  ChevronDown,
  ChevronUp,
  Save,
  RefreshCw,
  Edit3,
  Check,
  X,
  Calendar,
  MapPin,
  Receipt,
  AlertCircle,
  TrendingUp,
  ShoppingCart,
  ArrowLeft,
  Home,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import ReceiptReviewGuide from '@/components/review/ReceiptReviewGuide';

// Bulgarian budget categories
const BUDGET_CATEGORIES = {
  'basic_food': {
    label: '🍎 Основни храни',
    color: 'bg-green-100 text-green-800',
    description: 'Хляб, мляко, месо, зеленчуци, плодове'
  },
  'prepared_food': {
    label: '🍕 Готови храни',
    color: 'bg-orange-100 text-orange-800',
    description: 'Готови ястия, замразени храни, деликатеси'
  },
  'beverages': {
    label: '🍺 Напитки',
    color: 'bg-blue-100 text-blue-800',
    description: 'Води, сокове, алкохол, кафе, чай'
  },
  'snacks': {
    label: '🍭 Закуски',
    color: 'bg-purple-100 text-purple-800',
    description: 'Бонбони, чипс, бисквити, сладкиши'
  },
  'non_food': {
    label: '🧴 Нехранителни',
    color: 'bg-gray-100 text-gray-800',
    description: 'Козметика, битова химия, аптечни продукти'
  }
} as const;

type CategoryKey = keyof typeof BUDGET_CATEGORIES;

interface ReceiptItem {
  id: string;
  product_name: string;
  unit_price: number;
  qty: number;
  total_price: number;
  category_id?: string;
  confidence?: number;
  suggested_category?: CategoryKey;
}

interface Receipt {
  id: string;
  retailer_id: string;
  retailer?: {
    name: string;
    logo_url?: string;
  };
  total_amount: number;
  currency: string;
  purchased_at: string;
  location?: string;
  tabscanner_raw?: {
    raw_text?: string;
    confidence?: number;
    extraction?: any;
  };
  items: ReceiptItem[];
}

interface EditableItem extends ReceiptItem {
  isEditing: boolean;
  editedName: string;
  editedPrice: number;
  editedQuantity: number;
  selectedCategory: CategoryKey | '';
}

export default function ReviewReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = params.receiptId as string;

  // State
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<CategoryKey | ''>('');
  const [showConfidenceScores, setShowConfidenceScores] = useState(false);

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Load receipt data
  useEffect(() => {
    async function loadReceipt() {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          router.push('/auth/login');
          return;
        }

        const response = await fetch(`/api/receipts/${receiptId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/auth/login');
            return;
          }
          throw new Error('Failed to load receipt');
        }

        const data = await response.json();
        setReceipt(data);

        // Convert items to editable format with auto-suggestions
        const editableItems: EditableItem[] = data.items.map((item: ReceiptItem) => ({
          ...item,
          isEditing: false,
          editedName: item.product_name,
          editedPrice: item.unit_price,
          editedQuantity: item.qty,
          selectedCategory: item.suggested_category || suggestCategory(item.product_name),
        }));

        setItems(editableItems);
      } catch (error) {
        console.error('Error loading receipt:', error);
        toast.error('Грешка при зареждане на касовата бележка');
      } finally {
        setLoading(false);
      }
    }

    if (receiptId) {
      loadReceipt();
    }
  }, [receiptId]);

  // Auto-suggest category based on product name
  function suggestCategory(productName: string): CategoryKey {
    const name = productName.toLowerCase();

    // Basic food keywords
    if (name.includes('хляб') || name.includes('мляко') || name.includes('сирене') ||
        name.includes('месо') || name.includes('яйца') || name.includes('ориз') ||
        name.includes('картоф') || name.includes('домат') || name.includes('лук') ||
        name.includes('ябълк') || name.includes('банан')) {
      return 'basic_food';
    }

    // Beverages
    if (name.includes('вода') || name.includes('сок') || name.includes('бира') ||
        name.includes('вино') || name.includes('кафе') || name.includes('чай') ||
        name.includes('кола') || name.includes('фанта')) {
      return 'beverages';
    }

    // Snacks
    if (name.includes('бонбон') || name.includes('чипс') || name.includes('бисквит') ||
        name.includes('шоколад') || name.includes('сладк') || name.includes('торт')) {
      return 'snacks';
    }

    // Non-food
    if (name.includes('сапун') || name.includes('шампоан') || name.includes('паста') ||
        name.includes('препарат') || name.includes('почист') || name.includes('хартия')) {
      return 'non_food';
    }

    // Prepared food as default fallback
    return 'prepared_food';
  }

  // Calculate category totals
  const categoryTotals = useMemo(() => {
    const totals: Record<CategoryKey, number> = {
      basic_food: 0,
      prepared_food: 0,
      beverages: 0,
      snacks: 0,
      non_food: 0
    };

    items.forEach(item => {
      if (item.selectedCategory && item.selectedCategory in totals) {
        totals[item.selectedCategory] += item.editedPrice * item.editedQuantity;
      }
    });

    return totals;
  }, [items]);

  // Handle item editing
  function toggleEdit(itemId: string) {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, isEditing: !item.isEditing }
        : item
    ));
  }

  function updateItem(itemId: string, field: keyof EditableItem, value: any) {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, [field]: value }
        : item
    ));
  }

  function saveItemEdit(itemId: string) {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? {
            ...item,
            isEditing: false,
            product_name: item.editedName,
            unit_price: item.editedPrice,
            qty: item.editedQuantity,
            total_price: item.editedPrice * item.editedQuantity
          }
        : item
    ));
    toast.success('Продуктът е обновен');
  }

  function cancelItemEdit(itemId: string) {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? {
            ...item,
            isEditing: false,
            editedName: item.product_name,
            editedPrice: item.unit_price,
            editedQuantity: item.qty
          }
        : item
    ));
  }

  // Apply bulk category
  function applyBulkCategory() {
    if (!bulkCategory) return;

    setItems(prev => prev.map(item => ({ ...item, selectedCategory: bulkCategory })));
    toast.success(`Всички продукти са категоризирани като ${BUDGET_CATEGORIES[bulkCategory].label}`);
    setBulkCategory('');
  }

  // Auto-categorize based on suggestions
  function autoCategorizeSuggestions() {
    setItems(prev => prev.map(item => ({
      ...item,
      selectedCategory: item.suggested_category || suggestCategory(item.product_name)
    })));
    toast.success('Автоматично категоризиране завършено');
  }

  // Save to budget
  async function saveToBudget() {
    setSaving(true);
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/auth/login');
        return;
      }

      const updateData = {
        items: items.map(item => ({
          id: item.id,
          product_name: item.product_name,
          unit_price: item.unit_price,
          qty: item.qty,
          total_price: item.total_price,
          category_key: item.selectedCategory
        }))
      };

      const response = await fetch(`/api/receipts/${receiptId}/categorize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to save categorization');
      }

      const result = await response.json();
      toast.success(result.message || 'Касовата бележка е запазена в бюджета!');

      // Redirect to dashboard with success message
      router.push('/dashboard?categorized=true');
    } catch (error) {
      console.error('Error saving to budget:', error);
      toast.error('Грешка при запазване в бюджета');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Зареждане на касовата бележка...</span>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center p-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Касовата бележка не е намерена</h2>
            <p className="text-gray-600 mb-4">Възможно е да е изтрита или да няmate достъп до нея.</p>
            <Button onClick={() => router.push('/dashboard')}>
              Назад към табло
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Navigation Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </Button>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Home className="w-4 h-4" />
              <span>/</span>
              <span>Табло</span>
              <span>/</span>
              <span>Преглед на бележка</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              ID: {receiptId.slice(-8)}
            </Badge>
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">📝 Преглед на касова бележка</h1>
        <p className="text-gray-600">Прегледайте и категоризирайте покупките си</p>
      </div>

      {/* Guide Component */}
      <ReceiptReviewGuide />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Receipt Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Информация за бележката
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Магазин</Label>
                  <p className="text-lg font-semibold">{receipt.retailer?.name || 'Неизвестен магазин'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Обща сума</Label>
                  <p className="text-lg font-semibold text-green-600">
                    {receipt.total_amount.toFixed(2)} {receipt.currency}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Дата</Label>
                  <p className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(receipt.purchased_at).toLocaleDateString('bg-BG')}
                  </p>
                </div>
                {receipt.location && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Локация</Label>
                    <p className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {receipt.location}
                    </p>
                  </div>
                )}
              </div>

              {/* OCR Quality Info */}
              {receipt.tabscanner_raw?.confidence && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant={receipt.tabscanner_raw.confidence > 80 ? 'default' : 'secondary'}>
                    OCR Качество: {receipt.tabscanner_raw.confidence}%
                  </Badge>
                  <Switch
                    checked={showConfidenceScores}
                    onCheckedChange={setShowConfidenceScores}
                  />
                  <Label className="text-sm">Покажи увереност</Label>
                </div>
              )}

              {/* Raw OCR Text (Collapsible) */}
              {receipt.tabscanner_raw?.raw_text && (
                <Collapsible open={showRawText} onOpenChange={setShowRawText}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span>🔍 OCR текст (за отстраняване на грешки)</span>
                      {showRawText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Textarea
                      value={receipt.tabscanner_raw.raw_text}
                      readOnly
                      className="mt-2 font-mono text-xs"
                      rows={8}
                    />
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>

          {/* Bulk Operations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Групови операции
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Select value={bulkCategory} onValueChange={(value: CategoryKey | '') => setBulkCategory(value)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Избери категория" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BUDGET_CATEGORIES).map(([key, category]) => (
                        <SelectItem key={key} value={key}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={applyBulkCategory}
                    disabled={!bulkCategory}
                    size="sm"
                  >
                    Приложи към всички
                  </Button>
                </div>
                <Button
                  onClick={autoCategorizeSuggestions}
                  variant="outline"
                  size="sm"
                >
                  🤖 Автоматично категоризиране
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Items List */}
          <Card>
            <CardHeader>
              <CardTitle>Продукти ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Product Name */}
                      <div className="md:col-span-4">
                        {item.isEditing ? (
                          <Input
                            value={item.editedName}
                            onChange={(e) => updateItem(item.id, 'editedName', e.target.value)}
                            className="font-medium"
                          />
                        ) : (
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            {showConfidenceScores && item.confidence && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {Math.round(item.confidence * 100)}% увереност
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Price and Quantity */}
                      <div className="md:col-span-3">
                        {item.isEditing ? (
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.editedPrice}
                              onChange={(e) => updateItem(item.id, 'editedPrice', parseFloat(e.target.value) || 0)}
                              className="w-20"
                            />
                            <span className="self-center">×</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.editedQuantity}
                              onChange={(e) => updateItem(item.id, 'editedQuantity', parseFloat(e.target.value) || 0)}
                              className="w-16"
                            />
                          </div>
                        ) : (
                          <p className="text-sm">
                            {item.unit_price.toFixed(2)} лв × {item.qty} =
                            <span className="font-semibold ml-1">{item.total_price.toFixed(2)} лв</span>
                          </p>
                        )}
                      </div>

                      {/* Category */}
                      <div className="md:col-span-3">
                        <Select
                          value={item.selectedCategory}
                          onValueChange={(value: CategoryKey) => updateItem(item.id, 'selectedCategory', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Категория" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(BUDGET_CATEGORIES).map(([key, category]) => (
                              <SelectItem key={key} value={key}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Actions */}
                      <div className="md:col-span-2 flex gap-2">
                        {item.isEditing ? (
                          <>
                            <Button size="sm" onClick={() => saveItemEdit(item.id)}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => cancelItemEdit(item.id)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => toggleEdit(item.id)}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Category Totals */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Категории и сумиране
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(BUDGET_CATEGORIES).map(([key, category]) => {
                const total = categoryTotals[key as CategoryKey];
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{category.label}</span>
                      <span className="font-semibold">{total.toFixed(2)} лв</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${category.color.split(' ')[0]}`}
                        style={{
                          width: `${receipt.total_amount > 0 ? (total / receipt.total_amount) * 100 : 0}%`
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">{category.description}</p>
                  </div>
                );
              })}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between items-center font-semibold">
                  <span>Общо категоризирано:</span>
                  <span>{Object.values(categoryTotals).reduce((a, b) => a + b, 0).toFixed(2)} лв</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Обща сума от бележката:</span>
                  <span>{receipt.total_amount.toFixed(2)} лв</span>
                </div>
                {Math.abs(Object.values(categoryTotals).reduce((a, b) => a + b, 0) - receipt.total_amount) > 0.01 && (
                  <div className="flex justify-between items-center text-sm text-orange-600">
                    <span>Разлика:</span>
                    <span>
                      {(receipt.total_amount - Object.values(categoryTotals).reduce((a, b) => a + b, 0)).toFixed(2)} лв
                    </span>
                  </div>
                )}
              </div>

              <Button
                onClick={saveToBudget}
                disabled={saving}
                className="w-full"
                size="lg"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Запазване...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Запази в бюджета
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 Съвети</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Използвайте автоматичното категоризиране за бърз старт</p>
              <p>• Редактирайте неправилно разпознати продукти</p>
              <p>• Проверете дали сумите се сверяват</p>
              <p>• Категоризирайте всички продукти преди запазване</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}