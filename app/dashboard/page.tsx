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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

  async function createDemoReceipt() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/debug/create-demo-receipt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        window.location.href = result.review_url;
      }
    } catch (error) {
      console.error('Failed to create demo receipt:', error);
    }
  }

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

        {/* Demo Receipt for Testing */}
        {(!stats?.recentReceipts || stats.recentReceipts.length === 0) && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-blue-900">
                    🎉 Тествайте функцията за преглед на касови бележки!
                  </h3>
                  <p className="text-blue-700 mt-1">
                    Създайте демо касова бележка за да тествате категоризирането и прегледа.
                  </p>
                </div>
                <Button onClick={createDemoReceipt} className="bg-blue-600 hover:bg-blue-700">
                  📝 Създай демо бележка
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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