/**
 * Manual Receipt Entry Page for Призма
 * For entering receipt data manually when OCR is not available
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase-simple';

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

export default function ManualReceiptPage() {
  return (
    <ProtectedRoute>
      <ManualReceiptContent />
    </ProtectedRoute>
  );
}

function ManualReceiptContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form data
  const [retailer, setRetailer] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [total, setTotal] = useState<number>(0);
  const [items, setItems] = useState<ReceiptItem[]>([
    { name: '', price: 0, quantity: 1 }
  ]);

  const addItem = () => {
    setItems([...items, { name: '', price: 0, quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);

    // Auto-calculate total
    const calculatedTotal = newItems.reduce((sum, item) =>
      sum + (item.price * item.quantity), 0
    );
    setTotal(calculatedTotal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('Трябва да сте влезли в системата');
      return;
    }

    if (!retailer.trim()) {
      setError('Моля въведете име на магазина');
      return;
    }

    if (items.some(item => !item.name.trim() || item.price <= 0)) {
      setError('Моля въведете валидни данни за всички продукти');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Няма активна сесия');
      }

      // Create manual receipt data
      const receiptData = {
        success: true,
        receipt: {
          retailer,
          total,
          date: new Date(date).toISOString(),
          items: items.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity
          }))
        },
        raw_text: 'Ръчно въведена касова бележка',
        confidence: 100
      };

      // Submit to API
      const response = await fetch('/api/receipts/manual', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(receiptData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Грешка при запазване');
      }

      setSuccess(`Касовата бележка е запазена успешно! Обща сума: ${total.toFixed(2)} лв.`);

      // Reset form
      setRetailer('');
      setDate(new Date().toISOString().split('T')[0]);
      setTotal(0);
      setItems([{ name: '', price: 0, quantity: 1 }]);

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Неочаквана грешка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Ръчно въвеждане на касова бележка
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Основна информация
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Магазин
                </label>
                <input
                  type="text"
                  value={retailer}
                  onChange={(e) => setRetailer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Например: Лидл, Фантастико, Билла"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Продукти
              </h2>
              <Button
                type="button"
                onClick={addItem}
                variant="outline"
                size="sm"
              >
                + Добави продукт
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Име на продукта
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Например: Хляб"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Цена (лв)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Количество
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-full p-2 text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
                      >
                        Премахни
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">
                  Обща сума:
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {total.toFixed(2)} лв.
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{success}</p>
              <p className="text-xs text-green-600 mt-1">
                Пренасочване към таблото...
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Отказ
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={loading || total <= 0}
            >
              {loading ? 'Запазва се...' : 'Запази касова бележка'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}