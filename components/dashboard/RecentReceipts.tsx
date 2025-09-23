/**
 * Recent Receipts Component for Призма
 * Shows the latest receipts with details
 */

'use client';

import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

interface RecentReceiptsProps {
  receipts: {
    id: string;
    retailerName: string;
    totalAmount: number;
    currency: string;
    purchasedAt: string;
    itemsCount: number;
  }[];
  loading?: boolean;
}

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 border-b border-gray-100">
        <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="text-right">
          <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-12"></div>
        </div>
      </div>
    ))}
  </div>
);

export default function RecentReceipts({ receipts, loading = false }: RecentReceiptsProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Последни бележки
        </h3>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <LoadingSkeleton />
        ) : receipts.length === 0 ? (
          <div className="p-8 text-center">
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
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Няма касови бележки
            </h4>
            <p className="text-gray-600 mb-4">
              Започнете да добавяте бележки за да видите анализите тук
            </p>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
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
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {receipts.map((receipt) => (
              <Link
                key={receipt.id}
                href={`/review-receipt/${receipt.id}`}
                className="flex items-center space-x-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer block"
              >
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-600"
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

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {receipt.retailerName}
                    </h4>
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(receipt.totalAmount, receipt.currency)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-500">
                      {receipt.itemsCount} продукт{receipt.itemsCount !== 1 ? 'а' : ''}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(receipt.purchasedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {receipts.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200">
          <a
            href="/receipts"
            className="text-sm text-blue-600 hover:text-blue-500 font-medium inline-block"
          >
            Вижте всички бележки →
          </a>
        </div>
      )}
    </div>
  );
}