import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-simple';

/**
 * Cleanup duplicate budget_lines
 *
 * Removes duplicate budget lines for the same budget_id and category_id,
 * keeping only the most recent one (highest id)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(true);

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Cleaning up duplicate budget lines for user:', user.id);

    // Get all budget_lines for this user's budgets
    const { data: budgets } = await (supabase as any)
      .from('budgets')
      .select('id')
      .eq('user_id', user.id);

    if (!budgets || budgets.length === 0) {
      return NextResponse.json({ message: 'No budgets found', deleted: 0 });
    }

    const budgetIds = budgets.map((b: any) => b.id);

    // Get all budget lines for these budgets
    const { data: allLines } = await (supabase as any)
      .from('budget_lines')
      .select('*')
      .in('budget_id', budgetIds)
      .order('id', { ascending: false }); // Latest first

    if (!allLines || allLines.length === 0) {
      return NextResponse.json({ message: 'No budget lines found', deleted: 0 });
    }

    // Group by budget_id and category_id, keep only the first (latest) one
    const linesToKeep = new Map<string, number>();
    const linesToDelete: number[] = [];

    allLines.forEach((line: any) => {
      const key = `${line.budget_id}-${line.category_id}`;

      if (!linesToKeep.has(key)) {
        // Keep this line (it's the latest due to ordering)
        linesToKeep.set(key, line.id);
      } else {
        // Mark for deletion (it's a duplicate)
        linesToDelete.push(line.id);
      }
    });

    console.log('Found duplicates:', linesToDelete.length);
    console.log('Keeping unique lines:', linesToKeep.size);

    if (linesToDelete.length === 0) {
      return NextResponse.json({
        message: 'No duplicates found',
        deleted: 0,
        total_lines: allLines.length,
        unique_lines: linesToKeep.size
      });
    }

    // Delete the duplicates
    const { error: deleteError } = await (supabase as any)
      .from('budget_lines')
      .delete()
      .in('id', linesToDelete);

    if (deleteError) {
      console.error('Error deleting duplicates:', deleteError);
      throw deleteError;
    }

    console.log('Successfully deleted', linesToDelete.length, 'duplicate budget lines');

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${linesToDelete.length} duplicate budget lines`,
      deleted: linesToDelete.length,
      total_lines: allLines.length,
      unique_lines: linesToKeep.size
    });

  } catch (error) {
    console.error('Budget cleanup error:', error);
    return NextResponse.json({
      error: 'Failed to cleanup budget lines',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
