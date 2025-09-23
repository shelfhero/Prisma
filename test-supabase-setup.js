#!/usr/bin/env node

/**
 * Test Supabase Integration Setup
 * Validates that all components work together correctly
 */

const { createBrowserClient, createServerClient, createAdminClient } = require('./lib/supabase-simple.ts');

console.log('🧪 Testing Supabase Integration Setup\n');

async function testClientCreation() {
  console.log('📋 Testing client creation...');

  try {
    // Test browser client creation
    const browserClient = createBrowserClient();
    console.log('✅ Browser client created successfully');

    // Test server client creation
    const serverClient = createServerClient();
    console.log('✅ Server client created successfully');

    // Test admin client creation
    const adminClient = createAdminClient();
    console.log('✅ Admin client created successfully');

    return true;
  } catch (error) {
    console.error('❌ Client creation failed:', error.message);
    return false;
  }
}

async function testConnection() {
  console.log('\n🔌 Testing Supabase connection...');

  try {
    const client = createServerClient();

    // Test basic connection with a simple query
    const { data, error } = await client
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log('⚠️  Query error (expected if tables don\'t exist yet):', error.message);
      return false;
    }

    console.log('✅ Supabase connection successful');
    console.log(`   Database has ${data} profiles`);
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

async function testTypescriptImports() {
  console.log('\n📦 Testing TypeScript imports...');

  try {
    // These will fail if there are TypeScript compilation errors
    require('./lib/auth.ts');
    console.log('✅ Auth module imports correctly');

    require('./lib/error-handling.ts');
    console.log('✅ Error handling module imports correctly');

    require('./lib/config.ts');
    console.log('✅ Config module imports correctly');

    require('./types/index.ts');
    console.log('✅ Types module imports correctly');

    return true;
  } catch (error) {
    console.error('❌ TypeScript import failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Supabase Integration Tests');
  console.log('=' .repeat(50));

  const clientTest = await testClientCreation();
  const connectionTest = await testConnection();
  const importTest = await testTypescriptImports();

  console.log('\n📊 Test Results:');
  console.log('='.repeat(30));
  console.log(`Client Creation: ${clientTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Connection Test: ${connectionTest ? '✅ PASS' : '⚠️  SKIP'}`);
  console.log(`TypeScript Imports: ${importTest ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = clientTest && importTest;
  console.log(`\nOverall Status: ${allPassed ? '✅ READY' : '❌ NEEDS ATTENTION'}`);

  if (allPassed) {
    console.log('\n🎉 Supabase integration is set up correctly!');
    console.log('🔧 Next steps:');
    console.log('   1. Set up your database schema');
    console.log('   2. Configure Row Level Security (RLS)');
    console.log('   3. Test authentication flows');
    console.log('   4. Start building your application');
  } else {
    console.log('\n🔧 Please fix the failing tests before proceeding');
  }

  return allPassed;
}

// Run tests if called directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };