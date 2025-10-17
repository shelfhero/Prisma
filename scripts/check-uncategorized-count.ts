/**
 * Quick check for uncategorized items
 * Run this before the migration to see how many items need fixing
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUncategorizedCount() {
  console.log('🔍 Checking uncategorized items...\n');

  try {
    // Get total items count
    const { count: totalCount, error: totalError } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Get uncategorized items count
    const { count: uncategorizedCount, error: uncatError } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .is('category_id', null);

    if (uncatError) throw uncatError;

    // Get categorized items count
    const categorizedCount = (totalCount || 0) - (uncategorizedCount || 0);

    // Calculate percentages
    const uncategorizedPercent = totalCount ? (uncategorizedCount! / totalCount * 100).toFixed(1) : 0;
    const categorizedPercent = totalCount ? (categorizedCount / totalCount * 100).toFixed(1) : 0;

    // Display results
    console.log('📊 DATABASE STATISTICS\n');
    console.log('='.repeat(60));
    console.log(`Total Items:        ${totalCount?.toLocaleString() || 0}`);
    console.log(`Categorized:        ${categorizedCount.toLocaleString()} (${categorizedPercent}%)`);
    console.log(`Uncategorized:      ${uncategorizedCount?.toLocaleString() || 0} (${uncategorizedPercent}%)`);
    console.log('='.repeat(60));

    // Show status
    if (uncategorizedCount === 0) {
      console.log('\n✅ All items are categorized! No migration needed.\n');
    } else if (uncategorizedCount! < 100) {
      console.log(`\n⚠️  You have ${uncategorizedCount} uncategorized items.`);
      console.log('   Run: npm run migrate:fix-categories\n');
    } else {
      console.log(`\n❌ You have ${uncategorizedCount} uncategorized items!`);
      console.log('   This will take approximately ' +
        `${Math.ceil(uncategorizedCount! * 0.15 / 60)} minutes to fix.`);
      console.log('   Run: npm run migrate:fix-categories\n');
    }

    // Sample uncategorized items
    if (uncategorizedCount && uncategorizedCount > 0) {
      console.log('📝 Sample uncategorized items:\n');
      const { data: sampleItems } = await supabase
        .from('items')
        .select('product_name, total_price, created_at')
        .is('category_id', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (sampleItems && sampleItems.length > 0) {
        sampleItems.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.product_name} - ${item.total_price} лв`);
        });
      }
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUncategorizedCount();
