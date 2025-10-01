import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-simple';
import { saveUserCorrection } from '@/lib/categorization-engine';

/**
 * POST /api/categorize/correct
 * Save a user's manual category correction for a product
 * This helps the system learn and improve categorization over time
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, productName, categoryId } = body;

    if (!productName || !categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields: productName, categoryId' },
        { status: 400 }
      );
    }

    console.log('[Category Correction] Saving correction:', {
      itemId,
      productName,
      categoryId,
      userId: user.id,
    });

    // Save the correction to the learning database
    await saveUserCorrection(productName, categoryId, user.id);

    // If itemId is provided, also update the specific item in the database
    if (itemId) {
      // Get category name from categorization engine
      const { CATEGORIES } = await import('@/lib/categorization-engine');
      const category = Object.values(CATEGORIES).find(c => c.id === categoryId);

      if (!category) {
        return NextResponse.json(
          { error: 'Invalid category ID' },
          { status: 400 }
        );
      }

      // Update the item with the corrected category
      const { error: updateError } = await supabase
        .from('items')
        .update({
          category_id: categoryId,
          category_name: category.name,
          category_confidence: 1.0, // User correction has 100% confidence
          category_method: 'user_correction',
        })
        .eq('id', itemId);

      if (updateError) {
        console.error('[Category Correction] Error updating item:', updateError);
        return NextResponse.json(
          { error: 'Failed to update item category' },
          { status: 500 }
        );
      }
    }

    console.log('[Category Correction] Correction saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Category correction saved and will improve future categorizations',
    });
  } catch (error) {
    console.error('[Category Correction] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save category correction' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/categorize/correct
 * Get all available categories for the correction UI
 */
export async function GET() {
  try {
    const { CATEGORIES } = await import('@/lib/categorization-engine');

    return NextResponse.json({
      categories: Object.values(CATEGORIES).map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
      })),
    });
  } catch (error) {
    console.error('[Category Correction] Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
