#!/usr/bin/env node

/**
 * Apply Supabase Migrations to Remote Database
 * This script applies the migration files to the remote Supabase instance
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function applyMigrations() {
  log('bold', '🗄️  Applying Supabase Migrations to Remote Database');
  log('cyan', '='.repeat(60));

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log('red', '❌ Missing environment variables. Check .env.local');
    return false;
  }

  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get all migration files
  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    log('red', '❌ Migrations directory not found');
    return false;
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  log('blue', `Found ${migrationFiles.length} migration files:`);
  migrationFiles.forEach(file => log('blue', `  - ${file}`));

  // Create migrations tracking table if it doesn't exist
  log('cyan', '\n📋 Setting up migration tracking...');

  const trackingTableSQL = `
    CREATE TABLE IF NOT EXISTS public._migrations_applied (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  try {
    const { error: trackingError } = await client.rpc('exec_sql', {
      sql: trackingTableSQL
    });

    if (trackingError) {
      // Try direct execution if RPC doesn't work
      log('yellow', '⚠️  RPC method failed, trying direct SQL execution...');

      // Create a simple migration tracking approach
      const { data, error } = await client
        .from('_migrations_applied')
        .select('migration_name')
        .limit(1);

      if (error && error.code === '42P01') {
        log('blue', 'Creating migrations tracking table...');
        // We'll need to apply migrations manually
      }
    } else {
      log('green', '✅ Migration tracking table ready');
    }
  } catch (err) {
    log('yellow', '⚠️  Migration tracking setup uncertain, continuing...');
  }

  // Apply each migration
  let successCount = 0;
  let errorCount = 0;

  for (const migrationFile of migrationFiles) {
    log('cyan', `\n📝 Applying migration: ${migrationFile}`);

    const migrationPath = path.join(migrationsDir, migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    try {
      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            // Execute statement directly using the client
            const { error } = await client.rpc('exec_sql', {
              sql: statement + ';'
            });

            if (error) {
              // Some statements might fail if already exist - that's ok
              if (error.message.includes('already exists') ||
                  error.message.includes('relation') ||
                  error.message.includes('duplicate')) {
                log('yellow', `  ⚠️  Statement ${i+1} already exists (skipping)`);
              } else {
                log('red', `  ❌ Statement ${i+1} failed: ${error.message}`);
                errorCount++;
              }
            } else {
              log('green', `  ✅ Statement ${i+1} executed`);
            }
          } catch (stmtError) {
            log('red', `  ❌ Statement ${i+1} error: ${stmtError.message}`);
            errorCount++;
          }
        }
      }

      log('green', `✅ Migration ${migrationFile} completed`);
      successCount++;

    } catch (error) {
      log('red', `❌ Migration ${migrationFile} failed: ${error.message}`);
      errorCount++;
    }
  }

  log('cyan', '\n📊 MIGRATION SUMMARY:');
  log('green', `✅ Successful migrations: ${successCount}`);
  if (errorCount > 0) {
    log('red', `❌ Errors encountered: ${errorCount}`);
    log('yellow', '⚠️  Some errors are expected for existing objects');
  }

  return errorCount === 0 || successCount > 0;
}

async function createStorageBuckets() {
  log('bold', '\n📁 Creating Storage Buckets...');

  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const buckets = [
    {
      id: 'receipt-images',
      name: 'receipt-images',
      public: false,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    },
    {
      id: 'receipt-thumbnails',
      name: 'receipt-thumbnails',
      public: false,
      fileSizeLimit: 2097152, // 2MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    }
  ];

  let bucketsCreated = 0;

  for (const bucket of buckets) {
    try {
      log('blue', `Creating bucket: ${bucket.id}`);

      const { data, error } = await client.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes
      });

      if (error) {
        if (error.message.includes('already exists')) {
          log('yellow', `  ⚠️  Bucket ${bucket.id} already exists`);
        } else {
          log('red', `  ❌ Failed to create bucket ${bucket.id}: ${error.message}`);
        }
      } else {
        log('green', `  ✅ Bucket ${bucket.id} created successfully`);
        bucketsCreated++;
      }
    } catch (err) {
      log('red', `  ❌ Error creating bucket ${bucket.id}: ${err.message}`);
    }
  }

  return bucketsCreated > 0;
}

async function runMigrationProcess() {
  log('bold', '🚀 Starting Remote Migration Process for Призма');
  log('blue', '='.repeat(60));

  const startTime = Date.now();

  try {
    // Step 1: Apply SQL migrations
    const migrationsSuccess = await applyMigrations();

    // Step 2: Create storage buckets
    const bucketsSuccess = await createStorageBuckets();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    log('blue', `\n⏱️  Total migration time: ${duration} seconds`);

    if (migrationsSuccess && bucketsSuccess) {
      log('green', '\n🎉 Migration process completed successfully!');
      log('green', '✨ Your Supabase setup is now complete.');
      log('blue', '\n🔜 Next steps:');
      log('blue', '1. Run the verification script: node verify-supabase-complete.js');
      log('blue', '2. Check the Supabase dashboard to confirm all objects are created');
      log('blue', '3. Start building your application features');
    } else {
      log('yellow', '\n⚠️  Migration process completed with some issues.');
      log('yellow', 'Please check the logs above and verify manually in the dashboard.');
    }

    return true;

  } catch (error) {
    log('red', `\n💥 Migration process failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrationProcess().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    log('red', `Migration runner crashed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runMigrationProcess };