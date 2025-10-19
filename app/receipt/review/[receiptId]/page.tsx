'use client';

/**
 * Receipt Review & Categorization Page for Призма
 * Comprehensive receipt review with AI-powered categorization
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { createBrowserClient } from '@/lib/supabase-simple';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import {
  Check,
  X,
  Edit2,
  Trash2,
  Search,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Save,
  XCircle,
  Eye,
  ChevronDown,
  Filter,
  Zap
} from 'lucide-react';

// Types
interface ReceiptItem {
  id: string;
  product_name: string;
  qty: number;
  unit?: string;
  unit_price: number;
  total_price: number;
  category_id?: string;
  category_name?: string;
  category_icon?: string;
  ai_confidence?: number;
  needs_review?: boolean;
  edited?: boolean;
}

interface Receipt {
  id: string;
  retailer_name: string;
  total_amount: number;
  currency: string;
  purchased_at: string;
  image_url?: string;
  status: string;
  ocr_confidence?: number;
  created_at: string;
}

interface CategorySummary {
  id: string;
  name: string;
  icon: string;
  count: number;
  total: number;
  budget?: number;
  remaining?: number;
}

// Category configuration
const CATEGORIES = [
  { id: '6', name: 'Основни храни', icon: '🍎', color: 'green' },
  { id: '7', name: 'Готови храни', icon: '🍕', color: 'orange' },
  { id: '3', name: 'Напитки', icon: '🍺', color: 'blue' },
  { id: '4', name: 'Закуски', icon: '🍭', color: 'purple' },
  { id: '5', name: 'Нехранителни', icon: '🧴', color: 'gray' },
];

function ReceiptReviewContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const receiptId = params.receiptId as string;

  // State
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [originalItems, setOriginalItems] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'uncategorized' | 'issues'>('all');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [budgetData, setBudgetData] = useState<Record<string, any>>({});

  const supabase = createBrowserClient();

  // Fetch receipt and items
  const fetchReceiptData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Get session token first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Не сте влезли в системата');
      }

      // Fetch receipt details
      const response = await fetch(`/api/receipts/${receiptId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Грешка при зареждане на касовия бон');
      }

      const data = await response.json();

      setReceipt({
        id: data.receipt.id,
        retailer_name: data.receipt.retailer_name,
        total_amount: data.receipt.total_amount,
        currency: data.receipt.currency,
        purchased_at: data.receipt.purchased_at,
        image_url: data.receipt.image_url,
        status: data.receipt.processing_status || 'pending',
        ocr_confidence: data.receipt.tabscanner_raw?.confidence || 85,
        created_at: data.receipt.created_at,
      });

      // Transform items with category info
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, icon, color');

      const categoryMap = new Map(categoriesData?.map((cat: any) => [cat.id.toString(), cat]) || []);

      const transformedItems: ReceiptItem[] = data.receipt.items.map((item: any) => {
        const category = item.category_id ? categoryMap.get(item.category_id.toString()) : null;
        return {
          id: item.id.toString(),
          product_name: item.product_name,
          qty: item.quantity || 1,
          unit: item.unit,
          unit_price: item.price / (item.quantity || 1),
          total_price: item.price,
          category_id: item.category_id?.toString(),
          category_name: (category as any)?.name,
          category_icon: (category as any)?.icon,
          needs_review: !item.category_id,
        };
      });

      setItems(transformedItems);
      setOriginalItems(JSON.parse(JSON.stringify(transformedItems)));

      // Fetch budget data for impact preview
      await fetchBudgetData();

    } catch (err) {
      console.error('Error fetching receipt:', err);
      setError(err instanceof Error ? err.message : 'Грешка при зареждане на данните');
    } finally {
      setLoading(false);
    }
  }, [user?.id, receiptId, supabase]);

  // Fetch budget data
  const fetchBudgetData = async () => {
    if (!user?.id) return;

    try {
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

      // Get current budget
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*, budget_lines(*)')
        .eq('user_id', user.id)
        .gte('end_date', startDate.toISOString())
        .lte('start_date', endDate.toISOString())
        .single();

      if (budgetData) {
        const budgetMap: Record<string, any> = {};
        budgetData.budget_lines?.forEach((line: any) => {
          budgetMap[line.category_id.toString()] = {
            budget: line.limit_amount,
            spent: 0, // Will be calculated
          };
        });
        setBudgetData(budgetMap);
      }
    } catch (err) {
      console.warn('Could not fetch budget data:', err);
    }
  };

  useEffect(() => {
    fetchReceiptData();
  }, [fetchReceiptData]);

  // Calculate category summaries
  const categorySummaries = useMemo((): CategorySummary[] => {
    const summaries = new Map<string, CategorySummary>();

    // Initialize with all categories
    CATEGORIES.forEach(cat => {
      summaries.set(cat.id, {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        count: 0,
        total: 0,
        budget: budgetData[cat.id]?.budget,
        remaining: budgetData[cat.id]?.budget,
      });
    });

    // Add uncategorized
    summaries.set('uncategorized', {
      id: 'uncategorized',
      name: 'Некатегоризирано',
      icon: '❓',
      count: 0,
      total: 0,
    });

    // Count items by category
    items.forEach(item => {
      const catId = item.category_id || 'uncategorized';
      const summary = summaries.get(catId);
      if (summary) {
        summary.count++;
        summary.total += item.total_price;
        if (summary.remaining !== undefined) {
          summary.remaining = (summary.budget || 0) - summary.total;
        }
      }
    });

    return Array.from(summaries.values()).filter(s => s.count > 0 || s.id !== 'uncategorized');
  }, [items, budgetData]);

  // Filtered items
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filter mode
    if (filterMode === 'uncategorized') {
      filtered = filtered.filter(item => !item.category_id);
    } else if (filterMode === 'issues') {
      filtered = filtered.filter(item => item.needs_review || !item.category_id);
    }

    return filtered;
  }, [items, searchQuery, filterMode]);

  // Calculate totals
  const calculatedTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  }, [items]);

  const uncategorizedCount = useMemo(() => {
    return items.filter(item => !item.category_id).length;
  }, [items]);

  const issuesCount = useMemo(() => {
    return items.filter(item => item.needs_review).length;
  }, [items]);

  // Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleUpdateItem = (itemId: string, updates: Partial<ReceiptItem>) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, ...updates, edited: true } : item
    ));
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('Сигурни ли сте, че искате да изтриете този продукт?')) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const handleBulkCategorize = (categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;

    setItems(prev => prev.map(item =>
      selectedItems.has(item.id)
        ? {
          ...item,
          category_id: categoryId,
          category_name: category.name,
          category_icon: category.icon,
          needs_review: false,
          edited: true,
        }
        : item
    ));

    setSelectedItems(new Set());
  };

  const handleAICategorize = async () => {
    try {
      setAiProcessing(true);

      const uncategorizedItems = items.filter(item => !item.category_id);

      const response = await fetch('/api/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          items: uncategorizedItems.map(item => ({
            id: item.id,
            name: item.product_name,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('AI категоризацията се провали');
      }

      const { categorizations } = await response.json();

      // Apply AI suggestions
      setItems(prev => prev.map(item => {
        const suggestion = categorizations.find((c: any) => c.item_id === item.id);
        if (suggestion) {
          const category = CATEGORIES.find(c => c.id === suggestion.category_id);
          return {
            ...item,
            category_id: suggestion.category_id,
            category_name: category?.name,
            category_icon: category?.icon,
            ai_confidence: suggestion.confidence,
            needs_review: suggestion.confidence < 0.8,
            edited: true,
          };
        }
        return item;
      }));

    } catch (err) {
      console.error('AI categorization failed:', err);
      alert('AI категоризацията се провали. Моля, опитайте отново.');
    } finally {
      setAiProcessing(false);
    }
  };

  const handleSave = async (asDraft: boolean = false) => {
    try {
      // Validate
      if (!asDraft && uncategorizedCount > 0) {
        const confirm = window.confirm(
          `${uncategorizedCount} продукта не са категоризирани. Желаете ли да продължите?`
        );
        if (!confirm) return;
      }

      // Check total mismatch
      const diff = Math.abs(calculatedTotal - (receipt?.total_amount || 0));
      if (diff > 0.01) {
        const confirm = window.confirm(
          `Сумата на продуктите (${calculatedTotal.toFixed(2)} лв) не съвпада с общата сума на бона (${receipt?.total_amount.toFixed(2)} лв). Желаете ли да продължите?`
        );
        if (!confirm) return;
      }

      setSaving(true);

      // Update items in database
      const updates = items
        .filter(item => item.edited)
        .map(item => ({
          id: parseInt(item.id),
          product_name: item.product_name,
          qty: item.qty,
          total_price: item.total_price,
          category_id: item.category_id ? parseInt(item.category_id) : null,
        }));

      for (const update of updates) {
        await supabase
          .from('items')
          .update({
            product_name: update.product_name,
            qty: update.qty,
            total_price: update.total_price,
            category_id: update.category_id,
          })
          .eq('id', update.id);
      }

      // Update receipt status
      await supabase
        .from('receipts')
        .update({
          status: asDraft ? 'draft' : 'reviewed',
        })
        .eq('id', receiptId);

      // Redirect to success
      router.push(`/receipt/review/${receiptId}/success`);

    } catch (err) {
      console.error('Error saving:', err);
      alert('Грешка при запазване. Моля, опитайте отново.');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} лв`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bg-BG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Зареждане на касов бон...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Грешка</h3>
          <p className="text-gray-600 mb-4">{error || 'Касовият бон не е намерен'}</p>
          <Button onClick={() => router.push('/receipts')}>Към касовите бонове</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* SECTION 1: RECEIPT HEADER */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{receipt.retailer_name}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  receipt.status === 'reviewed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {receipt.status === 'reviewed' ? 'Обработен' : 'Изчаква преглед'}
                </span>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <span>📅 {formatDate(receipt.purchased_at)}</span>
                <span className="font-semibold text-gray-900">
                  💰 {formatCurrency(receipt.total_amount)}
                </span>
              </div>
            </div>

            {receipt.image_url && (
              <button
                onClick={() => setImageModalOpen(true)}
                className="ml-4 relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-300 hover:border-blue-500 transition-colors"
              >
                <Image
                  src={receipt.image_url}
                  alt="Receipt"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 flex items-center justify-center transition-all">
                  <Eye className="w-6 h-6 text-white opacity-0 hover:opacity-100" />
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* SECTION 2: PARSING QUALITY INDICATOR */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div>
                <div className="text-sm text-gray-600 mb-1">Качество на разпознаване</div>
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold text-gray-900">
                    {receipt.ocr_confidence}%
                  </div>
                  {receipt.ocr_confidence >= 90 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
              </div>

              <div className="h-12 w-px bg-gray-200"></div>

              <div>
                <div className="text-sm text-gray-600 mb-1">Продукти</div>
                <div className="text-2xl font-bold text-gray-900">{items.length}</div>
              </div>

              <div className="h-12 w-px bg-gray-200"></div>

              <div>
                <div className="text-sm text-gray-600 mb-1">Изискват внимание</div>
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold text-orange-600">{issuesCount}</div>
                  {issuesCount > 0 && <AlertTriangle className="w-5 h-5 text-orange-500" />}
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              {uncategorizedCount === 0 ? (
                <Button variant="outline" className="border-green-300 text-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Всичко е наред
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="border-orange-300 text-orange-700"
                  onClick={() => setFilterMode('uncategorized')}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Прегледай некатегоризирани ({uncategorizedCount})
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* SECTION 4: SMART CATEGORIZATION TOOLS */}
        <Card className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleAICategorize}
                disabled={aiProcessing || uncategorizedCount === 0}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                {aiProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Обработва се...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Категоризирай с AI
                  </>
                )}
              </Button>

              {selectedItems.size > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {selectedItems.size} избрани
                  </span>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkCategorize(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">Категоризирай като...</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      items.filter(item => selectedItems.has(item.id)).forEach(item => {
                        handleDeleteItem(item.id);
                      });
                      setSelectedItems(new Set());
                    }}
                    className="text-red-600 border-red-300"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Изтрий
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    filterMode === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  Всички
                </button>
                <button
                  onClick={() => setFilterMode('uncategorized')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    filterMode === 'uncategorized'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  Некатегоризирани
                </button>
                <button
                  onClick={() => setFilterMode('issues')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    filterMode === 'issues'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  С проблеми
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Търси продукт..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* SECTION 3: ITEM CATEGORIZATION TABLE */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Продукт
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        К-во
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Цена
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Категория
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50 ${
                          !item.category_id ? 'bg-red-50' :
                          item.needs_review ? 'bg-yellow-50' :
                          item.ai_confidence && item.ai_confidence > 0.8 ? 'bg-green-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {editingItem === item.id ? (
                            <input
                              type="text"
                              value={item.product_name}
                              onChange={(e) => handleUpdateItem(item.id, { product_name: e.target.value })}
                              onBlur={() => setEditingItem(null)}
                              autoFocus
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            <div className="text-sm text-gray-900">{item.product_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => handleUpdateItem(item.id, { qty: parseFloat(e.target.value) || 0 })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            step="0.001"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.total_price.toFixed(2)}
                            onChange={(e) => handleUpdateItem(item.id, { total_price: parseFloat(e.target.value) || 0 })}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            step="0.01"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.category_id || ''}
                            onChange={(e) => {
                              const category = CATEGORIES.find(c => c.id === e.target.value);
                              handleUpdateItem(item.id, {
                                category_id: e.target.value,
                                category_name: category?.name,
                                category_icon: category?.icon,
                                needs_review: false,
                              });
                            }}
                            className={`w-full px-2 py-1 border rounded text-sm ${
                              !item.category_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                          >
                            <option value="">-- Избери --</option>
                            {CATEGORIES.map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => setEditingItem(item.id)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Редактирай"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Изтрий"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-900">
                        Общо:
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {formatCurrency(calculatedTotal)}
                      </td>
                      <td colSpan={2} className="px-4 py-3">
                        {Math.abs(calculatedTotal - receipt.total_amount) > 0.01 && (
                          <div className="text-xs text-red-600 flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Разлика: {formatCurrency(calculatedTotal - receipt.total_amount)}
                          </div>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </div>

          {/* SECTION 5: CATEGORY PREVIEW SUMMARY */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Разпределение</h3>
              <div className="space-y-3">
                {categorySummaries.map((summary) => (
                  <div
                    key={summary.id}
                    className={`p-3 rounded-lg ${
                      summary.id === 'uncategorized' ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{summary.icon}</span>
                        <span className="font-medium text-sm text-gray-900">{summary.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">{summary.count} бр</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(summary.total)}
                      </span>
                      {summary.budget !== undefined && (
                        <span className="text-xs text-gray-600">
                          от {formatCurrency(summary.budget)}
                        </span>
                      )}
                    </div>
                    {summary.remaining !== undefined && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              (summary.total / summary.budget!) > 0.9 ? 'bg-red-500' :
                              (summary.total / summary.budget!) > 0.7 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min((summary.total / summary.budget!) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Остават {formatCurrency(Math.max(0, summary.remaining))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {uncategorizedCount > 0 && (
              <Card className="p-4 bg-yellow-50 border border-yellow-200">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-yellow-900 mb-1">
                      {uncategorizedCount} некатегоризирани продукта
                    </div>
                    <div className="text-sm text-yellow-800">
                      Категоризирайте всички продукти за по-точно проследяване на бюджета
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 6: SAVE & VALIDATION - Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/receipts')}
                disabled={saving}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Отказ
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                Запази чернова
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              {uncategorizedCount > 0 && (
                <div className="text-sm text-orange-600 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {uncategorizedCount} некатегоризирани
                </div>
              )}
              <Button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Запазва се...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Запази и добави към бюджет
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {imageModalOpen && receipt.image_url && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <button
              onClick={() => setImageModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative w-full h-full">
              <Image
                src={receipt.image_url}
                alt="Receipt"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main page component
export default function ReceiptReviewPage() {
  return (
    <ProtectedRoute>
      <ReceiptReviewContent />
    </ProtectedRoute>
  );
}
