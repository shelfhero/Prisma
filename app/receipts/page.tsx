'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase-simple';
import { formatCurrency, formatDate } from '@/lib/utils';

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
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Всички касови бележки</h1>
          <p className="mt-2 text-gray-600">
            Общо {receipts.length} касов{receipts.length === 1 ? 'а бележка' : receipts.length < 5 ? 'и бележки' : 'и бележки'}
          </p>
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

        {receipts.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 flex items-center justify-center bg-gray-100 rounded-full mb-4">
              <svg
                className="h-6 w-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Няма касови бележки
            </h3>
            <p className="text-gray-500 mb-6">
              Започнете да добавяте касови бележки, за да ги видите тук
            </p>
            <a
              href="/receipts/add"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Добавете първата бележка
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => window.location.href = `/receipts/${receipt.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {receipt.retailerName}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {receipt.itemsCount} продукт{receipt.itemsCount !== 1 ? 'а' : ''}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Дата на покупка:</span> {formatDate(receipt.purchasedAt)}
                      </p>
                      {receipt.storeLocation && (
                        <p>
                          <span className="font-medium">Магазин:</span> {receipt.storeLocation}
                        </p>
                      )}
                      {receipt.notes && (
                        <p>
                          <span className="font-medium">Бележки:</span> {receipt.notes}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Добавена на: {formatDate(receipt.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 ml-4">
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(receipt.totalAmount, receipt.currency)}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/receipts/${receipt.id}`;
                      }}
                      className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2"
                      title="Преглед на касовата бележка"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Преглед
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReceipt(receipt.id);
                      }}
                      disabled={deleting === receipt.id}
                      className="inline-flex items-center p-2 border border-red-300 rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Изтриване на касовата бележка"
                    >
                      {deleting === receipt.id ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}