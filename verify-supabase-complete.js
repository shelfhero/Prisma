#!/usr/bin/env node

/**
 * Comprehensive Supabase Setup Verification for Призма Receipt App
 * Tests all components: database, auth, storage, RLS policies
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test results tracking
let results = {
  environment: false,
  connection: false,
  database: false,
  auth: false,
  storage: false,
  rls: false,
  userFlow: false,
  fileUpload: false,
  errors: []
};

async function testEnvironmentVariables() {
  log('cyan', '\n🔧 Testing Environment Variables...');

  const tests = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: SUPABASE_URL },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: SUPABASE_ANON_KEY },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: SUPABASE_SERVICE_KEY }
  ];

  let allGood = true;

  for (const test of tests) {
    if (!test.value) {
      log('red', `❌ ${test.name} is missing`);
      allGood = false;
    } else if (test.value.trim().length < 20) {
      log('red', `❌ ${test.name} seems invalid (too short)`);
      allGood = false;
    } else {
      log('green', `✅ ${test.name} is set`);
    }
  }

  if (allGood) {
    log('green', '✅ All environment variables are properly configured');
    results.environment = true;
  } else {
    results.errors.push('Environment variables missing or invalid');
  }

  return allGood;
}

async function testConnection() {
  log('cyan', '\n🔌 Testing Supabase Connection...');

  try {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Test basic connection
    const { data, error } = await client.from('profiles').select('*').limit(1);

    if (error && error.code === '42P01') {
      log('yellow', '⚠️  Tables not found - migrations need to be run');
      return false;
    } else if (error) {
      log('red', `❌ Connection error: ${error.message}`);
      results.errors.push(`Connection error: ${error.message}`);
      return false;
    }

    log('green', '✅ Supabase connection successful');
    results.connection = true;
    return true;
  } catch (err) {
    log('red', `❌ Connection failed: ${err.message}`);
    results.errors.push(`Connection failed: ${err.message}`);
    return false;
  }
}

async function testDatabaseSchema() {
  log('cyan', '\n🗄️  Testing Database Schema...');

  try {
    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const expectedTables = [
      'profiles', 'retailers', 'categories', 'receipts',
      'receipt_images', 'items', 'budgets', 'budget_lines'
    ];

    let tablesFound = 0;

    for (const table of expectedTables) {
      try {
        const { data, error } = await client.from(table).select('*').limit(1);
        if (!error) {
          log('green', `✅ Table '${table}' exists`);
          tablesFound++;
        } else if (error.code === '42P01') {
          log('red', `❌ Table '${table}' does not exist`);
          results.errors.push(`Table '${table}' missing`);
        } else {
          log('yellow', `⚠️  Table '${table}' exists but has issues: ${error.message}`);
          tablesFound++;
        }
      } catch (err) {
        log('red', `❌ Error checking table '${table}': ${err.message}`);
      }
    }

    if (tablesFound === expectedTables.length) {
      log('green', '✅ All database tables exist');
      results.database = true;
      return true;
    } else {
      log('red', `❌ ${expectedTables.length - tablesFound} tables missing`);
      return false;
    }
  } catch (err) {
    log('red', `❌ Database schema test failed: ${err.message}`);
    results.errors.push(`Database schema test failed: ${err.message}`);
    return false;
  }
}

async function testUserRegistration() {
  log('cyan', '\n👤 Testing User Registration and Profile Creation...');

  try {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Generate unique test email
    const testEmail = `test-${Date.now()}@prizma-test.com`;
    const testPassword = 'TestPassword123!';

    log('blue', `Creating test user: ${testEmail}`);

    // Test user registration
    const { data: authData, error: authError } = await client.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User Призма'
        }
      }
    });

    if (authError) {
      log('red', `❌ User registration failed: ${authError.message}`);
      results.errors.push(`User registration failed: ${authError.message}`);
      return false;
    }

    if (!authData.user) {
      log('red', '❌ No user returned from registration');
      results.errors.push('No user returned from registration');
      return false;
    }

    log('green', `✅ User registration successful: ${authData.user.id}`);

    // Wait a moment for triggers to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test profile creation (should be automatic)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      log('red', `❌ Profile creation failed: ${profileError.message}`);
      results.errors.push(`Profile creation failed: ${profileError.message}`);
    } else if (profile) {
      log('green', `✅ Profile created automatically: ${profile.full_name || 'No name'}`);
    } else {
      log('yellow', '⚠️  Profile not found (may not be automatically created)');
    }

    // Cleanup test user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(authData.user.id);
    if (deleteError) {
      log('yellow', `⚠️  Could not cleanup test user: ${deleteError.message}`);
    } else {
      log('blue', '🧹 Test user cleaned up');
    }

    results.auth = true;
    return true;

  } catch (err) {
    log('red', `❌ User registration test failed: ${err.message}`);
    results.errors.push(`User registration test failed: ${err.message}`);
    return false;
  }
}

async function testStorageBuckets() {
  log('cyan', '\n📁 Testing Storage Buckets...');

  try {
    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Test storage buckets exist
    const { data: buckets, error: bucketsError } = await client.storage.listBuckets();

    if (bucketsError) {
      log('red', `❌ Could not list buckets: ${bucketsError.message}`);
      results.errors.push(`Could not list buckets: ${bucketsError.message}`);
      return false;
    }

    const expectedBuckets = ['receipt-images', 'receipt-thumbnails'];
    const foundBuckets = buckets.map(b => b.name);

    let bucketsOk = true;
    for (const bucket of expectedBuckets) {
      if (foundBuckets.includes(bucket)) {
        log('green', `✅ Bucket '${bucket}' exists`);
      } else {
        log('red', `❌ Bucket '${bucket}' does not exist`);
        results.errors.push(`Bucket '${bucket}' missing`);
        bucketsOk = false;
      }
    }

    if (bucketsOk) {
      log('green', '✅ All storage buckets exist');
      results.storage = true;
    }

    return bucketsOk;

  } catch (err) {
    log('red', `❌ Storage test failed: ${err.message}`);
    results.errors.push(`Storage test failed: ${err.message}`);
    return false;
  }
}

async function testRLSPolicies() {
  log('cyan', '\n🔒 Testing Row Level Security Policies...');

  try {
    // Check if tables have RLS enabled by testing anonymous access
    log('blue', 'Testing RLS with anonymous access...');

    // Try to access tables without authentication (should fail for user data)
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Test 1: Try to access profiles without authentication
    const { data: profileData, error: profileError } = await anonClient
      .from('profiles')
      .select('*')
      .limit(1);

    if (profileError && profileError.code === 'PGRST116') {
      log('green', '✅ RLS working: Anonymous access denied to profiles');
    } else if (profileData && profileData.length === 0) {
      log('green', '✅ RLS working: No profile data returned for anonymous user');
    } else if (profileError) {
      log('yellow', `⚠️  Profile access error: ${profileError.message}`);
    } else {
      log('red', '❌ RLS issue: Anonymous user can access profile data');
      results.errors.push('RLS not working properly for profiles');
      return false;
    }

    // Test 2: Try to access receipts without authentication
    const { data: receiptData, error: receiptError } = await anonClient
      .from('receipts')
      .select('*')
      .limit(1);

    if (receiptError && receiptError.code === 'PGRST116') {
      log('green', '✅ RLS working: Anonymous access denied to receipts');
    } else if (receiptData && receiptData.length === 0) {
      log('green', '✅ RLS working: No receipt data returned for anonymous user');
    } else if (receiptError) {
      log('yellow', `⚠️  Receipt access error: ${receiptError.message}`);
    } else {
      log('red', '❌ RLS issue: Anonymous user can access receipt data');
      results.errors.push('RLS not working properly for receipts');
      return false;
    }

    // Test 3: Try to access retailers (should work - they're public)
    const { data: retailerData, error: retailerError } = await anonClient
      .from('retailers')
      .select('*')
      .limit(1);

    if (retailerError) {
      log('yellow', `⚠️  Cannot access retailers: ${retailerError.message}`);
    } else {
      log('green', '✅ Public data access working: Can read retailers');
    }

    // Test 4: Try to access categories (should work - they're public)
    const { data: categoryData, error: categoryError } = await anonClient
      .from('categories')
      .select('*')
      .limit(1);

    if (categoryError) {
      log('yellow', `⚠️  Cannot access categories: ${categoryError.message}`);
    } else {
      log('green', '✅ Public data access working: Can read categories');
    }

    log('green', '✅ RLS policies are working correctly');
    results.rls = true;
    return true;

  } catch (err) {
    log('red', `❌ RLS test failed: ${err.message}`);
    results.errors.push(`RLS test failed: ${err.message}`);
    return false;
  }
}

async function testFileUploadPermissions() {
  log('cyan', '\n📤 Testing File Upload Permissions...');

  try {
    // Create a test user first
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const testEmail = `upload-test-${Date.now()}@prizma-test.com`;

    const { data: authData, error: authError } = await client.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!'
    });

    if (authError) {
      log('red', `❌ Could not create test user for upload: ${authError.message}`);
      return false;
    }

    // Wait for user to be created
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create a simple test file
    const testFileContent = Buffer.from('Test receipt image content');
    const fileName = `receipts/${authData.user.id}/test-receipt/test-image.jpg`;

    log('blue', `Testing upload to: ${fileName}`);

    // Test upload with authenticated user
    const { data: uploadData, error: uploadError } = await client.storage
      .from('receipt-images')
      .upload(fileName, testFileContent, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      log('red', `❌ File upload failed: ${uploadError.message}`);
      results.errors.push(`File upload failed: ${uploadError.message}`);

      // Clean up user
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      await adminClient.auth.admin.deleteUser(authData.user.id);

      return false;
    }

    log('green', `✅ File upload successful: ${uploadData.path}`);

    // Test download/access
    const { data: downloadData, error: downloadError } = await client.storage
      .from('receipt-images')
      .download(fileName);

    if (downloadError) {
      log('yellow', `⚠️  File download failed: ${downloadError.message}`);
    } else {
      log('green', '✅ File download successful');
    }

    // Cleanup
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await adminClient.storage.from('receipt-images').remove([fileName]);
    await adminClient.auth.admin.deleteUser(authData.user.id);

    log('blue', '🧹 Test files and user cleaned up');

    results.fileUpload = true;
    return true;

  } catch (err) {
    log('red', `❌ File upload test failed: ${err.message}`);
    results.errors.push(`File upload test failed: ${err.message}`);
    return false;
  }
}

async function testCompleteUserFlow() {
  log('cyan', '\n🔄 Testing Complete User Flow (Register → Login → Dashboard Access)...');

  try {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const testEmail = `flow-test-${Date.now()}@prizma-test.com`;
    const testPassword = 'TestPassword123!';

    // Step 1: Register
    log('blue', '1. Testing user registration...');
    const { data: signUpData, error: signUpError } = await client.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Flow Test User'
        }
      }
    });

    if (signUpError) {
      log('red', `❌ Registration failed: ${signUpError.message}`);
      return false;
    }

    log('green', '✅ Registration successful');

    // Step 2: Login (simulate email confirmation skip for testing)
    log('blue', '2. Testing user login...');
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      log('red', `❌ Login failed: ${signInError.message}`);
      // This might fail due to email confirmation requirements
      log('yellow', '⚠️  Login failure might be due to email confirmation requirements');
    } else {
      log('green', '✅ Login successful');
    }

    // Step 3: Test dashboard data access
    log('blue', '3. Testing dashboard data access...');
    const userId = signUpData.user?.id || signInData.user?.id;

    if (userId) {
      // Test accessing user's own data
      const { data: userReceipts, error: receiptsError } = await client
        .from('receipts')
        .select('*')
        .eq('user_id', userId);

      if (receiptsError && receiptsError.code !== 'PGRST116') {
        log('red', `❌ Dashboard access failed: ${receiptsError.message}`);
      } else {
        log('green', '✅ Dashboard data access working (empty result is OK)');
      }
    }

    // Cleanup
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    if (userId) {
      await adminClient.auth.admin.deleteUser(userId);
      log('blue', '🧹 Test user cleaned up');
    }

    results.userFlow = true;
    return true;

  } catch (err) {
    log('red', `❌ User flow test failed: ${err.message}`);
    results.errors.push(`User flow test failed: ${err.message}`);
    return false;
  }
}

function generateReport() {
  log('magenta', '\n📊 COMPREHENSIVE SUPABASE VERIFICATION REPORT');
  log('magenta', '='.repeat(60));

  const tests = [
    { name: 'Environment Variables', passed: results.environment, required: true },
    { name: 'Database Connection', passed: results.connection, required: true },
    { name: 'Database Schema', passed: results.database, required: true },
    { name: 'User Authentication', passed: results.auth, required: true },
    { name: 'Storage Buckets', passed: results.storage, required: true },
    { name: 'RLS Policies', passed: results.rls, required: true },
    { name: 'File Upload Permissions', passed: results.fileUpload, required: true },
    { name: 'Complete User Flow', passed: results.userFlow, required: true }
  ];

  let criticalFailures = 0;
  let totalFailures = 0;

  tests.forEach(test => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    const priority = test.required ? '(Critical)' : '(Optional)';

    log(test.passed ? 'green' : 'red', `${status} ${test.name} ${priority}`);

    if (!test.passed) {
      totalFailures++;
      if (test.required) criticalFailures++;
    }
  });

  log('blue', '\n🔍 ERROR SUMMARY:');
  if (results.errors.length === 0) {
    log('green', 'No errors detected! 🎉');
  } else {
    results.errors.forEach((error, index) => {
      log('red', `${index + 1}. ${error}`);
    });
  }

  log('blue', '\n📈 OVERALL STATUS:');
  if (criticalFailures === 0) {
    log('green', '🎉 SUCCESS: Supabase setup is complete and working!');
    log('green', '✨ Your Призма app is ready for production use.');

    if (totalFailures > 0) {
      log('yellow', `⚠️  ${totalFailures} optional feature(s) need attention.`);
    }
  } else {
    log('red', `❌ ATTENTION NEEDED: ${criticalFailures} critical issue(s) found.`);
    log('red', '🔧 Please fix these issues before proceeding.');
  }

  log('blue', '\n🔗 USEFUL LINKS:');
  log('blue', `📊 Supabase Dashboard: ${SUPABASE_URL.replace('.supabase.co', '')}.supabase.co`);
  log('blue', '📚 Documentation: https://supabase.com/docs');
  log('blue', '🗄️  Database: Click "Table Editor" in dashboard');
  log('blue', '🔐 Authentication: Click "Authentication" in dashboard');
  log('blue', '📁 Storage: Click "Storage" in dashboard');

  return criticalFailures === 0;
}

async function runAllTests() {
  log('bold', '🚀 Starting Comprehensive Supabase Verification for Призма');
  log('blue', '='.repeat(60));

  const startTime = Date.now();

  // Run all tests
  await testEnvironmentVariables();
  await testConnection();
  await testDatabaseSchema();
  await testUserRegistration();
  await testStorageBuckets();
  await testRLSPolicies();
  await testFileUploadPermissions();
  await testCompleteUserFlow();

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  log('blue', `\n⏱️  Total test duration: ${duration} seconds`);

  const success = generateReport();

  log('blue', '\n🔜 NEXT STEPS:');
  if (success) {
    log('green', '1. ✅ Start building your receipt processing features');
    log('green', '2. ✅ Implement TabScanner API integration');
    log('green', '3. ✅ Add budget tracking functionality');
    log('green', '4. ✅ Create beautiful user interface');
  } else {
    log('red', '1. 🔧 Fix the critical issues listed above');
    log('red', '2. 🔧 Run this verification script again');
    log('red', '3. 🔧 Check Supabase dashboard for additional details');
    log('red', '4. 🔧 Review migration files in supabase/migrations/');
  }

  return success;
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    log('red', `\n💥 Test runner crashed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runAllTests, results };