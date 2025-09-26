import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-simple';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Test basic connection
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        hasUser: false
      });
    }

    return NextResponse.json({
      success: true,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to test auth'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, email, password, fullName } = await request.json();
    const supabase = createServerClient();

    if (action === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message
        });
      }

      return NextResponse.json({
        success: true,
        user: data.user,
        session: data.session
      });
    }

    if (action === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message
        });
      }

      return NextResponse.json({
        success: true,
        user: data.user,
        session: data.session
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}