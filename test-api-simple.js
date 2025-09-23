// Simple TabScanner API test
require('dotenv').config({ path: '.env.local' });

async function testTabScannerSimple() {
  const apiKey = process.env.TABSCANNER_API_KEY;
  const endpoint = process.env.TABSCANNER_ENDPOINT;

  console.log('🔍 Testing TabScanner API Connection...');
  console.log('📍 Endpoint:', endpoint);
  console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'Not found');

  if (!apiKey || !endpoint) {
    console.error('❌ Missing TabScanner configuration');
    return;
  }

  try {
    // Test with a simple API key validation request
    const FormData = require('form-data');
    const formData = new FormData();

    formData.append('api_key', apiKey);
    formData.append('test', 'true'); // Simple test parameter

    console.log('📤 Sending API key validation request...');

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'Призма-App/1.0'
      }
    });

    console.log('📥 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📄 Response body:', responseText);

    if (response.ok) {
      console.log('✅ TabScanner API is reachable and responding!');

      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.error) {
          console.log('⚠️ API Error:', jsonResponse.error);
        } else {
          console.log('🎉 API Response looks good!');
        }
      } catch (parseError) {
        console.log('📝 Response is not JSON, but server is responding');
      }
    } else {
      console.error('❌ HTTP Error:', response.status, response.statusText);

      if (response.status === 401) {
        console.error('🔐 Authentication failed - check your API key');
      } else if (response.status === 403) {
        console.error('🚫 Forbidden - API key may be invalid or expired');
      } else if (response.status === 429) {
        console.error('⏱️ Rate limited - too many requests');
      }
    }

  } catch (error) {
    console.error('❌ Error testing TabScanner API:', error.message);

    if (error.code === 'ENOTFOUND') {
      console.error('🌐 DNS resolution failed - check your internet connection');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🚫 Connection refused - TabScanner server may be down');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⏰ Request timed out - server may be slow');
    }
  }
}

testTabScannerSimple();