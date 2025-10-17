/**
 * Re-Normalize All Master Products Script
 *
 * Updates all existing master products with new normalized names
 * using the improved product name normalizer.
 */

import { createClient } from '@supabase/supabase-js';
import { normalizeProductName, getProductComponents } from '../lib/product-name-normalizer';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface MasterProduct {
  id: number;
  normalized_name: string;
  brand?: string;
  size?: number;
  unit?: string;
  category_id?: number;
  base_product_name?: string;
  product_type?: string;
  fat_content?: number;
  barcode?: string;
  keywords?: string[];
}

interface UpdateStats {
  total: number;
  updated: number;
  unchanged: number;
  errors: number;
  improvements: {
    addedBrand: number;
    addedSize: number;
    addedType: number;
    fixedFormat: number;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const BATCH_SIZE = 50;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

async function reNormalizeAllProducts() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           MASTER PRODUCTS RE-NORMALIZATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made to the database\n');
  }

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Validate connection
  console.log('📡 Connecting to database...');
  const { error: pingError } = await supabase.from('master_products').select('id').limit(1);
  if (pingError) {
    console.error('❌ Database connection failed:', pingError.message);
    process.exit(1);
  }
  console.log('✅ Connected successfully\n');

  // Fetch all master products
  console.log('📥 Fetching master products...');
  const { data: products, error } = await supabase
    .from('master_products')
    .select('id, normalized_name, brand, size, unit, category_id, base_product_name, product_type')
    .order('created_at', { ascending: false });

  if (error || !products) {
    console.error('❌ Error fetching products:', error?.message || 'No data');
    process.exit(1);
  }

  console.log(`✅ Found ${products.length} master products\n`);

  // Create backup (only in non-dry-run mode)
  if (!DRY_RUN) {
    console.log('💾 Creating backup...');
    await createBackup(supabase, products);
    console.log('✅ Backup created\n');
  }

  // Initialize stats
  const stats: UpdateStats = {
    total: products.length,
    updated: 0,
    unchanged: 0,
    errors: 0,
    improvements: {
      addedBrand: 0,
      addedSize: 0,
      addedType: 0,
      fixedFormat: 0
    }
  };

  // Process products
  console.log('🔄 Processing products...\n');
  console.log('─'.repeat(70));

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    try {
      // Get aliases to find original names
      const { data: aliases } = await supabase
        .from('product_aliases')
        .select('alias_name')
        .eq('master_product_id', product.id)
        .limit(5);

      // Use the best available name for normalization
      const bestName = getBestOriginalName(product, aliases || []);

      // Normalize the name
      const newNormalizedName = normalizeProductName(bestName);
      const components = getProductComponents(bestName);

      // Check if update is needed
      const needsUpdate = shouldUpdate(product, newNormalizedName, components);

      if (needsUpdate) {
        // Track improvements
        trackImprovements(stats, product, components);

        // Update the product
        if (!DRY_RUN) {
          const { error: updateError } = await supabase
            .from('master_products')
            .update({
              normalized_name: newNormalizedName,
              brand: components.brand || product.brand,
              size: components.size || product.size,
              unit: components.unit || product.unit,
              product_type: components.type || product.product_type,
              base_product_name: components.baseProduct || product.base_product_name,
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id);

          if (updateError) {
            console.error(`❌ Error updating product ${product.id}:`, updateError.message);
            stats.errors++;
            continue;
          }
        }

        stats.updated++;

        if (VERBOSE) {
          console.log(`\n${i + 1}. UPDATED`);
          console.log(`   ID: ${product.id}`);
          console.log(`   Old: ${product.normalized_name}`);
          console.log(`   New: ${newNormalizedName}`);
          if (components.brand) console.log(`   Brand: ${components.brand}`);
          if (components.size && components.unit) {
            console.log(`   Size: ${components.size}${components.unit}`);
          }
        } else {
          // Show progress
          if (stats.updated % 10 === 0) {
            process.stdout.write(`\r📊 Progress: ${i + 1}/${products.length} | Updated: ${stats.updated}`);
          }
        }
      } else {
        stats.unchanged++;
      }

    } catch (error) {
      console.error(`\n❌ Error processing product ${product.id}:`, error);
      stats.errors++;
    }
  }

  // Clear progress line
  if (!VERBOSE) {
    process.stdout.write('\r' + ' '.repeat(70) + '\r');
  }

  console.log('─'.repeat(70));
  console.log('\n✅ Processing complete!\n');

  // Display statistics
  displayStats(stats);

  // Verify updates
  if (!DRY_RUN && stats.updated > 0) {
    console.log('\n🔍 Verifying updates...');
    await verifyUpdates(supabase, stats.updated);
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets the best original name for normalization
 */
function getBestOriginalName(
  product: MasterProduct,
  aliases: { alias_name: string }[]
): string {
  // Prefer the current normalized name if it has good info
  if (product.normalized_name && product.normalized_name.length > 5) {
    return product.normalized_name;
  }

  // Otherwise use the first alias
  if (aliases.length > 0) {
    return aliases[0].alias_name;
  }

  // Fallback to normalized name
  return product.normalized_name || 'Unknown Product';
}

/**
 * Determines if a product needs updating
 */
function shouldUpdate(
  product: MasterProduct,
  newName: string,
  components: ReturnType<typeof getProductComponents>
): boolean {
  // Different normalized name
  if (product.normalized_name !== newName) {
    return true;
  }

  // New brand detected
  if (components.brand && !product.brand) {
    return true;
  }

  // New size/unit detected
  if ((components.size && !product.size) || (components.unit && !product.unit)) {
    return true;
  }

  return false;
}

/**
 * Tracks improvements made during normalization
 */
function trackImprovements(
  stats: UpdateStats,
  product: MasterProduct,
  components: ReturnType<typeof getProductComponents>
) {
  if (components.brand && !product.brand) {
    stats.improvements.addedBrand++;
  }

  if (components.size && !product.size) {
    stats.improvements.addedSize++;
  }

  if (components.type) {
    stats.improvements.addedType++;
  }

  // Check if format was improved (has more structure)
  const oldParts = product.normalized_name.split(' ').length;
  const newParts = (components.baseProduct + ' ' +
                    (components.brand || '') + ' ' +
                    (components.type || '')).trim().split(' ').length;

  if (newParts > oldParts) {
    stats.improvements.fixedFormat++;
  }
}

/**
 * Creates a backup of current master products
 */
async function createBackup(supabase: any, products: MasterProduct[]) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupData = {
    timestamp,
    count: products.length,
    products: products.map(p => ({
      id: p.id,
      normalized_name: p.normalized_name,
      brand: p.brand,
      size: p.size,
      unit: p.unit
    }))
  };

  // Store backup in a backup table (if exists) or log to file
  try {
    const { error } = await supabase
      .from('product_normalization_backups')
      .insert({
        backup_date: new Date().toISOString(),
        product_count: products.length,
        backup_data: backupData
      });

    if (error) {
      // Table might not exist, save to file instead
      const fs = require('fs');
      const backupPath = path.join(process.cwd(), 'backups', `products-${timestamp}.json`);

      // Create backups directory if it doesn't exist
      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      console.log(`   📁 Backup saved to: ${backupPath}`);
    }
  } catch (err) {
    console.warn('   ⚠️  Could not create database backup, continuing...');
  }
}

/**
 * Displays processing statistics
 */
function displayStats(stats: UpdateStats) {
  console.log('📊 STATISTICS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total Products:        ${stats.total}`);
  console.log(`Updated:               ${stats.updated} (${((stats.updated / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Unchanged:             ${stats.unchanged} (${((stats.unchanged / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Errors:                ${stats.errors}`);
  console.log('\nIMPROVEMENTS:');
  console.log(`  • Brands Added:      ${stats.improvements.addedBrand}`);
  console.log(`  • Sizes Added:       ${stats.improvements.addedSize}`);
  console.log(`  • Types Added:       ${stats.improvements.addedType}`);
  console.log(`  • Formats Improved:  ${stats.improvements.fixedFormat}`);
  console.log('═══════════════════════════════════════════════════════════════');
}

/**
 * Verifies that updates were applied correctly
 */
async function verifyUpdates(supabase: any, expectedUpdates: number) {
  const { data, error } = await supabase
    .from('master_products')
    .select('id')
    .gte('updated_at', new Date(Date.now() - 60000).toISOString());

  if (error) {
    console.error('❌ Verification failed:', error.message);
    return;
  }

  const actualUpdates = data?.length || 0;

  if (actualUpdates >= expectedUpdates * 0.9) { // Allow 10% margin
    console.log(`✅ Verified: ${actualUpdates} products updated`);
  } else {
    console.warn(`⚠️  Warning: Expected ${expectedUpdates} updates, found ${actualUpdates}`);
  }
}

// ============================================================================
// EXECUTION
// ============================================================================

// Run the script
reNormalizeAllProducts()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
