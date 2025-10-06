/**
 * Export User Data API
 * GDPR-compliant data export in JSON or CSV format
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
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

    // Get format from query params
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    console.log(`📦 Exporting data for user: ${user.id} (format: ${format})`);

    // Collect all user data
    const exportData: any = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
    };

    // 1. Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    exportData.profile = profile;

    // 2. Receipts with items
    const { data: receipts } = await supabase
      .from('receipts')
      .select(`
        *,
        retailers (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false });

    const receiptIds = receipts?.map(r => r.id) || [];

    // Get items for receipts
    let items: any[] = [];
    if (receiptIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('items')
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .in('receipt_id', receiptIds);

      items = itemsData || [];
    }

    // Group items by receipt
    const receiptsWithItems = receipts?.map(receipt => ({
      ...receipt,
      items: items.filter(item => item.receipt_id === receipt.id),
    }));

    exportData.receipts = receiptsWithItems;

    // 3. Budgets with lines
    const { data: budgets } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const budgetIds = budgets?.map(b => b.id) || [];

    let budgetLines: any[] = [];
    if (budgetIds.length > 0) {
      const { data: linesData } = await supabase
        .from('budget_lines')
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .in('budget_id', budgetIds);

      budgetLines = linesData || [];
    }

    const budgetsWithLines = budgets?.map(budget => ({
      ...budget,
      lines: budgetLines.filter(line => line.budget_id === budget.id),
    }));

    exportData.budgets = budgetsWithLines;

    // 4. User preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    exportData.preferences = preferences;

    // 5. Statistics
    exportData.statistics = {
      total_receipts: receipts?.length || 0,
      total_items: items.length,
      total_budgets: budgets?.length || 0,
      total_spent: receipts?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0,
    };

    console.log(`✅ Data collected for export:`, {
      receipts: exportData.receipts?.length,
      items: items.length,
      budgets: exportData.budgets?.length,
    });

    // Return in requested format
    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(exportData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="prizma-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      // Return JSON
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="prizma-export-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }
  } catch (error: any) {
    console.error('Data export error:', error);
    return NextResponse.json(
      {
        error: 'Грешка при експортиране на данните',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Convert export data to CSV format
 */
function convertToCSV(data: any): string {
  const lines: string[] = [];

  // CSV Header
  lines.push('ПРИЗМА - ЕКСПОРТ НА ДАННИ');
  lines.push(`Дата на експорт: ${new Date(data.export_date).toLocaleDateString('bg-BG')}`);
  lines.push(`Потребител: ${data.user_email}`);
  lines.push('');

  // Receipts CSV
  lines.push('КАСОВИ БЕЛЕЖКИ');
  lines.push('Дата,Магазин,Обща сума,Брой продукти');

  data.receipts?.forEach((receipt: any) => {
    lines.push(
      `${new Date(receipt.purchased_at).toLocaleDateString('bg-BG')},` +
        `${receipt.retailers?.name || 'Неизвестен'},` +
        `${receipt.total_amount} лв,` +
        `${receipt.items?.length || 0}`
    );
  });

  lines.push('');

  // Items CSV
  lines.push('ПРОДУКТИ');
  lines.push('Дата,Магазин,Продукт,Категория,Количество,Цена');

  data.receipts?.forEach((receipt: any) => {
    receipt.items?.forEach((item: any) => {
      lines.push(
        `${new Date(receipt.purchased_at).toLocaleDateString('bg-BG')},` +
          `${receipt.retailers?.name || 'Неизвестен'},` +
          `${item.product_name},` +
          `${item.categories?.name || 'Некатегоризирано'},` +
          `${item.qty},` +
          `${item.total_price} лв`
      );
    });
  });

  lines.push('');

  // Statistics
  lines.push('СТАТИСТИКА');
  lines.push(`Общо касови бележки: ${data.statistics.total_receipts}`);
  lines.push(`Общо продукти: ${data.statistics.total_items}`);
  lines.push(`Общо похарчено: ${data.statistics.total_spent.toFixed(2)} лв`);

  return lines.join('\n');
}
