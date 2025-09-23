/**
 * Category Breakdown Component for Призма
 * Shows spending by category with visual breakdown
 */

'use client';

import { formatCurrency } from '@/lib/utils';

interface CategoryBreakdownProps {
  categories: {
    categoryName: string;
    totalSpent: number;
    percentage: number;
    itemCount: number;
  }[];
  loading?: boolean;
}

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <div className="h-3 bg-gray-200 rounded w-8"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>
    ))}
  </div>
);

const categoryColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-indigo-500',
  'bg-pink-500'
];

const categoryIcons = {
  'Хранителни продукти': (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
  ),
  'Напитки': (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 5H2v5a2 2 0 002 2h12a2 2 0 002-2V9z" clipRule="evenodd" />
    </svg>
  ),
  'Други': (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  )
};

export default function CategoryBreakdown({ categories, loading = false }: CategoryBreakdownProps) {
  const getIcon = (categoryName: string) => {
    return categoryIcons[categoryName as keyof typeof categoryIcons] || categoryIcons['Други'];
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">
          Разходи по категории
        </h3>
        <button className="text-sm text-blue-600 hover:text-blue-500">
          Вижте всички
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : categories.length === 0 ? (
        <div className="text-center py-8">
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-gray-600">
            Няма данни за категории
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category, index) => (
            <div key={category.categoryName} className="flex items-center space-x-4">
              <div className={`h-3 w-3 rounded-full ${categoryColors[index % categoryColors.length]}`}></div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <div className="text-gray-600">
                      {getIcon(category.categoryName)}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {category.categoryName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(category.totalSpent)}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({category.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${categoryColors[index % categoryColors.length]}`}
                    style={{ width: `${Math.min(category.percentage, 100)}%` }}
                  ></div>
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  {category.itemCount} продукт{category.itemCount !== 1 ? 'а' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}