import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const NEW_USER_THRESHOLD = 5

export async function POST(request: NextRequest) {
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
      console.error('Auth error in generate-insights:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's spending data
    const spendingData = await getUserSpendingData(supabase, user.id)

    // Check if new user
    const isNewUser = spendingData.totalReceipts < NEW_USER_THRESHOLD

    let insights

    if (isNewUser) {
      // Return generic recommendations for new users
      insights = getGenericRecommendations()
    } else {
      // Generate AI insights for users with enough data
      insights = await generateAIInsights(spendingData, user.id)
    }

    // Store insights in database
    await storeInsights(supabase, user.id, insights)

    // Return analytics data
    return NextResponse.json({
      insights,
      isNewUser,
      totalReceipts: spendingData.totalReceipts,
      monthlySpending: spendingData.monthlySpending,
      topCategories: spendingData.topCategories
    })

  } catch (error) {
    console.error('Error generating insights:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}

async function getUserSpendingData(supabase: any, userId: string) {
  // Get receipts
  const { data: receipts, error: receiptsError } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (receiptsError) throw receiptsError

  // Get items with categories - join with receipts to filter by user
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('*, receipts!inner(user_id)')
    .eq('receipts.user_id', userId)

  if (itemsError) throw itemsError

  // Get user budget
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('monthly_budget')
    .eq('user_id', userId)
    .single()

  // Calculate monthly spending
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const monthlyReceipts = receipts?.filter((r: any) =>
    new Date(r.created_at) >= startOfMonth
  ) || []

  const monthlySpending = monthlyReceipts.reduce(
    (sum: number, receipt: any) => sum + (receipt.total_amount || 0),
    0
  )

  // Aggregate by category
  const categoryMap = new Map<string, number>()
  items?.forEach((item: any) => {
    const category = item.category_name || item.category_id || 'Некатегоризирано'
    const current = categoryMap.get(category) || 0
    categoryMap.set(category, current + (item.total_price || 0))
  })

  const topCategories = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  // Calculate week-over-week trends
  const lastWeek = new Date()
  lastWeek.setDate(lastWeek.getDate() - 7)

  const previousWeek = new Date()
  previousWeek.setDate(previousWeek.getDate() - 14)

  const lastWeekSpending = receipts
    ?.filter((r: any) => {
      const date = new Date(r.created_at)
      return date >= lastWeek
    })
    .reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0) || 0

  const previousWeekSpending = receipts
    ?.filter((r: any) => {
      const date = new Date(r.created_at)
      return date >= previousWeek && date < lastWeek
    })
    .reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0) || 0

  return {
    totalReceipts: receipts?.length || 0,
    monthlySpending,
    monthlyBudget: profile?.monthly_budget || null,
    topCategories,
    receipts: receipts || [],
    items: items || [],
    lastWeekSpending,
    previousWeekSpending,
    spendingTrend: previousWeekSpending > 0
      ? ((lastWeekSpending - previousWeekSpending) / previousWeekSpending * 100)
      : 0
  }
}

async function generateAIInsights(spendingData: any, userId: string) {
  const prompt = `Analyze the following spending data and provide 4-6 personalized financial insights and recommendations in Bulgarian language.

User Spending Data:
- Total receipts: ${spendingData.totalReceipts}
- Monthly spending: ${spendingData.monthlySpending.toFixed(2)} BGN
- Monthly budget: ${spendingData.monthlyBudget ? spendingData.monthlyBudget + ' BGN' : 'Not set'}
- Last week spending: ${spendingData.lastWeekSpending.toFixed(2)} BGN
- Previous week spending: ${spendingData.previousWeekSpending.toFixed(2)} BGN
- Spending trend: ${spendingData.spendingTrend > 0 ? '+' : ''}${spendingData.spendingTrend.toFixed(1)}%

Top Categories:
${spendingData.topCategories.slice(0, 5).map((cat: any) => `- ${cat.category}: ${cat.amount.toFixed(2)} BGN`).join('\n')}

For each insight, provide:
1. Type: one of (saving_opportunity, budget_warning, spending_pattern, recommendation, goal_progress, category_insight)
2. Title: Short, actionable title in Bulgarian
3. Description: Detailed explanation (2-3 sentences) in Bulgarian
4. Priority: high, medium, or low

Focus on:
- Budget alerts if overspending
- Spending patterns and trends
- Category-specific insights (e.g., if spending a lot on dining out)
- Practical saving opportunities
- Comparison with previous periods

Return ONLY a valid JSON array of insights, no other text:
[
  {
    "type": "budget_warning",
    "title": "Example title",
    "description": "Example description",
    "priority": "high"
  }
]`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a financial advisor AI that provides personalized insights in Bulgarian. Always respond with valid JSON only, no markdown formatting or code blocks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const responseText = completion.choices[0].message.content?.trim() || '[]'

    // Remove markdown code blocks if present
    let cleanedResponse = responseText
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '')
    }

    const aiInsights = JSON.parse(cleanedResponse)

    // Add IDs and icons to insights
    return aiInsights.map((insight: any, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      type: insight.type,
      title: insight.title,
      description: insight.description,
      priority: insight.priority,
      icon: getIconForType(insight.type)
    }))

  } catch (error) {
    console.error('Error calling OpenAI:', error)
    // Fall back to generic recommendations
    return getGenericRecommendations()
  }
}

async function storeInsights(supabase: any, userId: string, insights: any[]) {
  // Delete old insights (keep only last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  await (supabase as any)
    .from('user_insights')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', thirtyDaysAgo.toISOString())

  // Insert new insights
  const insightsToInsert = insights.map((insight: any) => ({
    user_id: userId,
    insight_type: insight.type,
    title: insight.title,
    description: insight.description,
    priority: insight.priority,
    created_at: new Date().toISOString()
  }))

  await (supabase as any)
    .from('user_insights')
    .insert(insightsToInsert)
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
    },
    {
      id: 'generic-5',
      type: 'recommendation',
      title: 'Редовно преглеждайте статистиките',
      description: 'Проверявайте месечните си разходи и сравнявайте категориите, за да откриете възможности за спестяване. Малките промени в навиците могат да доведат до големи спестявания.',
      priority: 'low',
      icon: '💡'
    }
  ]
}
