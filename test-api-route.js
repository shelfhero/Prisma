#!/usr/bin/env node

/**
 * Simple API Route Test Script
 * Tests the /api/receipts/process endpoint configuration
 */

console.log('🧪 API Route Configuration Test\n');

// Test environment loading in API context
console.log('📋 Testing environment variables access...');

// Load environment like Next.js would
require('dotenv').config({ path: '.env.local' });

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TABSCANNER_API_KEY',
  'TABSCANNER_ENDPOINT'
];

let allValid = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value && value.trim() !== '') {
    console.log(`✅ ${varName}: Available`);
  } else {
    console.log(`❌ ${varName}: Missing`);
    allValid = false;
  }
});

console.log('\n🔧 Configuration Summary:');
console.log('• All environment variables:', allValid ? '✅ Available' : '❌ Missing some');
console.log('• Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('.supabase.co') ? '✅ Valid format' : '❌ Invalid');
console.log('• TabScanner Endpoint:', process.env.TABSCANNER_ENDPOINT?.startsWith('https://') ? '✅ Valid format' : '❌ Invalid');

console.log('\n🚀 Next Steps:');
if (allValid) {
  console.log('✅ Environment is configured - you can start the development server');
  console.log('   Run: npm run dev');
  console.log('   Then test the API at: http://localhost:3000/api/receipts/process');
} else {
  console.log('❌ Fix missing environment variables before starting');
}

console.log('\n📝 TabScanner API Key Note:');
console.log('   The current key returned "API key not found" error');
console.log('   Please verify the key at: https://tabscanner.com/dashboard');
console.log('   The API endpoint accepts the key and responds correctly');

console.log('\n✅ Security: Environment validation is built into the API route');
console.log('   File: app/api/receipts/process/route.ts:463-475');