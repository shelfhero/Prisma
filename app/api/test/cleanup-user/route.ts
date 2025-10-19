/**
 * API endpoint to delete test users
 * Requires service role key for admin privileges
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-simple';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    console.log('[cleanup-user] Request to delete user:', email);

    if (!email) {
      console.error('[cleanup-user] No email provided');
      return NextResponse.json(
        { error: 'Email е задължителен' },
        { status: 400 }
      );
    }

    // Only allow deletion of test users
    if (!email.includes('test') && !email.includes('demo')) {
      console.error('[cleanup-user] Attempted to delete non-test user:', email);
      return NextResponse.json(
        { error: 'Може да изтривате само тестови потребители (email трябва да съдържа "test" или "demo")' },
        { status: 403 }
      );
    }

    // Create admin client with service role key
    console.log('[cleanup-user] Creating admin client...');
    const supabase = createServerClient(true);
    console.log('[cleanup-user] Admin client created successfully');

    // Get user by email
    console.log('[cleanup-user] Fetching users list...');
    const { data: { users }, error: fetchError } = await supabase.auth.admin.listUsers();

    if (fetchError) {
      console.error('[cleanup-user] Error fetching users:', fetchError);
      return NextResponse.json(
        { error: `Грешка при намиране на потребител: ${fetchError.message}` },
        { status: 500 }
      );
    }

    console.log('[cleanup-user] Found', users?.length, 'total users');
    const user = users.find((u: any) => u.email === email);

    if (!user) {
      console.error('[cleanup-user] User not found:', email);
      return NextResponse.json(
        { error: `Потребител с email ${email} не е намерен` },
        { status: 404 }
      );
    }

    console.log('[cleanup-user] Found user:', user.id, user.email);

    // Delete all user data first (receipts will cascade delete items)
    const { error: receiptsError } = await supabase
      .from('receipts')
      .delete()
      .eq('user_id', user.id);

    if (receiptsError) {
      console.warn('Error deleting receipts:', receiptsError.message);
    }

    // Delete user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.warn('Error deleting profile:', profileError.message);
    }

    // Delete user from auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json(
        { error: `Грешка при изтриване на потребител: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Потребител ${email} е изтрит успешно`,
      deletedUserId: user.id
    });

  } catch (error: any) {
    console.error('Error in cleanup-user API:', error);
    return NextResponse.json(
      { error: error.message || 'Възникна грешка' },
      { status: 500 }
    );
  }
}
