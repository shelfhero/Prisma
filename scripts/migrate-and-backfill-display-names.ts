/**
 * Migrate database and backfill display_name for all existing master_products
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/migrate-and-backfill-display-names.ts
 */

import { createClient } from '@supabase/supabase-js';
import { ProductNormalizer } from '../lib/product-normalizer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🚀 Starting migration and backfill process...\n');

  // Step 1: Get all products that need backfilling
  console.log('📦 Fetching products to backfill...');
  const { data: products, error: fetchError } = await supabase
    .from('master_products')
    .select('id, normalized_name, brand, size, unit, fat_content');

  if (fetchError) {
    console.error('❌ Failed to fetch products:', fetchError);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log('✅ No products to backfill');
    return;
  }

  console.log(`📦 Found ${products.length} products to process\n`);

  let successCount = 0;
  let errorCount = 0;

  // Step 2: Process each product
  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    try {
      // Parse the normalized_name back into components
      const components = ProductNormalizer.parseProductName(product.normalized_name);

      // Override with database values if available
      if (product.brand) components.brand = product.brand;
      if (product.size) components.size = product.size;
      if (product.unit) components.unit = product.unit;
      if (product.fat_content) components.fatContent = product.fat_content;

      // Generate display name
      const display_name = ProductNormalizer.createDisplayName(components);

      // Update product
      const { error: updateError } = await supabase
        .from('master_products')
        .update({ display_name })
        .eq('id', product.id);

      if (updateError) {
        console.error(`❌ Failed to update product ${product.id}:`, updateError.message);
        errorCount++;
      } else {
        successCount++;
        if ((i + 1) % 10 === 0 || i === products.length - 1) {
          process.stdout.write(`\r✓ Progress: ${i + 1}/${products.length} (${successCount} success, ${errorCount} errors)`);
        }
      }
    } catch (error: any) {
      console.error(`\n❌ Error processing product ${product.id}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n\n✅ Backfill complete!');
  console.log(`   - Total: ${products.length}`);
  console.log(`   - Success: ${successCount}`);
  console.log(`   - Errors: ${errorCount}`);

  if (successCount > 0) {
    console.log('\n✨ Display names have been added to all products!');
    console.log('   The price-comparison page will now show readable product names.');
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
