'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { createBrowserClient } from '@/lib/supabase-simple';
import { formatCurrency, formatDate } from '@/lib/utils';

// Lazy load empty state component - only needed when there are no receipts
const NoReceiptsEmpty = dynamic(() => import('@/components/empty-states/NoReceiptsEmpty'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-600">Зареждане...</div></div>
});

interface Receipt {
  id: string;
  retailerName: string;
  totalAmount: number;
  currency: string;
  purchasedAt: string;
  storeLocation?: string;
  itemsCount: number;
  notes?: string;
  createdAt: string;
  status?: 'pending' | 'completed' | 'error';
  reviewed_at?: string;
  image_url?: string;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createBrowserClient();

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session in receipts page:', session ? 'Found' : 'Not found');
      if (!session) {
        setError('Моля, влезте в профила си');
        return;
      }

      console.log('Making API request to /api/receipts');
      const response = await fetch('/api/receipts', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('API response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.log('API error response:', errorText);
        throw new Error('Грешка при извличане на касовите бележки');
      }

      const data = await response.json();
      console.log('API response data:', data);
      console.log('Receipts count:', data.receipts?.length || 0);
      setReceipts(data.receipts || []);
    } catch (err) {
      console.error('Error fetching receipts:', err);
      setError(err instanceof Error ? err.message : 'Възникна неочаквана грешка');
    } finally {
      setLoading(false);
    }
  };

  const deleteReceipt = async (receiptId: string) => {
    if (!confirm('Сигурни ли сте, че искате да изтриете тази касова бележка?')) {
      return;
    }

    console.log('Starting delete for receipt:', receiptId);

    try {
      setDeleting(receiptId);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      console.log('Delete session check:', session ? 'Found' : 'Not found');
      if (!session) {
        setError('Моля, влезте в профила си');
        return;
      }

      console.log('Making DELETE request to:', `/api/receipts/delete?id=${receiptId}`);
      const response = await fetch(`/api/receipts/delete?id=${receiptId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Delete response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Delete error response:', errorData);
        throw new Error(errorData.error || 'Грешка при изтриване на касовата бележка');
      }

      const result = await response.json();
      console.log('Delete success response:', result);

      // Remove the deleted receipt from the state
      setReceipts(prev => prev.filter(receipt => receipt.id !== receiptId));
      console.log('Receipt removed from state');

    } catch (err) {
      console.error('Error deleting receipt:', err);
      setError(err instanceof Error ? err.message : 'Възникна неочаквана грешка');
    } finally {
      setDeleting(null);
    }
  };

  // Sort: Issues first, then by date (newest first)
  const sortedReceipts = [...receipts].sort((a, b) => {
    // Issues float to top
    const aHasIssues = a.requires_review || a.manual_review_count > 0;
    const bHasIssues = b.requires_review || b.manual_review_count > 0;

    if (aHasIssues && !bHasIssues) return -1;
    if (!aHasIssues && bHasIssues) return 1;

    // Then by date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Filter by search query
  const filteredReceipts = sortedReceipts.filter(receipt => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      receipt.retailerName?.toLowerCase().includes(query) ||
      receipt.storeLocation?.toLowerCase().includes(query) ||
      receipt.notes?.toLowerCase().includes(query)
    );
  });

  const issuesCount = receipts.filter(r => r.requires_review || r.manual_review_count > 0).length;

  const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-6 bg-gray-200 rounded w-16"></div>
              <div className="h-8 bg-gray-200 rounded w-8"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Всички касови бележки</h1>
            <p className="mt-2 text-gray-600">Преглед на всички ваши касови бележки</p>
          </div>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">История на разходите</h1>
          <p className="mt-2 text-gray-600">
            {receipts.length} касов{receipts.length === 1 ? 'а бележка' : 'и бележки'} обработени
          </p>
        </div>

        {/* Issues Banner (if any) */}
        {issuesCount > 0 && (
          <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Проверете {issuesCount} {issuesCount === 1 ? 'продукт' : 'продукта'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Некои продукти изискват вашето внимание
                  </p>
                </div>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Търсене по магазин, локация или бележка..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg
              className="absolute left-3 top-3.5 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty States */}
        {receipts.length === 0 ? (
          <NoReceiptsEmpty />
        ) : filteredReceipts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Няма резултати
            </h3>
            <p className="text-gray-500 mb-6">
              Не намерихме касови бележки, съответстващи на вашето търсене
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Изчисти търсенето
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all ${
                  receipt.requires_review || receipt.manual_review_count > 0
                    ? 'border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-white'
                    : 'border border-gray-200'
                }`}
              >
                <div className="p-5">
                  {/* Main Content - Horizontal Layout */}
                  <div className="flex items-center justify-between">
                    {/* Left: Merchant Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {receipt.retailerName}
                        </h3>
                        {/* Auto-processed badge */}
                        {!receipt.requires_review && receipt.auto_processed && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Автоматично обработен
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          📅 {formatDate(receipt.purchasedAt)}
                        </span>
                        {receipt.storeLocation && (
                          <span className="flex items-center">
                            📍 {receipt.storeLocation}
                          </span>
                        )}
                        <span className="flex items-center text-gray-400">
                          {receipt.itemsCount} продукт{receipt.itemsCount !== 1 ? 'а' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Center: Issue Warning (if needed) */}
                    {(receipt.requires_review || receipt.manual_review_count > 0) && (
                      <div className="mx-4">
                        <button
                          onClick={() => window.location.href = `/receipt/quick-review/${receipt.id}`}
                          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg font-medium transition-colors flex items-center space-x-2"
                        >
                          <span>⚠️</span>
                          <span>Проверете {receipt.manual_review_count || 1} прод.</span>
                        </button>
                      </div>
                    )}

                    {/* Right: Amount & Actions */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 mb-2">
                        {formatCurrency(receipt.totalAmount, receipt.currency)}
                      </div>
                      <div className="flex items-center space-x-2">
                        {receipt.image_url && (
                          <button
                            onClick={() => setPreviewImage(receipt.image_url!)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Преглед на снимка"
                          >
                            👁️
                          </button>
                        )}
                        <button
                          onClick={() => window.location.href = `/verify-receipt/${receipt.id}`}
                          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Детайли
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteReceipt(receipt.id);
                          }}
                          disabled={deleting === receipt.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Изтриване"
                        >
                          {deleting === receipt.id ? (
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            '🗑️'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notes (if any) */}
                  {receipt.notes && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{receipt.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image Preview Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-4xl max-h-full">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={previewImage}
                alt="Receipt preview"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}