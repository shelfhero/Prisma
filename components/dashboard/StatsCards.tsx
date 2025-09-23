/**
 * Stats Cards Component for Призма
 * Displays key dashboard statistics
 */

'use client';

import { formatCurrency } from '@/lib/utils';

interface StatsCardsProps {
  totalReceipts: number;
  totalSpent: number;
  averageReceiptValue: number;
  thisMonthSpent: number;
  lastMonthSpent: number;
  spendingTrend: 'увеличение' | 'намаление' | 'стабилно';
  loading?: boolean;
}

const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 rounded mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
  </div>
);

export default function StatsCards({
  totalReceipts,
  totalSpent,
  averageReceiptValue,
  thisMonthSpent,
  lastMonthSpent,
  spendingTrend,
  loading = false
}: StatsCardsProps) {
  const getTrendIcon = () => {
    switch (spendingTrend) {
      case 'увеличение':
        return (
          <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'намаление':
        return (
          <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getTrendColor = () => {
    switch (spendingTrend) {
      case 'увеличение':
        return 'text-red-600';
      case 'намаление':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const calculateChangePercent = () => {
    if (lastMonthSpent === 0) return 0;
    return ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100;
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Receipts */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg
              className="h-6 w-6 text-blue-600"
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
          <div className="ml-4">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{totalReceipts}</div>
                <div className="text-sm text-gray-600">Касови бележки</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Total Spent */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          </div>
          <div className="ml-4">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalSpent)}
                </div>
                <div className="text-sm text-gray-600">Общо разходи</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Average Receipt Value */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg
              className="h-6 w-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div className="ml-4">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(averageReceiptValue)}
                </div>
                <div className="text-sm text-gray-600">Средна стойност</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Spending Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg
              className="h-6 w-6 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div className="ml-4">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <>
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(thisMonthSpent)}
                  </div>
                  <div className="ml-2 flex items-center">
                    {getTrendIcon()}
                    <span className={`text-sm ml-1 ${getTrendColor()}`}>
                      {Math.abs(calculateChangePercent()).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">Този месец</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}