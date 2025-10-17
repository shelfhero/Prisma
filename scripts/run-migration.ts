/**
 * Run migration to add display_name column
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/run-migration.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Running migration to add display_name column...\n');

  try {
    // Add column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE master_products ADD COLUMN IF NOT EXISTS display_name TEXT;'
    });

    if (alterError) {
      // Ignore if column already exists
      if (!alterError.message.includes('already exists')) {
        throw alterError;
      }
      console.log('✅ Column display_name already exists');
    } else {
      console.log('✅ Added display_name column');
    }

    // Create index
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_master_products_display_name
            ON master_products USING gin(to_tsvector('bulgarian', display_name));`
    });

    if (indexError) {
      console.warn('⚠️  Index creation warning:', indexError.message);
    } else {
      console.log('✅ Created index on display_name');
    }

    console.log('\n✅ Migration complete!');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
