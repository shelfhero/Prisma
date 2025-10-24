'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Receipt,
  TrendingUp,
  AlertCircle,
  Download,
  Activity,
  ShoppingBag,
  PieChart,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  DollarSign
} from 'lucide-react'
import PriceUploader from '@/components/admin/PriceUploader'

interface Metrics {
  total_users: number
  active_users_7d: number
  new_users_today: number
  total_receipts: number
  receipts_today: number
  success_rate: number
  avg_receipts_per_user: number
  avg_receipt_value: number
}

interface TopStore {
  merchant_name: string
  receipt_count: number
  total_amount: number
}

interface CategorySpending {
  category: string
  receipt_count: number
  total_amount: number
  avg_amount: number
}

interface RecentError {
  id: string
  processing_status: string
  created_at: string
  retailers?: { name: string } | null
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [topStores, setTopStores] = useState<TopStore[]>([])
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [recentErrors, setRecentErrors] = useState<RecentError[]>([])
  const [allItems, setAllItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics' | 'system' | 'items' | 'prices'>('overview')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/metrics')

      console.log('Admin API Response Status:', response.status)

      if (response.status === 403) {
        const errorData = await response.json()
        console.error('403 Forbidden - Not authorized as admin', errorData)
        alert('ERROR 403: Not authorized as admin. Check console for details.')
        // TEMPORARILY DISABLED REDIRECT FOR DEBUGGING
        // router.push('/')
        setLoading(false)
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        alert(`API Error (${response.status}): ${JSON.stringify(errorData)}`)
        throw new Error('Failed to fetch dashboard data')
      }

      const data = await response.json()
      console.log('Dashboard data:', data)
      setMetrics(data.metrics)
      setTopStores(data.topStores || [])
      setCategorySpending(data.categorySpending || [])
      setRecentErrors(data.recentErrors || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      alert(`ERROR: ${error}. Check console for details.`)
      // Don't redirect on error, just show empty dashboard
      setMetrics({
        total_users: 0,
        active_users_7d: 0,
        new_users_today: 0,
        total_receipts: 0,
        receipts_today: 0,
        success_rate: 0,
        avg_receipts_per_user: 0,
        avg_receipt_value: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAllItems = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/items')

      if (!response.ok) {
        throw new Error('Failed to fetch items')
      }

      const data = await response.json()
      setAllItems(data.items || [])

      // Also fetch categories if not already loaded
      if (categories.length === 0) {
        const catResponse = await fetch('/api/categories')
        if (catResponse.ok) {
          const catData = await catResponse.json()
          setCategories(catData.categories || [])
        }
      }
    } catch (error) {
      console.error('Error fetching items:', error)
      alert('Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = async (itemId: string, newCategoryId: string, productName: string, oldCategoryId: string | null) => {
    try {
      // Parse categoryId as integer (or null if empty)
      const categoryIdInt = newCategoryId ? parseInt(newCategoryId) : null
      const oldCategoryIdInt = oldCategoryId ? parseInt(oldCategoryId) : null

      // Update the item's category in the database
      const response = await fetch('/api/admin/items/update-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          categoryId: categoryIdInt,
          productName,
          originalCategoryId: oldCategoryIdInt
        })
      })

      if (!response.ok) throw new Error('Failed to update category')

      // Update local state
      setAllItems(items =>
        items.map(item =>
          item.id === itemId
            ? {
                ...item,
                category_name: categories.find(c => c.id == newCategoryId)?.name || null
              }
            : item
        )
      )

      setEditingItemId(null)
      alert('✓ Категорията е обновена и записана за обучение')
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Грешка при обновяване на категорията')
    }
  }

