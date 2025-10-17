/**
 * Check original product names from items
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/check-original-names.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOriginalNames() {
  console.log('🔍 Checking original product names from receipts...\n');

  // Get items with their original names and master product info
  const { data: items, error } = await supabase
    .from('items')
    .select(`
      id,
      product_name,
      raw_product_name,
      master_product_id,
      master_products (
        normalized_name,
        display_name,
        brand
      )
    `)
    .not('master_product_id', 'is', null)
    .limit(20)
    .order('id');

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('Sample items and their master products:\n');
  items?.forEach(item => {
    console.log(`Original: "${item.product_name || item.raw_product_name}"`);
    console.log(`  → Normalized: ${item.master_products?.normalized_name}`);
    console.log(`  → Display:    ${item.master_products?.display_name}`);
    console.log(`  → Brand:      ${item.master_products?.brand || 'none'}`);
    console.log('');
  });
}

checkOriginalNames();
