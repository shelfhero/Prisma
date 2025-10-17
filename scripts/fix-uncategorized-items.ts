/**
 * Fix Uncategorized Items Migration Script
 *
 * This script:
 * 1. Finds all items without a category_id
 * 2. Uses the enhanced categorization engine to categorize them
 * 3. Updates the database with proper categories
 * 4. Provides progress tracking and statistics
 */

import { createClient } from '@supabase/supabase-js';
import { categorizeProduct, CATEGORIES } from '../lib/categorization-engine';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UncategorizedItem {
  id: number;
  product_name: string;
  receipt_id: number;
}

interface CategoryStats {
  [key: string]: {
    name: string;
    count: number;
    method: {
      cache: number;
      rule: number;
      store_pattern: number;
      ai: number;
      user_correction: number;
    };
  };
}

async function fixUncategorizedItems() {
  console.log('🔧 Starting Uncategorized Items Migration\n');
  console.log('='.repeat(80));

  try {
    // Step 1: Verify database connection
    console.log('\n📡 Verifying database connection...');
    const { data: testData, error: testError } = await supabase
      .from('items')
      .select('count')
      .limit(1);

    if (testError) {
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    console.log('✅ Database connection successful');

    // Step 2: Load categories from database and create mapping
    console.log('\n🏷️  Loading categories from database...');
    const { data: existingCategories, error: catError } = await supabase
      .from('categories')
      .select('id, name');

    if (catError) {
      throw new Error(`Failed to load categories: ${catError.message}`);
    }

    if (!existingCategories || existingCategories.length === 0) {
      throw new Error('No categories found in database!');
    }

    console.log(`✅ Found ${existingCategories.length} categories in database`);

    // Create mapping from category names to database IDs
    const categoryNameToId: Record<string, number> = {};
    existingCategories.forEach(cat => {
      console.log(`   - ${cat.name} (ID: ${cat.id})`);
      categoryNameToId[cat.name.toLowerCase()] = cat.id;
    });

    // Mapping function from categorization engine names to database IDs
    function mapCategoryNameToId(categoryName: string): number {
      const normalized = categoryName.toLowerCase();

      // Direct name matches
      if (categoryNameToId[normalized]) {
        return categoryNameToId[normalized];
      }

      // Map categorization engine names to database names
      const mapping: Record<string, string> = {
        'основни храни': 'основни храни',
        'готови храни': 'готови храни',
        'снакове': 'закуски', // Map Снакове -> Закуски
        'напитки': 'напитки',
        'домакински': 'нехранителни', // Map Домакински -> Нехранителни
        'лична хигиена': 'козметика и хигиена', // Map Лична хигиена -> Козметика и хигиена
        'други': 'други',
      };

      const dbName = mapping[normalized];
      if (dbName && categoryNameToId[dbName.toLowerCase()]) {
        return categoryNameToId[dbName.toLowerCase()];
      }

      // Default to "Други" if no match
      return categoryNameToId['други'] || categoryNameToId['некатегоризирано'] || 9;
    }

    // Step 3: Get all uncategorized items
    console.log('\n🔍 Fetching uncategorized items...');
    const { data: items, error: fetchError } = await supabase
      .from('items')
      .select('id, product_name, receipt_id')
      .is('category_id', null)
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Error fetching items: ${fetchError.message}`);
    }

    if (!items || items.length === 0) {
      console.log('✅ No uncategorized items found! All items are already categorized.');
      return;
    }

    console.log(`📦 Found ${items.length} uncategorized items to process`);

    // Step 4: Process items in batches
    console.log('\n⚙️  Starting categorization process...\n');

    const batchSize = 10;
    const stats: CategoryStats = {};
    let fixed = 0;
    let failed = 0;
    const startTime = Date.now();

    // Initialize stats for all categories
    Object.values(CATEGORIES).forEach(cat => {
      stats[cat.id] = {
        name: cat.name,
        count: 0,
        method: {
          cache: 0,
          rule: 0,
          store_pattern: 0,
          ai: 0,
          user_correction: 0,
        }
      };
    });

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Process batch
      await Promise.all(batch.map(async (item: UncategorizedItem) => {
        try {
          // Get store name and user from receipt (if available)
          const { data: receipt } = await supabase
            .from('receipts')
            .select('retailer_name, user_id')
            .eq('id', item.receipt_id)
            .single();

          const storeName = receipt?.retailer_name;
          const userId = receipt?.user_id;

          // Categorize the product
          const result = await categorizeProduct(
            item.product_name,
            storeName,
            userId || undefined
          );

          // Map category name to database ID
          const dbCategoryId = mapCategoryNameToId(result.category_name);

          // Update the item with category
          const { error: updateError } = await supabase
            .from('items')
            .update({
              category_id: dbCategoryId
            })
            .eq('id', item.id);

          if (updateError) {
            console.error(`   ❌ Error updating item ${item.id}: ${updateError.message}`);
            failed++;
          } else {
            fixed++;

            // Update statistics (use category name for stats)
            const statKey = result.category_name.toLowerCase();
            if (!stats[statKey]) {
              stats[statKey] = {
                name: result.category_name,
                count: 0,
                method: { cache: 0, rule: 0, store_pattern: 0, ai: 0, user_correction: 0 }
              };
            }
            stats[statKey].count++;
            stats[statKey].method[result.method as keyof typeof stats[string]['method']]++;

            // Log progress
            if (fixed % 10 === 0 || fixed === items.length) {
              const progress = ((fixed + failed) / items.length * 100).toFixed(1);
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
              console.log(`   Progress: ${fixed + failed}/${items.length} (${progress}%) | Fixed: ${fixed} | Failed: ${failed} | Time: ${elapsed}s`);
            }
          }
        } catch (error) {
          console.error(`   ❌ Error processing item ${item.id} (${item.product_name}):`, error);
          failed++;
        }
      }));

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Step 5: Print statistics
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 MIGRATION STATISTICS\n');
    console.log(`Total Items Processed: ${items.length}`);
    console.log(`Successfully Fixed: ${fixed} (${(fixed/items.length*100).toFixed(1)}%)`);
    console.log(`Failed: ${failed} (${(failed/items.length*100).toFixed(1)}%)`);
    console.log(`Total Time: ${totalTime}s`);
    console.log(`Average Time per Item: ${(parseFloat(totalTime) / items.length).toFixed(3)}s`);

    // Category breakdown
    console.log('\n📂 Category Breakdown:\n');
    Object.entries(stats)
      .filter(([_, data]) => data.count > 0)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([categoryId, data]) => {
        const category = Object.values(CATEGORIES).find(c => c.id === categoryId);
        const icon = category?.icon || '📦';
        console.log(`${icon} ${data.name}: ${data.count} (${(data.count/fixed*100).toFixed(1)}%)`);

        // Show method breakdown for this category
        const methods = Object.entries(data.method)
          .filter(([_, count]) => count > 0)
          .map(([method, count]) => `${method}: ${count}`)
          .join(', ');

        if (methods) {
          console.log(`   Methods: ${methods}`);
        }
      });

    // Categorization method statistics
    console.log('\n🎯 Categorization Methods:\n');
    const totalMethods = Object.values(stats).reduce((acc, cat) => ({
      cache: acc.cache + cat.method.cache,
      rule: acc.rule + cat.method.rule,
      store_pattern: acc.store_pattern + cat.method.store_pattern,
      ai: acc.ai + cat.method.ai,
      user_correction: acc.user_correction + cat.method.user_correction,
    }), { cache: 0, rule: 0, store_pattern: 0, ai: 0, user_correction: 0 });

    Object.entries(totalMethods).forEach(([method, count]) => {
      if (count > 0) {
        console.log(`   ${method}: ${count} (${(count/fixed*100).toFixed(1)}%)`);
      }
    });

    // Step 6: Verify results
    console.log('\n🔍 Verifying results...');
    const { count: remainingCount, error: verifyError } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .is('category_id', null);

    if (verifyError) {
      console.error('⚠️  Could not verify results:', verifyError.message);
    } else {
      console.log(`✅ Remaining uncategorized items: ${remainingCount || 0}`);
    }

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ MIGRATION COMPLETE!\n');

    if (failed > 0) {
      console.log(`⚠️  Warning: ${failed} items failed to update. Please review the logs above.`);
    }

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED\n');
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
console.log('🚀 Uncategorized Items Migration Script');
console.log('   This script will categorize all items without a category_id\n');

fixUncategorizedItems()
  .then(() => {
    console.log('\n👋 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
