'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-simple';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ReceiptItem {
  id: string;
  product_name: string;
  price: number;
  quantity: number;
  category: {
    id: string;
    name: string;
  } | null;
  raw_text?: string;
  confidence?: number;
  quality_flags?: Array<{
    type: string;
    confidence: number;
    description: string;
  }>;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface ReceiptDetails {
  id: string;
  retailer_name: string;
  store_location?: string;
  total_amount: number;
  currency: string;
  purchased_at: string;
  receipt_number?: string;
  raw_text: string;
  image_url?: string;
  processing_status: string;
  created_at: string;
  items: ReceiptItem[];
}

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = params.id as string;

  const [receipt, setReceipt] = useState<ReceiptDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<string[]>([]);
  const [imageLoading, setImageLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<{ itemId: string; categoryId: string } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ itemId: string; name: string; price: number; quantity: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const supabase = createBrowserClient();

  useEffect(() => {
    if (receiptId) {
      fetchReceiptDetails();
      fetchCategories();
    }
  }, [receiptId]);

  const fetchReceiptDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Моля, влезте в профила си');
        return;
      }

      const response = await fetch(`/api/receipts/${receiptId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Грешка при зареждане на касовата бележка');
      }

      const data = await response.json();
      setReceipt(data.receipt);
    } catch (err) {
      console.error('Error fetching receipt details:', err);
      setError(err instanceof Error ? err.message : 'Възникна неочаквана грешка');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/categories', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const updateItemCategory = async (itemId: string, categoryId: string) => {
    try {
      setSaving(itemId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Моля, влезте в профила си');
        return;
      }

      const response = await fetch(`/api/receipts/${receiptId}/categorize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          categoryId
        }),
      });

      if (!response.ok) {
        throw new Error('Грешка при обновяване на категорията');
      }

      // Update local state
      if (receipt) {
        const updatedItems = receipt.items.map(item => {
          if (item.id === itemId) {
            const category = categories.find(c => c.id === categoryId);
            return {
              ...item,
              category: category ? { id: category.id, name: category.name } : null
            };
          }
          return item;
        });

        setReceipt({
          ...receipt,
          items: updatedItems
        });
      }

      setEditingCategory(null);
    } catch (err) {
      console.error('Error updating category:', err);
      setError(err instanceof Error ? err.message : 'Възникна неочаквана грешка');
    } finally {
      setSaving(null);
    }
  };

  const updateItemDetails = async (itemId: string, name: string, price: number, quantity: number) => {
    try {
      setSaving(itemId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Моля, влезте в профила си');
        return;
      }

      const response = await fetch(`/api/receipts/${receiptId}/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_name: name,
          price: price,
          quantity: quantity
        }),
      });

      if (!response.ok) {
        throw new Error('Грешка при обновяване на продукта');
      }

      // Update local state
      if (receipt) {
        const updatedItems = receipt.items.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              product_name: name,
              price,
              quantity
            };
          }
          return item;
        });

        // Recalculate total
        const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        setReceipt({
          ...receipt,
          items: updatedItems,
          total_amount: newTotal
        });
      }

      setEditingItem(null);
      setHasChanges(true);
    } catch (err) {
      console.error('Error updating item:', err);
      setError(err instanceof Error ? err.message : 'Възникна неочаквана грешка');
    } finally {
      setSaving(null);
    }
  };

  const confirmReceipt = async () => {
    try {
      setSaving('confirm');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Моля, влезте в профила си');
        return;
      }

      const response = await fetch(`/api/receipts/${receiptId}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Грешка при потвърждаване на касовата бележка');
      }

      setConfirmed(true);
      setHasChanges(false);
    } catch (err) {
      console.error('Error confirming receipt:', err);
      setError(err instanceof Error ? err.message : 'Възникна неочаквана грешка');
    } finally {
      setSaving(null);
    }
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-100 text-gray-800';
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceText = (confidence?: number) => {
    if (!confidence) return 'Неизвестно';
    if (confidence >= 0.8) return 'Високо';
    if (confidence >= 0.6) return 'Средно';
    return 'Ниско';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg h-96"></div>
              <div className="bg-white rounded-lg h-96"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {error || 'Касовата бележка не беше намерена'}
            </h1>
            <Button onClick={() => router.push('/receipts')}>
              Назад към бележките
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {receipt.retailer_name}
              </h1>
              <p className="mt-2 text-gray-600">
                {formatDate(receipt.purchased_at)} • {formatCurrency(receipt.total_amount, receipt.currency)}
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => router.push('/receipts')}
              >
                ← Назад
              </Button>
              <Button>
                Редактирай
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Receipt Image */}
          <Card>
            <CardHeader>
              <CardTitle>Оригинална касова бележка</CardTitle>
            </CardHeader>
            <CardContent>
              {receipt.image_url ? (
                <div className="relative">
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                      <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  <img
                    src={receipt.image_url}
                    alt="Касова бележка"
                    className="w-full h-auto rounded-lg shadow-sm"
                    onLoad={() => setImageLoading(false)}
                    onError={() => setImageLoading(false)}
                  />
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <div className="text-gray-500">
                    <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>Няма налично изображение</p>
                  </div>
                </div>
              )}

              {/* Raw OCR Text */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Разпознат текст:</h4>
                <div className="bg-gray-50 rounded p-3 text-xs font-mono text-gray-700 max-h-40 overflow-y-auto">
                  {receipt.raw_text.split('\n').map((line, index) => (
                    <div key={index}>{line || ' '}</div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recognized Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Разпознати продукти
                <Badge variant="secondary">
                  {receipt.items.length} продукта
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {receipt.items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {editingItem?.itemId === item.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingItem.name}
                              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                              className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Име на продукта"
                            />
                            <div className="flex space-x-2">
                              <input
                                type="number"
                                step="0.01"
                                value={editingItem.price}
                                onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Цена"
                              />
                              <input
                                type="number"
                                step="1"
                                value={editingItem.quantity}
                                onChange={(e) => setEditingItem({ ...editingItem, quantity: parseFloat(e.target.value) || 1 })}
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Бр."
                              />
                              <button
                                onClick={() => updateItemDetails(editingItem.itemId, editingItem.name, editingItem.price, editingItem.quantity)}
                                disabled={!editingItem.name || editingItem.price <= 0 || saving === item.id}
                                className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">
                              {item.product_name}
                            </h4>
                            <button
                              onClick={() => setEditingItem({
                                itemId: item.id,
                                name: item.product_name,
                                price: item.price,
                                quantity: item.quantity
                              })}
                              className="text-blue-600 hover:text-blue-800"
                              title="Редактирай продукт"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        )}
                        <div className="mt-1 text-sm text-gray-600">
                          <p>Количество: {item.quantity}</p>
                          <div className="flex items-center space-x-2">
                            <span>Категория:</span>
                            {editingCategory?.itemId === item.id ? (
                              <div className="flex items-center space-x-2">
                                <select
                                  value={editingCategory.categoryId}
                                  onChange={(e) => setEditingCategory({ ...editingCategory, categoryId: e.target.value })}
                                  className="text-sm border border-gray-300 rounded px-2 py-1"
                                  disabled={saving === item.id}
                                >
                                  <option value="">Изберете категория</option>
                                  {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => updateItemCategory(item.id, editingCategory.categoryId)}
                                  disabled={!editingCategory.categoryId || saving === item.id}
                                  className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                  title="Запази"
                                >
                                  {saving === item.id ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
                                  ) : (
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                                <button
                                  onClick={() => setEditingCategory(null)}
                                  className="text-gray-600 hover:text-gray-800"
                                  title="Откажи"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                  item.category ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {item.category?.name || 'Некатегоризиран'}
                                </span>
                                <button
                                  onClick={() => setEditingCategory({
                                    itemId: item.id,
                                    categoryId: item.category?.id || ''
                                  })}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Редактирай категория"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quality indicators */}
                        {item.quality_flags && item.quality_flags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.quality_flags.map((flag, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                                title={flag.description}
                              >
                                {flag.type === 'name_incomplete' && '⚠️ Непълно име'}
                                {flag.type === 'price_suspicious' && '💰 Подозрителна цена'}
                                {flag.type === 'ocr_uncertain' && '🔍 Неясен OCR'}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-right ml-4">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatCurrency(item.price, receipt.currency)}
                        </div>
                        {item.confidence && (
                          <Badge className={`text-xs ${getConfidenceColor(item.confidence)}`}>
                            {getConfidenceText(item.confidence)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Raw text for this item */}
                    {item.raw_text && (
                      <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded p-2">
                        <span className="font-medium">Оригинален текст:</span> {item.raw_text}
                      </div>
                    )}
                  </div>
                ))}

                {receipt.items.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
                    </svg>
                    <p>Няма разпознати продукти</p>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Общо:</span>
                  <span>{formatCurrency(receipt.total_amount, receipt.currency)}</span>
                </div>
                {receipt.receipt_number && (
                  <div className="mt-2 text-sm text-gray-600">
                    № на бележката: {receipt.receipt_number}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Processing Status */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Информация за обработка</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Статус:</span>
                <p className="mt-1">
                  <Badge
                    className={
                      receipt.processing_status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : receipt.processing_status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }
                  >
                    {receipt.processing_status === 'completed' && 'Завършена'}
                    {receipt.processing_status === 'failed' && 'Неуспешна'}
                    {receipt.processing_status === 'processing' && 'В процес'}
                    {receipt.processing_status === 'pending' && 'В очакване'}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Добавена на:</span>
                <p className="mt-1">{formatDate(receipt.created_at)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Локация:</span>
                <p className="mt-1">{receipt.store_location || 'Не е указана'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Потвърждение на касовата бележка
              {confirmed && (
                <Badge className="bg-green-100 text-green-800">
                  ✓ Потвърдена
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!confirmed ? (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Прегледайте данните преди потвърждение
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Проверете дали всички продукти са правилно разпознати</li>
                    <li>• Убедете се, че цените и количествата са верни</li>
                    <li>• Проверете дали категориите са правилно зададени</li>
                    <li>• При грешки използвайте бутоните за редактиране</li>
                  </ul>
                </div>

                {hasChanges && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ Направихте промени в касовата бележка. Моля, прегледайте ги преди потвърждение.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Общо {receipt.items.length} продукта • {formatCurrency(receipt.total_amount, receipt.currency)}
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => router.push('/receipts')}
                    >
                      Запази като чернова
                    </Button>
                    <Button
                      onClick={confirmReceipt}
                      disabled={saving === 'confirm'}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {saving === 'confirm' ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          <span>Потвърждаване...</span>
                        </div>
                      ) : (
                        '✓ Потвърди касовата бележка'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto h-16 w-16 flex items-center justify-center bg-green-100 rounded-full mb-4">
                  <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Касовата бележка е потвърдена!
                </h3>
                <p className="text-gray-600 mb-4">
                  Данните са запазени в системата и са готови за анализ на разходите.
                </p>
                <Button onClick={() => router.push('/dashboard')}>
                  Към таблото за управление
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}