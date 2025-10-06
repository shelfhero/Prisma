'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-simple';

interface ReceiptItem {
  id: string;
  product_name: string;
  price: number;
  quantity: number;
  category_id?: string;
  category_name?: string;
  category_confidence?: number;
  category_method?: string;
}

interface Receipt {
  id: string;
  retailer_name: string;
  total_amount: number;
  currency: string;
  purchased_at: string;
  image_url?: string;
  items: ReceiptItem[];
}

export default function VerifyReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = params.receiptId as string;

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editData, setEditData] = useState<{name: string, price: number, quantity: number}>({
    name: '', price: 0, quantity: 1
  });

  const supabase = createBrowserClient();

  useEffect(() => {
    fetchReceiptData();
  }, [receiptId]);

  const fetchReceiptData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Моля, влезте в профила си');
        return;
      }

      console.log('Fetching receipt:', receiptId);

      const response = await fetch(`/api/receipts/${receiptId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('API error:', errorData);
        throw new Error(errorData.error || 'Грешка при зареждане');
      }

      const data = await response.json();
      console.log('Receipt data received:', data);

      setReceipt(data.receipt);
    } catch (err) {
      console.error('Error fetching receipt:', err);
      setError(err instanceof Error ? err.message : 'Грешка при зареждане на касовата бележка');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (index: number) => {
    if (!receipt) return;
    const item = receipt.items[index];
    setEditingItem(index);
    setEditData({
      name: item.product_name,
      price: item.price,
      quantity: item.quantity
    });
  };

  const saveEdit = () => {
    if (editingItem !== null && receipt) {
      const newItems = [...receipt.items];
      newItems[editingItem] = {
        ...newItems[editingItem],
        product_name: editData.name,
        price: editData.price,
        quantity: editData.quantity
      };

      const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      setReceipt({
        ...receipt,
        items: newItems,
        total_amount: newTotal
      });

      setEditingItem(null);
    }
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditData({ name: '', price: 0, quantity: 1 });
  };

  const confirmReceipt = async () => {
    try {
      setSaving(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Моля, влезте в профила си');
        setSaving(false);
        return;
      }

      // Call the confirm API with edited receipt data
      const response = await fetch(`/api/receipts/${receiptId}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: receipt?.items,
          totalAmount: receipt?.total_amount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Грешка при потвърждаване');
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Error confirming receipt:', err);
      setError(err instanceof Error ? err.message : 'Грешка при потвърждаване на касовата бележка');
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toFixed(2)} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bg-BG');
  };

  const getCategoryDisplay = (categoryId?: string, categoryName?: string) => {
    const categories: Record<string, { icon: string; color: string }> = {
      basic_foods: { icon: '🍎', color: 'bg-green-100 text-green-800' },
      ready_meals: { icon: '🍕', color: 'bg-orange-100 text-orange-800' },
      snacks: { icon: '🍿', color: 'bg-yellow-100 text-yellow-800' },
      drinks: { icon: '🥤', color: 'bg-blue-100 text-blue-800' },
      household: { icon: '🧹', color: 'bg-purple-100 text-purple-800' },
      personal_care: { icon: '🧴', color: 'bg-pink-100 text-pink-800' },
      other: { icon: '📦', color: 'bg-gray-100 text-gray-800' },
    };

    const cat = categories[categoryId || 'other'] || categories.other;
    return {
      icon: cat.icon,
      name: categoryName || 'Други',
      color: cat.color,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Зареждане на касовата бележка...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4">{error || 'Касовата бележка не беше намерена'}</h1>
          <button
            onClick={() => router.push('/receipts')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Назад към бележките
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Проверете касовата бележка
          </h1>
          <p className="text-gray-600">
            Прегледайте разпознатите данни и направете корекции при необходимост
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Receipt Image - Large */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Оригинална касова бележка</h2>
              <div className="text-sm text-gray-600 mb-4">
                {receipt.retailer_name} • {formatDate(receipt.purchased_at)}
              </div>

              {receipt.image_url ? (
                <div className="relative">
                  <img
                    src={receipt.image_url}
                    alt="Касова бележка"
                    className="w-full h-auto max-h-[800px] object-contain rounded-lg border shadow-sm"
                  />
                  <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm font-medium">
                    🔍 Оригинал
                  </div>

                  {/* Image overlay with recognized data summary */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg p-4 border shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{receipt.retailer_name}</h4>
                        <p className="text-sm text-gray-600">{receipt.items.length} продукта</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(receipt.total_amount, receipt.currency)}
                        </div>
                        <p className="text-xs text-gray-500">Обща сума</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative bg-gray-100 rounded-lg p-8 min-h-[600px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-300 rounded-lg flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-700">Касова бележка от {receipt.retailer_name}</p>
                    <p className="text-gray-500">Изображението се зарежда...</p>
                  </div>

                  {/* Overlay with summary even without image */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg p-4 border shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{receipt.retailer_name}</h4>
                        <p className="text-sm text-gray-600">{receipt.items.length} продукта</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(receipt.total_amount, receipt.currency)}
                        </div>
                        <p className="text-xs text-gray-500">Обща сума</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Receipt Data - Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Store Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Информация за магазина</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Магазин:</strong> {receipt.retailer_name}</div>
                <div><strong>Дата:</strong> {formatDate(receipt.purchased_at)}</div>
                <div><strong>ID на бележката:</strong> {receiptId}</div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">
                Продукти ({receipt.items.length} бр.)
              </h3>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {receipt.items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    {editingItem === index ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editData.name}
                          onChange={(e) => setEditData({...editData, name: e.target.value})}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Име на продукта"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-600">Цена</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editData.price}
                              onChange={(e) => setEditData({...editData, price: parseFloat(e.target.value) || 0})}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Количество</label>
                            <input
                              type="number"
                              step="1"
                              value={editData.quantity}
                              onChange={(e) => setEditData({...editData, quantity: parseInt(e.target.value) || 1})}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={saveEdit}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            ✓ Запази
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                          >
                            ✕ Откажи
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">#{index + 1}</span>
                              <h4 className="font-medium text-sm">{item.product_name}</h4>
                              <button
                                onClick={() => startEdit(index)}
                                className="text-blue-600 hover:text-blue-800 p-1"
                                title="Редактирай"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-600">
                                Кол: {item.quantity} × {formatCurrency(item.price, receipt.currency)}
                              </span>
                              {item.category_id && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryDisplay(item.category_id, item.category_name).color}`}>
                                  <span className="mr-1">{getCategoryDisplay(item.category_id, item.category_name).icon}</span>
                                  {getCategoryDisplay(item.category_id, item.category_name).name}
                                </span>
                              )}
                            </div>
                            {item.category_confidence !== undefined && item.category_confidence < 0.7 && (
                              <div className="text-xs text-amber-600 mt-1">
                                ⚠️ Ниска увереност ({Math.round(item.category_confidence * 100)}%)
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">
                              {formatCurrency(item.price * item.quantity, receipt.currency)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Общо:</span>
                  <span className="text-green-600">
                    {formatCurrency(receipt.total_amount, receipt.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/receipts')}
                className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Запази като чернова
              </button>
              <button
                onClick={confirmReceipt}
                disabled={saving}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Потвърждаване...</span>
                  </div>
                ) : (
                  '✓ Потвърди бележката'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}