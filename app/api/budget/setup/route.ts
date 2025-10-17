import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-simple';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(true);

    // Try to add missing column to existing budgets table
    console.log('Attempting to fix budget table schema...');

    try {
      // Check if period_type column exists
      const { data: testData, error: testError } = await (supabase as any)
        .from('budgets')
        .select('period_type')
        .limit(1);

      if (testError && testError.message.includes('column budgets.period_type does not exist')) {
        console.log('period_type column missing, table needs to be recreated with proper schema');
        return NextResponse.json({
          success: false,
          error: 'Budget tables need to be recreated with proper schema',
          message: 'Run the SQL script in Supabase dashboard: scripts/create-budget-tables.sql',
          sql_needed: true
        });
      } else {
        console.log('Budget tables have proper schema');
        return NextResponse.json({ success: true });
      }
    } catch (error) {
      console.log('Budget tables do not exist, need to create them');
      return NextResponse.json({
        success: false,
        error: 'Budget tables do not exist',
        message: 'Run the SQL script in Supabase dashboard: scripts/create-budget-tables.sql',
        sql_needed: true
      });
    }
  } catch (error) {
    console.error('Budget setup error:', error);
    return NextResponse.json({ error: 'Failed to setup budget tables' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createServerClient(true);

    // Check if budget tables exist
    const { data: budgetsTable } = await (supabase as any)
      .from('budgets')
      .select('count')
      .limit(1);

    const { data: budgetLinesTable } = await (supabase as any)
      .from('budget_lines')
      .select('count')
      .limit(1);

    return NextResponse.json({
      budgets_table_exists: !!budgetsTable,
      budget_lines_table_exists: !!budgetLinesTable
    });
  } catch (error) {
    // Tables probably don't exist
    return NextResponse.json({
      budgets_table_exists: false,
      budget_lines_table_exists: false
    });
  }
}