/**
 * Check display names in database
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/check-display-names.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDisplayNames() {
  console.log('🔍 Checking display names in database...\n');

  const { data: products, error } = await supabase
    .from('master_products')
    .select('id, normalized_name, display_name, brand, size, unit')
    .limit(20)
    .order('id');

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('Sample products:\n');
  products?.forEach(p => {
    console.log(`ID: ${p.id}`);
    console.log(`  Normalized: ${p.normalized_name}`);
    console.log(`  Display:    ${p.display_name}`);
    console.log(`  Brand:      ${p.brand}`);
    console.log(`  Size/Unit:  ${p.size} ${p.unit}`);
    console.log('');
  });
}

checkDisplayNames();
