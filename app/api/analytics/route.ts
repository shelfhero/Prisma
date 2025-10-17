import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient as createSSRServerClient } from '@supabase/ssr'

const NEW_USER_THRESHOLD = 5 // Users with fewer receipts are considered new

export async function GET(request: NextRequest) {
  try {
    // Create SSR-compatible Supabase client with cookie handling
    const cookieStore = await cookies()
    const supabase = createSSRServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Auth error in analytics:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get total receipts count
    const { count: totalReceipts, error: countError } = await supabase
      .from('receipts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) throw countError

    const isNewUser = (totalReceipts || 0) < NEW_USER_THRESHOLD

    // Get monthly spending (current month)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: monthlyReceipts, error: monthlyError } = await supabase
      .from('receipts')
      .select('total_amount')
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())

    if (monthlyError) throw monthlyError

    const monthlySpending = monthlyReceipts?.reduce(
      (sum, receipt) => sum + (receipt.total_amount || 0),
      0
    ) || 0

    // Get top categories - join with receipts to filter by user
    const { data: categoryData, error: categoryError } = await supabase
      .from('items')
      .select('category_id, total_price, receipt_id, receipts!inner(user_id)')
      .eq('receipts.user_id', user.id)

    if (categoryError) throw categoryError

    // Aggregate by category
    const categoryMap = new Map<string, number>()
    categoryData?.forEach((item: any) => {
      const category = item.category_id || 'uncategorized'
      const current = categoryMap.get(category) || 0
      categoryMap.set(category, current + (item.total_price || 0))
    })

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    // Get or generate insights
    const { data: cachedInsights } = await (supabase as any)
      .from('user_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Transform cached insights to expected format
    const insights = cachedInsights?.map((insight: any) => ({
      id: insight.id,
      type: insight.insight_type,
      title: insight.title,
      description: insight.description,
      priority: insight.priority,
      icon: getIconForType(insight.insight_type)
    })) || []

    // If new user and no insights, add generic recommendations
    if (isNewUser && insights.length === 0) {
      return NextResponse.json({
        insights: getGenericRecommendations(),
        isNewUser: true,
        totalReceipts: totalReceipts || 0,
        monthlySpending,
        topCategories
      })
    }

    return NextResponse.json({
      insights,
      isNewUser,
      totalReceipts: totalReceipts || 0,
      monthlySpending,
      topCategories
    })

  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

function getIconForType(type: string): string {
  const icons: Record<string, string> = {
    'saving_opportunity': '💰',
    'budget_warning': '⚠️',
    'spending_pattern': '📊',
    'recommendation': '💡',
    'goal_progress': '🎯',
    'category_insight': '📈'
  }
  return icons[type] || '📋'
}

function getGenericRecommendations() {
  return [
    {
      id: 'generic-1',
      type: 'recommendation',
      title: 'Започнете да следите разходите си',
      description: 'Качвайте бонове редовно, за да получите персонализирани анализи за вашите разходи. Prisma автоматично категоризира покупките и ви помага да следите бюджета.',
      priority: 'medium',
      icon: '📸'
    },
    {
      id: 'generic-2',
      type: 'recommendation',
      title: 'Настройте месечен бюджет',
      description: 'Създайте месечен бюджет в настройките, за да получавате предупреждения когато се приближавате към лимита. Това е първата стъпка към по-добро финансово планиране.',
      priority: 'medium',
      icon: '💳'
    },
    {
      id: 'generic-3',
      type: 'recommendation',
      title: 'Категоризирайте разходите си',
      description: 'Разделете разходите си на категории като храна, транспорт, забавления и др. Това ще ви помогне да разберете къде отиват парите ви.',
      priority: 'low',
      icon: '🏷️'
    },
    {
      id: 'generic-4',
      type: 'recommendation',
      title: 'Следете тенденциите',
      description: 'След като качите поне 10-15 бона, Prisma ще може да анализира вашите навици и да ви даде персонализирани препоръки за спестяване.',
      priority: 'low',
      icon: '📈'
    }
  ]
}
