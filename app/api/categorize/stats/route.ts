import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-simple';
import { getCategorizationStats } from '@/lib/categorization-engine';

/**
 * GET /api/categorize/stats
 * Get categorization statistics and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get engine stats (cache size, categories)
    const engineStats = getCategorizationStats();

    // Get user's item categorization breakdown
    // First get user's receipt IDs
    const { data: receipts } = await supabase
      .from('receipts')
      .select('id')
      .eq('user_id', user.id);

    const receiptIds = receipts?.map(r => r.id) || [];

    const { data: items } = await supabase
      .from('items')
      .select('category_id, category_method, category_confidence')
      .in('receipt_id', receiptIds);

    // Calculate stats
    const totalItems = items?.length || 0;
    const categorizedItems = items?.filter(i => i.category_id && i.category_id !== 'other').length || 0;
    const uncategorizedItems = items?.filter(i => !i.category_id || i.category_id === 'other').length || 0;

    // Breakdown by method
    const methodBreakdown = items?.reduce((acc, item) => {
      const method = item.category_method || 'unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Breakdown by category
    const categoryBreakdown = items?.reduce((acc, item) => {
      const category = item.category_id || 'uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Average confidence
    const avgConfidence = items?.length
      ? items.reduce((sum, item) => sum + (item.category_confidence || 0), 0) / items.length
      : 0;

    // Get user's correction count
    const { count: correctionsCount } = await supabase
      .from('categorization_corrections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      engine: {
        cacheSize: engineStats.cacheSize,
        availableCategories: engineStats.categories.length,
      },
      user: {
        totalItems,
        categorizedItems,
        uncategorizedItems,
        categorizationRate: totalItems > 0 ? (categorizedItems / totalItems) * 100 : 0,
        averageConfidence: avgConfidence,
        userCorrections: correctionsCount || 0,
      },
      breakdown: {
        byMethod: methodBreakdown,
        byCategory: categoryBreakdown,
      },
    });
  } catch (error) {
    console.error('[Categorization Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categorization stats' },
      { status: 500 }
    );
  }
}
