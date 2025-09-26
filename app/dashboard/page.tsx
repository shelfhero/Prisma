/**
 * Dashboard Page for Призма
 * Detailed expense breakdown dashboard showing categorized spending
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardExpenseData, updateItemInDatabase, deleteItemFromDatabase } from '@/hooks/useDashboardExpenseData';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import ExpenseHeader from '@/components/dashboard/ExpenseHeader';
import CategorySection from '@/components/dashboard/CategorySection';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DetailedReceiptItem } from '@/types/dashboard';
import { RefreshCw, AlertCircle, FileText } from 'lucide-react';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Keep original navigation header */}
        <DashboardHeader />

        {/* Main dashboard content */}
        <DashboardContent />
      </div>
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    stats,
    categories,
    loading,
    error,
    refreshData,
    updateFilters,
    filters
  } = useDashboardExpenseData();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<DetailedReceiptItem | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const handleCategoryToggle = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAddExpense = () => {
    router.push('/upload-receipt');
  };

  const handleEditBudget = () => {
    // TODO: Open budget editing modal
    console.log('Edit budget clicked');
  };

  const handleExportData = () => {
    // TODO: Open export modal
    console.log('Export data clicked');
  };

  const handleItemEdit = (item: DetailedReceiptItem) => {
    setEditingItem(item);
    // TODO: Open edit modal
    console.log('Edit item:', item);
  };

  const handleItemDelete = async (itemId: string) => {
    if (!confirm('Сигурни ли сте, че искате да изтриете този продукт?')) {
      return;
    }

    setProcessingAction(itemId);
    try {
      const result = await deleteItemFromDatabase(itemId);
      if (result.success) {
        await refreshData();
      } else {
        alert(`Грешка: ${result.error}`);
      }
    } catch (err) {
      alert('Възникна грешка при изтриването на продукта');
    } finally {
      setProcessingAction(null);
    }
  };

  if (loading && categories.length === 0) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {/* Loading header */}
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>

            {/* Loading stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Loading categories */}
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Error message */}
        {error && (
          <div className="mb-6">
            <ErrorMessage
              message={error}
              onRetry={refreshData}
            />
          </div>
        )}

        {/* Expense Header with Stats */}
        <div className="mb-8">
          <ExpenseHeader
            stats={stats}
            filters={filters}
            onFiltersChange={updateFilters}
            onAddExpense={handleAddExpense}
            onEditBudget={handleEditBudget}
            onExportData={handleExportData}
          />
        </div>

        {/* Refresh Button */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Разходи по категории
          </h2>
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Обнови данните
          </Button>
        </div>

        {/* Categories */}
        {categories.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Няма данни за показване
            </h3>
            <p className="text-gray-600 mb-6">
              Няма записани разходи за избрания период ({filters.month}/{filters.year}).
              Качете касови бележки, за да видите вашите разходи тук.
            </p>
            <Button onClick={handleAddExpense} className="bg-blue-600 hover:bg-blue-700">
              <FileText className="w-4 h-4 mr-2" />
              Добави първата си бележка
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {categories.map((categoryData) => (
              <CategorySection
                key={categoryData.category.id || categoryData.category.name}
                category={categoryData}
                isExpanded={expandedCategories.has(categoryData.category.id || categoryData.category.name)}
                onToggle={() => handleCategoryToggle(categoryData.category.id || categoryData.category.name)}
                onItemEdit={handleItemEdit}
                onItemDelete={handleItemDelete}
                filters={filters}
                onFiltersChange={updateFilters}
              />
            ))}
          </div>
        )}

        {/* Loading overlay for actions */}
        {processingAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-6 flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Обработва се...</span>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}