'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Insight {
  id: string
  type: 'saving_opportunity' | 'budget_warning' | 'spending_pattern' | 'recommendation'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  icon: string
}

interface AnalyticsData {
  insights: Insight[]
  isNewUser: boolean
  totalReceipts: number
  monthlySpending: number
  topCategories: { category: string; amount: number }[]
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [generatingInsights, setGeneratingInsights] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadAnalytics()
  }, [])

  async function loadAnalytics() {
    try {
      const response = await fetch('/api/analytics')
      if (!response.ok) throw new Error('Failed to load analytics')

      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  async function generateInsights() {
    setGeneratingInsights(true)
    try {
      const response = await fetch('/api/analytics/generate-insights', {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to generate insights')

      const newData = await response.json()
      setData(newData)
    } catch (error) {
      console.error('Error generating insights:', error)
      alert('Не успяхме да генерираме анализи. Моля опитайте отново.')
    } finally {
      setGeneratingInsights(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'low': return 'border-green-200 bg-green-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.back()}
              className="text-purple-600 hover:text-purple-700 mb-2 flex items-center gap-2"
            >
              ← Назад
            </button>
            <h1 className="text-4xl font-bold text-gray-900">Анализи и Препоръки</h1>
            <p className="text-gray-600 mt-2">
              {data?.isNewUser
                ? `Качили сте ${data.totalReceipts} бона. Качете повече за персонализирани анализи!`
                : `Базирано на ${data?.totalReceipts} бона`
              }
            </p>
          </div>
          <button
            onClick={generateInsights}
            disabled={generatingInsights}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generatingInsights ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Генериране...</span>
              </>
            ) : (
              <>
                <span>🤖</span>
                <span>Генерирай AI Анализи</span>
              </>
            )}
          </button>
        </div>

        {/* New User Message */}
        {data?.isNewUser && (
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="text-4xl">💡</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Добре дошли в Prisma!
                </h3>
                <p className="text-gray-700 mb-4">
                  Качете повече бонове, за да получите персонализирани анализи и препоръки базирани на вашите разходи.
                  Колкото повече данни има Prisma, толкова по-полезни и точни ще бъдат препоръките!
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Качи Бон Сега
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Overview */}
        {!data?.isNewUser && data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="text-gray-600 text-sm mb-1">Общо Бонове</div>
              <div className="text-3xl font-bold text-gray-900">{data.totalReceipts}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="text-gray-600 text-sm mb-1">Месечни Разходи</div>
              <div className="text-3xl font-bold text-gray-900">
                {data.monthlySpending.toFixed(2)} лв
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="text-gray-600 text-sm mb-1">Топ Категория</div>
              <div className="text-xl font-bold text-gray-900">
                {data.topCategories[0]?.category || 'Няма данни'}
              </div>
              <div className="text-sm text-gray-600">
                {data.topCategories[0]?.amount.toFixed(2)} лв
              </div>
            </div>
          </div>
        )}

        {/* Insights Grid */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {data?.insights && data.insights.length > 0 ? 'Вашите Анализи' : 'Препоръки'}
          </h2>

          {data?.insights && data.insights.length > 0 ? (
            data.insights.map((insight) => (
              <div
                key={insight.id}
                className={`border-2 rounded-xl p-6 ${getPriorityColor(insight.priority)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{insight.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {insight.title}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadgeColor(insight.priority)}`}>
                        {insight.priority === 'high' ? 'Важно' : insight.priority === 'medium' ? 'Средно' : 'Ниско'}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Няма генерирани анализи
              </h3>
              <p className="text-gray-600 mb-4">
                Натиснете "Генерирай AI Анализи" за да получите персонализирани препоръки
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
