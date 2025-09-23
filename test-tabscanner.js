// Test script for TabScanner API connectivity
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testTabScannerAPI() {
  const apiKey = process.env.TABSCANNER_API_KEY;
  const endpoint = process.env.TABSCANNER_ENDPOINT;

  console.log('🔍 Testing TabScanner API Connection...');
  console.log('📍 Endpoint:', endpoint);
  console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'Not found');

  if (!apiKey || !endpoint) {
    console.error('❌ Missing TabScanner configuration');
    return;
  }

  try {
    // Create a simple test image (1x1 pixel base64 PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageBase64, 'base64');

    // Create FormData
    const FormData = require('form-data');
    const formData = new FormData();

    formData.append('api_key', apiKey);
    formData.append('image_0', testImageBuffer, {
      filename: 'test.png',
      contentType: 'image/png'
    });
    formData.append('language', 'bg');
    formData.append('currency', 'BGN');
    formData.append('return_raw_text', 'true');

    console.log('📤 Sending test request...');

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'Призма-App/1.0'
      }
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      console.error('❌ HTTP Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ TabScanner API Response:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('🎉 TabScanner API is working correctly!');
    } else {
      console.log('⚠️ TabScanner API responded but processing may have failed');
    }

  } catch (error) {
    console.error('❌ Error testing TabScanner API:', error.message);

    if (error.code === 'ENOTFOUND') {
      console.error('🌐 Network error - check your internet connection');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🚫 Connection refused - TabScanner server may be down');
    }
  }
}

// Install form-data if needed and run test
async function runTest() {
  try {
    require('form-data');
    await testTabScannerAPI();
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      console.log('📦 Installing form-data dependency...');
      const { execSync } = require('child_process');
      try {
        execSync('npm install form-data dotenv', { stdio: 'inherit' });
        console.log('✅ Dependencies installed, running test...');
        await testTabScannerAPI();
      } catch (installError) {
        console.error('❌ Failed to install dependencies:', installError.message);
      }
    } else {
      throw e;
    }
  }
}

runTest();