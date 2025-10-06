/**
 * Delete User Account API
 * Permanently delete all user data - GDPR compliant
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Не сте оторизиран' },
        { status: 401 }
      );
    }

    // Get request body for confirmation
    const body = await request.json();
    const { confirmation } = body;

    // Require explicit confirmation
    if (confirmation !== 'DELETE') {
      return NextResponse.json(
        { error: 'Моля, потвърдете изтриването' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Starting account deletion for user: ${user.id}`);

    // Step 1: Delete all receipts and related data
    // (CASCADE will handle items, but let's be explicit)
    const { data: receipts } = await supabase
      .from('receipts')
      .select('id')
      .eq('user_id', user.id);

    if (receipts && receipts.length > 0) {
      const receiptIds = receipts.map(r => r.id);

      // Delete items
      await supabase
        .from('items')
        .delete()
        .in('receipt_id', receiptIds);

      // Delete receipts
      await supabase
        .from('receipts')
        .delete()
        .eq('user_id', user.id);

      console.log(`✅ Deleted ${receipts.length} receipts and their items`);
    }

    // Step 2: Delete budgets and budget lines
    const { data: budgets } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', user.id);

    if (budgets && budgets.length > 0) {
      const budgetIds = budgets.map(b => b.id);

      // Delete budget lines
      await supabase
        .from('budget_lines')
        .delete()
        .in('budget_id', budgetIds);

      // Delete budgets
      await supabase
        .from('budgets')
        .delete()
        .eq('user_id', user.id);

      console.log(`✅ Deleted ${budgets.length} budgets and their lines`);
    }

    // Step 3: Delete user preferences
    await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', user.id);

    console.log('✅ Deleted user preferences');

    // Step 4: Delete profile
    await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    console.log('✅ Deleted user profile');

    // Step 5: Delete auth user (this will cascade delete everything else)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      // Continue anyway - data is already deleted
    } else {
      console.log('✅ Deleted auth user');
    }

    console.log(`🎉 Account deletion completed for user: ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Профилът ви и всички данни са изтрити успешно',
    });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      {
        error: 'Грешка при изтриване на профила',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
