import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG AUTH ENDPOINT ===');

    const authHeader = request.headers.get('authorization');
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid auth header');
      return NextResponse.json({
        error: 'No auth header',
        hasAuthHeader: !!authHeader,
        authHeaderStart: authHeader?.substring(0, 10)
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('Token length:', token.length);
    console.log('Token start:', token.substring(0, 20));

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    console.log('Auth error:', authError);
    console.log('User:', user ? { id: user.id, email: user.email } : 'null');

    if (authError || !user) {
      return NextResponse.json({
        error: 'Auth failed',
        authError: authError?.message,
        hasUser: !!user
      }, { status: 401 });
    }

    // Try to fetch receipts count
    const { data: receipts, error: dbError } = await supabase
      .from('receipts')
      .select('id')
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      receiptsCount: receipts?.length || 0,
      dbError: dbError?.message || null
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}