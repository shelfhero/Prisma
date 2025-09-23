import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-simple';

// GET - Fetch all categories
export async function GET(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Неоторизиран достъп' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Невалиден токен за достъп' },
        { status: 401 }
      );
    }

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