  const handleExport = async (type: string, format: string) => {
    try {
      const response = await fetch(`/api/admin/export?type=${type}&format=${format}`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `export-${type}-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const handleRecategorize = async () => {
    if (!confirm('Това ще категоризира всички некатегоризирани артикули. Продължаваме?')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/admin/recategorize', {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Recategorization failed')

      const result = await response.json()
      alert(`Успешно категоризирани: ${result.processed} от ${result.total} артикули${result.errors > 0 ? ` (${result.errors} грешки)` : ''}`)

      // Refresh dashboard data
      await fetchDashboardData()
    } catch (error) {
      console.error('Error recategorizing items:', error)
      alert('Грешка при категоризация')
    } finally {
      setLoading(false)
    }
  }

  const handleExportItemsToCSV = () => {
    if (allItems.length === 0) {
      alert('Няма данни за експорт')
      return
    }

    // Create CSV header
    const headers = ['Продукт', 'Магазин', 'Дата', 'Количество', 'Ед. цена', 'Обща цена', 'Категория']

    // Create CSV rows
    const rows = allItems.map(item => [
      item.product_name,
      item.store_name || '-',
      new Date(item.purchased_at).toLocaleDateString('bg-BG'),
      item.qty,
      item.unit_price?.toFixed(2) || '0.00',
      item.total_price?.toFixed(2) || '0.00',
      item.category_name || 'Некатегоризиран'
    ])

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `items-export-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Зареждане на админ панел...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Админ Панел</h1>
              <p className="text-gray-600 mt-1">Преглед на системата и аналитика</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRecategorize}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <PieChart className="w-4 h-4" />
                Категоризирай всички
              </button>
              <button
                onClick={() => fetchDashboardData()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Обнови
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-6 border-b border-gray-200">
            {[
              { id: 'overview', label: 'Преглед', icon: Activity },
              { id: 'prices', label: 'Качи цени', icon: DollarSign },
              { id: 'items', label: 'Всички артикули', icon: Receipt },
              { id: 'users', label: 'Потребители', icon: Users },
              { id: 'analytics', label: 'Аналитика', icon: PieChart },
              { id: 'system', label: 'Система', icon: AlertCircle }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  if (tab.id === 'items' && allItems.length === 0) {
                    fetchAllItems()
                  }
                }}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Общо потребители"
                value={metrics?.total_users || 0}
                icon={Users}
                color="blue"
              />
              <MetricCard
                title="Активни (7 дни)"
                value={metrics?.active_users_7d || 0}
                subtitle={`${Math.round(((metrics?.active_users_7d || 0) / (metrics?.total_users || 1)) * 100)}%`}
                icon={Activity}
                color="green"
              />
              <MetricCard
                title="Нови днес"
                value={metrics?.new_users_today || 0}
                icon={TrendingUp}
                color="purple"
              />
              <MetricCard
                title="Успешна обработка"
                value={`${metrics?.success_rate || 0}%`}
                icon={CheckCircle}
                color="emerald"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Касови бонове днес"
                value={metrics?.receipts_today || 0}
                icon={Receipt}
                color="indigo"
              />
              <MetricCard
                title="Общо касови бонове"
                value={metrics?.total_receipts || 0}
                icon={Receipt}
                color="blue"
              />
              <MetricCard
                title="Средно бонове/потреб"
                value={metrics?.avg_receipts_per_user?.toFixed(1) || '0'}
                icon={PieChart}
                color="orange"
              />
              <MetricCard
                title="Средна стойност бон"
                value={`${metrics?.avg_receipt_value?.toFixed(2) || '0'} лв`}
                icon={ShoppingBag}
                color="pink"
              />
            </div>

            {/* Top Stores */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Най-популярни магазини</h2>
                <button
                  onClick={() => handleExport('metrics', 'csv')}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Експорт
                </button>
              </div>
              <div className="space-y-3">
                {topStores.slice(0, 10).map((store, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-gray-400">{index + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900">{store.merchant_name}</p>
                        <p className="text-sm text-gray-600">{store.receipt_count} касови бона</p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">{store.total_amount?.toFixed(2)} лв</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Spending */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Разходи по категории</h2>
              <div className="space-y-3">
                {categorySpending.map((cat, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{cat.category}</p>
                      <p className="text-sm text-gray-600">{cat.receipt_count} бона • Средно: {cat.avg_amount?.toFixed(2)} лв</p>
                    </div>
                    <p className="font-semibold text-gray-900">{cat.total_amount?.toFixed(2)} лв</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'prices' && (
          <div className="max-w-4xl">
            <PriceUploader />
          </div>
        )}

        {activeTab === 'system' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Последни грешки</h2>
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                {recentErrors.length} грешки
              </span>
            </div>
            <div className="space-y-3">
              {recentErrors.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">Няма регистрирани грешки</p>
                </div>
              ) : (
                recentErrors.map((error) => (
                  <div key={error.id} className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-gray-900">Receipt ID: {error.id.slice(0, 8)}</p>
                        <span className="text-sm text-gray-600">
                          {new Date(error.created_at).toLocaleString('bg-BG')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{error.retailers?.name || 'Unknown merchant'}</p>
                      <p className="text-sm text-red-600 mt-1">Status: {error.processing_status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Управление на потребители</h2>
              <button
                onClick={() => handleExport('users', 'csv')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Експорт потребители
              </button>
            </div>
            <p className="text-gray-600">Детайлен преглед на потребителите ще бъде имплементиран тук.</p>
          </div>
        )}

        {activeTab === 'items' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Всички артикули ({allItems.length})</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleExportItemsToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  disabled={allItems.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Експорт CSV
                </button>
                <button
                  onClick={fetchAllItems}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Обнови
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Продукт</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Магазин</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Кол.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ед. цена</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Обща цена</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Категория</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.store_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(item.purchased_at).toLocaleDateString('bg-BG')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.qty}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.unit_price?.toFixed(2)} лв</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.total_price?.toFixed(2)} лв</td>
                      <td className="px-4 py-3 text-sm">
                        {editingItemId === item.id ? (
                          <select
                            autoFocus
                            className="px-2 py-1 border border-blue-500 rounded text-xs"
                            defaultValue={categories.find(c => c.name === item.category_name)?.id || ''}
                            onChange={(e) => handleCategoryChange(item.id, e.target.value, item.product_name, categories.find(c => c.name === item.category_name)?.id)}
                            onBlur={() => setEditingItemId(null)}
                          >
                            <option value="">Некатегоризиран</option>
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onClick={() => setEditingItemId(item.id)}
                            className={`px-2 py-1 rounded-full text-xs cursor-pointer hover:opacity-80 ${
                              item.category_name
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {item.category_name || 'Некатегоризиран'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allItems.length === 0 && (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Няма намерени артикули</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Разширена аналитика</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('receipts', 'csv')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Експорт CSV
                </button>
                <button
                  onClick={() => handleExport('receipts', 'json')}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Експорт JSON
                </button>
              </div>
            </div>
            <p className="text-gray-600">Детайлна аналитика и графики ще бъдат имплементирани тук.</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: any
  color: 'blue' | 'green' | 'purple' | 'emerald' | 'indigo' | 'orange' | 'pink'
}

function MetricCard({ title, value, subtitle, icon: Icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    orange: 'bg-orange-100 text-orange-600',
    pink: 'bg-pink-100 text-pink-600'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </div>
    </div>
  )
}
