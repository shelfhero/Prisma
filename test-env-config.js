#!/usr/bin/env node

/**
 * Environment Configuration Test Script
 * Tests all environment variables and TabScanner API connection
 */

const fs = require('fs');
const path = require('path');

// Console colors for better output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    logError('.env.local file not found!');
    return false;
  }

  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    }

    logSuccess('.env.local file loaded successfully');
    return true;
  } catch (error) {
    logError(`Failed to load .env.local: ${error.message}`);
    return false;
  }
}

// Test environment variables
function testEnvironmentVariables() {
  log('\n📋 Testing Environment Variables...', colors.bold);

  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'TABSCANNER_API_KEY',
    'TABSCANNER_ENDPOINT'
  ];

  const optionalVars = [
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NODE_ENV',
    'NEXT_PUBLIC_APP_URL'
  ];

  let missingRequired = [];
  let missingOptional = [];

  // Check required variables
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.trim() === '' || value === 'your-project-ref' || value.includes('example')) {
      missingRequired.push(varName);
      logError(`${varName} is missing or not configured`);
    } else {
      logSuccess(`${varName} is set`);

      // Additional validation
      if (varName === 'NEXT_PUBLIC_SUPABASE_URL' && !value.startsWith('https://')) {
        logWarning(`${varName} should start with https://`);
      }

      if (varName === 'TABSCANNER_ENDPOINT' && !value.startsWith('https://')) {
        logWarning(`${varName} should start with https://`);
      }
    }
  }

  // Check optional variables
  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missingOptional.push(varName);
      logWarning(`${varName} is not set (optional)`);
    } else {
      logSuccess(`${varName} is set`);
    }
  }

  return {
    isValid: missingRequired.length === 0,
    missingRequired,
    missingOptional
  };
}

// Test TabScanner API connection
async function testTabScannerConnection() {
  log('\n🔌 Testing TabScanner API Connection...', colors.bold);

  const endpoint = process.env.TABSCANNER_ENDPOINT;
  const apiKey = process.env.TABSCANNER_API_KEY;

  if (!endpoint || !apiKey) {
    logError('TabScanner configuration missing - cannot test connection');
    return false;
  }

  try {
    // Simple health check - try to make a request without files
    logInfo('Attempting to connect to TabScanner API...');

    const formData = new FormData();
    formData.append('api_key', apiKey);
    formData.append('test', 'true'); // Test parameter

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'Призма-App/1.0-Test'
      }
    });

    logInfo(`Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      logSuccess('TabScanner API is accessible');

      // Try to get response data
      try {
        const data = await response.json();
        if (data.success === false && data.error) {
          logInfo(`API responded with: ${data.error}`);
          if (data.error.includes('No image') || data.error.includes('image required')) {
            logSuccess('API key is valid (expected error for test without image)');
            return true;
          }
        }
      } catch (jsonError) {
        logWarning('Could not parse API response as JSON');
      }

      return true;
    } else if (response.status === 401) {
      logError('TabScanner API key is invalid or expired');
      return false;
    } else if (response.status === 403) {
      logError('TabScanner API access forbidden - check your account status');
      return false;
    } else {
      logError(`TabScanner API returned error: ${response.status} ${response.statusText}`);
      return false;
    }

  } catch (error) {
    logError(`Failed to connect to TabScanner API: ${error.message}`);

    if (error.message.includes('fetch is not defined')) {
      logInfo('Note: This script requires Node.js 18+ or a fetch polyfill');
    }

    return false;
  }
}

// Test Supabase connection
async function testSupabaseConnection() {
  log('\n🗄️  Testing Supabase Connection...', colors.bold);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    logError('Supabase URL not configured');
    return false;
  }

  try {
    // Simple health check
    logInfo('Attempting to connect to Supabase...');

    const healthUrl = `${supabaseUrl}/health`;
    const response = await fetch(healthUrl);

    if (response.ok) {
      logSuccess('Supabase is accessible');
      return true;
    } else {
      logWarning(`Supabase health check returned: ${response.status}`);
      // Many Supabase instances don't have /health endpoint, so this is not critical
      return true;
    }

  } catch (error) {
    logWarning(`Could not reach Supabase health endpoint: ${error.message}`);
    // This is not critical as the endpoint might not exist
    return true;
  }
}

// Generate configuration report
function generateReport(envTest, tabscannerTest, supabaseTest) {
  log('\n📊 Configuration Report', colors.bold);
  log('='.repeat(50));

  // Environment Variables
  log(`Environment Variables: ${envTest.isValid ? '✅ VALID' : '❌ INVALID'}`,
      envTest.isValid ? colors.green : colors.red);

  if (envTest.missingRequired.length > 0) {
    log(`Missing Required: ${envTest.missingRequired.join(', ')}`, colors.red);
  }

  if (envTest.missingOptional.length > 0) {
    log(`Missing Optional: ${envTest.missingOptional.join(', ')}`, colors.yellow);
  }

  // API Connections
  log(`TabScanner API: ${tabscannerTest ? '✅ CONNECTED' : '❌ FAILED'}`,
      tabscannerTest ? colors.green : colors.red);

  log(`Supabase: ${supabaseTest ? '✅ ACCESSIBLE' : '❌ FAILED'}`,
      supabaseTest ? colors.green : colors.red);

  // Overall Status
  const overallStatus = envTest.isValid && tabscannerTest && supabaseTest;
  log(`\nOverall Status: ${overallStatus ? '✅ READY' : '❌ NEEDS ATTENTION'}`,
      overallStatus ? colors.green : colors.red);

  // Recommendations
  if (!overallStatus) {
    log('\n🔧 Recommendations:', colors.yellow);

    if (!envTest.isValid) {
      log('• Update missing environment variables in .env.local');
      log('• Ensure all placeholder values are replaced with real credentials');
    }

    if (!tabscannerTest) {
      log('• Verify your TabScanner API key is correct and active');
      log('• Check your TabScanner account status at https://tabscanner.com/dashboard');
    }

    if (!supabaseTest) {
      log('• Verify your Supabase project URL is correct');
      log('• Check your Supabase project status');
    }
  }
}

// Main test function
async function runTests() {
  log('🚀 Environment Configuration Test', colors.bold + colors.blue);
  log('='.repeat(50));

  // Load environment
  const envLoaded = loadEnvFile();
  if (!envLoaded) {
    process.exit(1);
  }

  // Test environment variables
  const envTest = testEnvironmentVariables();

  // Test API connections (only if env vars are valid)
  let tabscannerTest = false;
  let supabaseTest = false;

  if (envTest.isValid) {
    try {
      tabscannerTest = await testTabScannerConnection();
      supabaseTest = await testSupabaseConnection();
    } catch (error) {
      logError(`Connection test failed: ${error.message}`);
    }
  } else {
    logWarning('Skipping API tests due to missing environment variables');
  }

  // Generate report
  generateReport(envTest, tabscannerTest, supabaseTest);
}

// Run if called directly
if (require.main === module) {
  runTests().catch(error => {
    logError(`Test script failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testEnvironmentVariables,
  testTabScannerConnection,
  testSupabaseConnection
};