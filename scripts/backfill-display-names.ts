/**
 * Backfill display_name for all existing master_products
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/backfill-display-names.ts
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

async function backfillDisplayNames() {
  console.log('🔄 Starting display name backfill...\n');

  try {
    // Get all master products
    const { data: products, error: fetchError } = await supabase
      .from('master_products')
      .select('id, normalized_name, brand, size, unit, fat_content')
      .is('display_name', null); // Only get products without display_name

    if (fetchError) {
      throw fetchError;
    }

    if (!products || products.length === 0) {
      console.log('✅ No products need display name backfill');
      return;
    }

    console.log(`📦 Found ${products.length} products to update\n`);

    let successCount = 0;
    let errorCount = 0;

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(products.length / batchSize)}...`);

      const updates = batch.map(product => {
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

          return {
            id: product.id,
            display_name
          };
        } catch (error) {
          console.error(`Error processing product ${product.id}:`, error);
          errorCount++;
          return null;
        }
      }).filter(Boolean);

      // Update in batch
      for (const update of updates) {
        if (!update) continue;

        const { error: updateError } = await supabase
          .from('master_products')
          .update({ display_name: update.display_name })
          .eq('id', update.id);

        if (updateError) {
          console.error(`Failed to update product ${update.id}:`, updateError.message);
          errorCount++;
        } else {
          successCount++;
          if (successCount % 10 === 0) {
            process.stdout.write(`✓ Updated ${successCount}/${products.length}\r`);
          }
        }
      }
    }

    console.log('\n');
    console.log('✅ Backfill complete!');
    console.log(`   - Success: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillDisplayNames();
