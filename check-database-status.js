#!/usr/bin/env node

/**
 * Check Database Status and Create Missing Components
 * This script checks what's missing and provides manual solutions
 */

const { createClient } = require('@supabase/supabase-js');

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

async function checkAndCreateBuckets() {
  log('bold', '📁 Checking and Creating Storage Buckets...');

  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Check existing buckets
    const { data: existingBuckets, error: listError } = await client.storage.listBuckets();

    if (listError) {
      log('red', `❌ Cannot list buckets: ${listError.message}`);
      return false;
    }

    const existingBucketNames = existingBuckets.map(b => b.name);
    log('blue', `Existing buckets: ${existingBucketNames.join(', ') || 'none'}`);

    // Define required buckets
    const requiredBuckets = [
      {
        id: 'receipt-images',
        options: {
          public: false,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
        }
      },
      {
        id: 'receipt-thumbnails',
        options: {
          public: false,
          fileSizeLimit: 2097152, // 2MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
        }
      }
    ];

    let bucketsCreated = 0;

    for (const bucket of requiredBuckets) {
      if (existingBucketNames.includes(bucket.id)) {
        log('green', `✅ Bucket '${bucket.id}' already exists`);
      } else {
        log('blue', `Creating bucket: ${bucket.id}`);

        const { data, error } = await client.storage.createBucket(bucket.id, bucket.options);

        if (error) {
          log('red', `❌ Failed to create bucket '${bucket.id}': ${error.message}`);
        } else {
          log('green', `✅ Created bucket '${bucket.id}' successfully`);
          bucketsCreated++;
        }
      }
    }

    if (bucketsCreated > 0) {
      log('green', `\n🎉 Created ${bucketsCreated} new storage buckets!`);
    }

    return true;

  } catch (error) {
    log('red', `❌ Bucket creation failed: ${error.message}`);
    return false;
  }
}

async function testRLSPoliciesDirectly() {
  log('bold', '\n🔒 Testing RLS Policies Directly...');

  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Test 1: Try to access profiles without authentication (should fail or return empty)
    const { data: profileData, error: profileError } = await client
      .from('profiles')
      .select('*')
      .limit(1);

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        log('green', '✅ RLS working: Anonymous access to profiles denied');
      } else {
        log('yellow', `⚠️  Unexpected error accessing profiles: ${profileError.message}`);
      }
    } else if (profileData && profileData.length === 0) {
      log('green', '✅ RLS working: No data returned for anonymous user');
    } else {
      log('red', '❌ RLS issue: Anonymous user can access profile data');
      return false;
    }

    // Test 2: Try to access receipts (should fail or return empty)
    const { data: receiptData, error: receiptError } = await client
      .from('receipts')
      .select('*')
      .limit(1);

    if (receiptError) {
      if (receiptError.code === 'PGRST116') {
        log('green', '✅ RLS working: Anonymous access to receipts denied');
      } else {
        log('yellow', `⚠️  Unexpected error accessing receipts: ${receiptError.message}`);
      }
    } else if (receiptData && receiptData.length === 0) {
      log('green', '✅ RLS working: No receipt data returned for anonymous user');
    } else {
      log('red', '❌ RLS issue: Anonymous user can access receipt data');
      return false;
    }

    // Test 3: Try to access retailers and categories (should work - they're public)
    const { data: retailerData, error: retailerError } = await client
      .from('retailers')
      .select('*')
      .limit(1);

    if (retailerError) {
      log('yellow', `⚠️  Cannot access retailers: ${retailerError.message}`);
    } else {
      log('green', '✅ Public data access working: Can read retailers');
    }

    const { data: categoryData, error: categoryError } = await client
      .from('categories')
      .select('*')
      .limit(1);

    if (categoryError) {
      log('yellow', `⚠️  Cannot access categories: ${categoryError.message}`);
    } else {
      log('green', '✅ Public data access working: Can read categories');
    }

    return true;

  } catch (error) {
    log('red', `❌ RLS test failed: ${error.message}`);
    return false;
  }
}

async function generateManualSetupGuide() {
  log('bold', '\n📋 MANUAL SETUP GUIDE');
  log('cyan', '='.repeat(50));

  log('blue', '\n1. 🗄️  APPLY DATABASE MIGRATIONS:');
  log('yellow', '   Go to: https://eisfwocfkejsxipmbyzp.supabase.co/project/eisfwocfkejsxipmbyzp/sql');
  log('yellow', '   Run each migration file in order:');

  const fs = require('fs');
  const path = require('path');
  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

  if (fs.existsSync(migrationsDir)) {
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    migrationFiles.forEach((file, index) => {
      log('yellow', `   ${index + 1}. Copy and run: supabase/migrations/${file}`);
    });
  }

  log('blue', '\n2. 📁 CREATE STORAGE BUCKETS:');
  log('yellow', '   Go to: https://eisfwocfkejsxipmbyzp.supabase.co/project/eisfwocfkejsxipmbyzp/storage');
  log('yellow', '   Create these buckets:');
  log('yellow', '   - receipt-images (Private, 10MB limit, image types)');
  log('yellow', '   - receipt-thumbnails (Private, 2MB limit, image types)');

  log('blue', '\n3. 🔐 VERIFY AUTHENTICATION:');
  log('yellow', '   Go to: https://eisfwocfkejsxipmbyzp.supabase.co/project/eisfwocfkejsxipmbyzp/auth/users');
  log('yellow', '   - Check that user registration is enabled');
  log('yellow', '   - Verify email confirmation settings');

  log('blue', '\n4. 🔒 CHECK RLS POLICIES:');
  log('yellow', '   Go to: https://eisfwocfkejsxipmbyzp.supabase.co/project/eisfwocfkejsxipmbyzp/auth/policies');
  log('yellow', '   - Verify that each table has appropriate policies');
  log('yellow', '   - Test with different user roles');

  log('blue', '\n5. 🧪 RUN VERIFICATION:');
  log('yellow', '   After setup, run: node verify-supabase-complete.js');
}

async function runDatabaseCheck() {
  log('bold', '🔍 Starting Database Status Check for Призма');
  log('blue', '='.repeat(60));

  const startTime = Date.now();

  try {
    // Check and create buckets
    const bucketsSuccess = await checkAndCreateBuckets();

    // Test RLS policies
    const rlsSuccess = await testRLSPoliciesDirectly();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    log('blue', `\n⏱️  Check duration: ${duration} seconds`);

    log('cyan', '\n📊 STATUS SUMMARY:');
    log(bucketsSuccess ? 'green' : 'red', `Storage Buckets: ${bucketsSuccess ? '✅ OK' : '❌ Issues'}`);
    log(rlsSuccess ? 'green' : 'red', `RLS Policies: ${rlsSuccess ? '✅ OK' : '❌ Issues'}`);

    if (bucketsSuccess && rlsSuccess) {
      log('green', '\n🎉 Database setup looks good!');
      log('blue', 'Run the full verification: node verify-supabase-complete.js');
    } else {
      await generateManualSetupGuide();
    }

    return bucketsSuccess && rlsSuccess;

  } catch (error) {
    log('red', `\n💥 Database check failed: ${error.message}`);
    await generateManualSetupGuide();
    return false;
  }
}

// Run check if called directly
if (require.main === module) {
  runDatabaseCheck().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    log('red', `Database check crashed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runDatabaseCheck };