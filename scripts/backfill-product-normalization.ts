/**
 * Backfill Product Normalization
 *
 * This script processes existing receipts to populate the product normalization tables:
 * - master_products
 * - product_aliases
 * - price_history
 *
 * Run with: npx tsx scripts/backfill-product-normalization.ts
 */

import { createClient } from '@supabase/supabase-js';
import { ProductNormalizationService } from '../lib/services/product-normalization';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfillProductNormalization() {
  console.log('🚀 Starting product normalization backfill...\n');

  try {
    // Get all receipts with their items and retailer information
    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select(`
        id,
        retailer_id,
        retailers:retailer_id (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (receiptsError) {
      throw receiptsError;
    }

    if (!receipts || receipts.length === 0) {
      console.log('ℹ️  No receipts found to process');
      return;
    }

    console.log(`📄 Found ${receipts.length} receipts to process\n`);

    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let skippedNoRetailer = 0;

    for (const receipt of receipts) {
      console.log(`Processing receipt ${receipt.id}...`);

      // Get retailer ID
      const retailerId = receipt.retailer_id;

      if (!retailerId) {
        console.log(`  ⚠️  Skipping - no retailer info`);
        skippedNoRetailer++;
        continue;
      }

      const retailerName = receipt.retailers?.name || 'Unknown';
      console.log(`  Retailer: ${retailerName}`);

      // Bulk normalize all items in this receipt
      try {
        const result = await ProductNormalizationService.bulkNormalizeReceiptItems(
          receipt.id,
          retailerId
        );

        totalProcessed += result.processed;
        totalSuccessful += result.successful;
        totalFailed += result.failed;

        console.log(`  ✓ Processed ${result.processed} items (${result.successful} successful, ${result.failed} failed)`);
      } catch (error) {
        console.error(`  ✗ Failed to process receipt: ${error}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Backfill complete!');
    console.log('='.repeat(50));
    console.log(`📊 Statistics:`);
    console.log(`   Total items processed: ${totalProcessed}`);
    console.log(`   Successful: ${totalSuccessful}`);
    console.log(`   Failed: ${totalFailed}`);
    console.log(`   Receipts skipped (no retailer): ${skippedNoRetailer}`);
    console.log(`   Success rate: ${totalProcessed > 0 ? ((totalSuccessful / totalProcessed) * 100).toFixed(1) : 0}%`);

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillProductNormalization()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
