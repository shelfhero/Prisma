/**
 * Re-normalize ALL products using the improved normalization logic
 * This will fix products that were incorrectly normalized (e.g., "kinder" → "kinder country")
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/re-normalize-all-products.ts
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

async function reNormalizeAllProducts() {
  console.log('🔄 Re-normalizing all products with improved logic...\n');

  // Get all items with their original product names
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, product_name, raw_product_name, master_product_id')
    .not('master_product_id', 'is', null);

  if (itemsError) {
    console.error('❌ Failed to fetch items:', itemsError);
    process.exit(1);
  }

  console.log(`📦 Found ${items?.length || 0} items to process\n`);

  // Group items by master_product_id to get original names
  const productOriginalNames = new Map<number, string>();

  items?.forEach(item => {
    const originalName = item.raw_product_name || item.product_name;
    const masterProductId = item.master_product_id;

    if (masterProductId && originalName) {
      // Keep the first (or longest) original name we find
      const existing = productOriginalNames.get(masterProductId);
      if (!existing || originalName.length > existing.length) {
        productOriginalNames.set(masterProductId, originalName);
      }
    }
  });

  console.log(`🔍 Found ${productOriginalNames.size} unique products to re-normalize\n`);

  let successCount = 0;
  let errorCount = 0;
  let unchangedCount = 0;

  // Re-normalize each product
  for (const [masterProductId, originalName] of productOriginalNames.entries()) {
    try {
      // Use improved normalizer
      const result = ProductNormalizer.normalize(originalName);

      // Get current product data
      const { data: currentProduct } = await supabase
        .from('master_products')
        .select('normalized_name, display_name')
        .eq('id', masterProductId)
        .single();

      // Check if normalization changed
      if (currentProduct?.normalized_name === result.normalized_name) {
        unchangedCount++;
        continue;
      }

      // Update the product
      const { error: updateError } = await supabase
        .from('master_products')
        .update({
          normalized_name: result.normalized_name,
          display_name: result.display_name,
          brand: result.components.brand || null,
          size: result.components.size || null,
          unit: result.components.unit || null,
          fat_content: result.components.fatContent || null,
          keywords: result.keywords,
        })
        .eq('id', masterProductId);

      if (updateError) {
        console.error(`❌ Failed to update product ${masterProductId}:`, updateError.message);
        errorCount++;
      } else {
        successCount++;
        if (currentProduct) {
          console.log(`✓ Updated: "${currentProduct.display_name}" → "${result.display_name}"`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error processing product ${masterProductId}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n✅ Re-normalization complete!');
  console.log(`   - Total products: ${productOriginalNames.size}`);
  console.log(`   - Updated: ${successCount}`);
  console.log(`   - Unchanged: ${unchangedCount}`);
  console.log(`   - Errors: ${errorCount}`);

  if (successCount > 0) {
    console.log('\n✨ Products have been re-normalized with full names!');
    console.log('   Refresh the price-comparison page to see the improvements.');
  }
}

reNormalizeAllProducts().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
