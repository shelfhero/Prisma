/**
 * Dashboard Page for Призма
 * Main dashboard showing user's receipt data and analytics
 */

'use client';

import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import StatsCards from '@/components/dashboard/StatsCards';
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown';
import RecentReceipts from '@/components/dashboard/RecentReceipts';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { createClient } from '@supabase/supabase-js';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const { stats, loading: dataLoading, error, refreshData } = useDashboardData();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );


  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Табло за управление
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Преглед на вашите касови бележки и разходи
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6">
            <ErrorMessage
              message={error}
              onRetry={refreshData}
            />
          </div>
        )}

        {/* Stats Cards */}
        <div className="mb-8">
          <StatsCards
            totalReceipts={stats?.totalReceipts || 0}
            totalSpent={stats?.totalSpent || 0}
            averageReceiptValue={stats?.averageReceiptValue || 0}
            thisMonthSpent={stats?.thisMonthSpent || 0}
            lastMonthSpent={stats?.lastMonthSpent || 0}
            spendingTrend={stats?.spendingTrend || 'стабилно'}
            loading={dataLoading}
          />
        </div>


        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Category Breakdown */}
          <div className="lg:col-span-2">
            <CategoryBreakdown
              categories={stats?.topCategories || []}
              loading={dataLoading}
            />
          </div>

          {/* Recent Receipts */}
          <div className="lg:col-span-1">
            <RecentReceipts
              receipts={stats?.recentReceipts || []}
              loading={dataLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}