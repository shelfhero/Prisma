import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-simple';

// GET - Fetch all categories
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(true); // Use service key for API routes

    // Fetch all categories (they are global, not user-specific)
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');

    if (categoriesError) {
      console.error('Categories fetch error:', categoriesError);
      return NextResponse.json(
        { error: 'Грешка при извличане на категориите' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      categories: categories || []
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Вътрешна грешка на сървъра' },
      { status: 500 }
    );
  }
}