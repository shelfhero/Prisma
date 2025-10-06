'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category?: string;
  category_confidence?: number;
}

interface Receipt {
  id: string;
  merchant_name: string;
  total_amount: number;
  receipt_date: string;
  items: ReceiptItem[];
}

export default function QuickReviewPage() {
  const params = useParams();
  const receiptId = params.receiptId as string;
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uncertainItems, setUncertainItems] = useState<ReceiptItem[]>([]);
  const [confidentItems, setConfidentItems] = useState<ReceiptItem[]>([]);
  const [isHighConfidence, setIsHighConfidence] = useState(false);
  const [showConfidentItems, setShowConfidentItems] = useState(false);

  const CONFIDENCE_THRESHOLD = 0.9;
  const UNCERTAIN_THRESHOLD = 0.8;

  const categories = [
    'Храна и напитки',
    'Месо и риба',
    'Мляко и млечни продукти',
    'Плодове и зеленчуци',
    'Хляб и тестени изделия',
    'Алкохол',
    'Бита техника',
    'Дрехи и обувки',
    'Здраве и лекарства',
    'Козметика и лична хигиена',
    'Транспорт',
    'Развлечения',
    'Други'
  ];

  useEffect(() => {
    loadReceipt();
  }, [receiptId]);

  const loadReceipt = async () => {
    try {
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', receiptId)
        .single();

      if (receiptError) throw receiptError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('receipt_items')
        .select('*')
        .eq('receipt_id', receiptId);

      if (itemsError) throw itemsError;

      const receiptWithItems = {
        ...receiptData,
        items: itemsData || []
      };

      setReceipt(receiptWithItems);

      // Categorize items by confidence
      const uncertain: ReceiptItem[] = [];
      const confident: ReceiptItem[] = [];
      let allHighConfidence = true;

      itemsData?.forEach((item: ReceiptItem) => {
        const confidence = item.category_confidence || 0;
        if (confidence < UNCERTAIN_THRESHOLD) {
          uncertain.push(item);
          allHighConfidence = false;
        } else if (confidence < CONFIDENCE_THRESHOLD) {
          confident.push(item);
          allHighConfidence = false;
        } else {
          confident.push(item);
        }
      });

      setUncertainItems(uncertain);
      setConfidentItems(confident);
      setIsHighConfidence(allHighConfidence && itemsData.length > 0);
    } catch (error) {
      console.error('Error loading receipt:', error);
      alert('Грешка при зареждане на касовата бележка');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAll = async () => {
    setSaving(true);
    try {
      // Mark receipt as reviewed
      const { error } = await supabase
        .from('receipts')
        .update({ status: 'completed', reviewed_at: new Date().toISOString() })
        .eq('id', receiptId);

      if (error) throw error;

      router.push('/dashboard');
    } catch (error) {
      console.error('Error accepting receipt:', error);
      alert('Грешка при потвърждаване');
      setSaving(false);
    }
  };

  const handleUpdateCategory = (itemId: string, category: string) => {
    setUncertainItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, category, category_confidence: 1.0 } : item
      )
    );
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      // Update uncertain items with new categories
      for (const item of uncertainItems) {
        const { error } = await supabase
          .from('receipt_items')
          .update({
            category: item.category,
            category_confidence: item.category_confidence || 1.0
          })
          .eq('id', item.id);

        if (error) throw error;
      }

      // Mark receipt as reviewed
      const { error } = await supabase
        .from('receipts')
        .update({ status: 'completed', reviewed_at: new Date().toISOString() })
        .eq('id', receiptId);

      if (error) throw error;

      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Грешка при запазване');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Зареждане...</p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Касовата бележка не е намерена</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">
            Към началото
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isHighConfidence ? 'Бърз преглед' : 'Преглед и корекция'}
          </h1>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <p className="font-medium text-gray-900">{receipt.merchant_name}</p>
              <p>{new Date(receipt.receipt_date).toLocaleDateString('bg-BG')}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {receipt.total_amount.toFixed(2)} лв
              </p>
              <p className="text-gray-500">{receipt.items.length} продукта</p>
            </div>
          </div>
        </div>

        {/* High Confidence Mode */}
        {isHighConfidence && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Всичко изглежда наред!
                  </h3>
                  <p className="mt-1 text-sm text-green-700">
                    Всички продукти са категоризирани автоматично с висока сигурност.
                  </p>
                </div>
              </div>
            </div>

            {/* Categorized Items Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Категоризирани продукти
              </h2>
              <div className="space-y-2">
                {confidentItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {item.price.toFixed(2)} лв
                      </p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-gray-500">x{item.quantity}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleAcceptAll}
                disabled={saving}
                className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Запазване...
                  </>
                ) : (
                  <>
                    <span className="text-2xl mr-2">✓</span>
                    Потвърди всичко
                  </>
                )}
              </button>

              <Link
                href={`/verify-receipt/${receiptId}`}
                className="w-full bg-white text-gray-700 border-2 border-gray-300 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                <span className="mr-2">✏️</span>
                Прегледай детайли
              </Link>
            </div>
          </div>
        )}

        {/* Semi-Confident Mode */}
        {!isHighConfidence && uncertainItems.length > 0 && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Нужна е проверка
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Моля, проверете категориите на {uncertainItems.length} {uncertainItems.length === 1 ? 'продукт' : 'продукта'}.
                  </p>
                </div>
              </div>
            </div>

            {/* Uncertain Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Продукти за проверка
              </h2>
              <div className="space-y-4">
                {uncertainItems.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">
                          {item.price.toFixed(2)} лв
                          {item.quantity > 1 && ` x${item.quantity}`}
                        </p>
                      </div>
                      {item.category_confidence && item.category_confidence < UNCERTAIN_THRESHOLD && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          {Math.round(item.category_confidence * 100)}% сигурност
                        </span>
                      )}
                    </div>
                    <select
                      value={item.category || ''}
                      onChange={(e) => handleUpdateCategory(item.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Изберете категория</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Confident Items Preview */}
            {confidentItems.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <button
                  onClick={() => setShowConfidentItems(!showConfidentItems)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h2 className="text-lg font-semibold text-gray-900">
                    Автоматично категоризирани ({confidentItems.length})
                  </h2>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${showConfidentItems ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showConfidentItems && (
                  <div className="mt-4 space-y-2">
                    {confidentItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {item.price.toFixed(2)} лв
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleSaveChanges}
                disabled={saving || uncertainItems.some(item => !item.category)}
                className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Запазване...' : 'Потвърди и запази'}
              </button>

              <Link
                href={`/verify-receipt/${receiptId}`}
                className="w-full bg-white text-gray-700 border-2 border-gray-300 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                Пълен преглед
              </Link>
            </div>
          </div>
        )}

        {/* No items case */}
        {!isHighConfidence && uncertainItems.length === 0 && confidentItems.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-500">Няма намерени продукти</p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block text-blue-600 hover:underline"
            >
              Към началото
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
