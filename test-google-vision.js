/**
 * Test Google Cloud Vision API Setup
 * This will help diagnose why the OCR is falling back to mock data
 */

async function testGoogleVision() {
  console.log('🧪 Testing Google Cloud Vision API Setup');
  console.log('='.repeat(50));

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID || 'NOT SET'}`);
  console.log(`GOOGLE_CLOUD_API_KEY: ${process.env.GOOGLE_CLOUD_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET'}`);

  // Check if service account file exists
  const fs = require('fs');
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (path) {
    console.log(`\n📁 Service Account File:`);
    if (fs.existsSync(path)) {
      console.log(`✅ File exists: ${path}`);
      try {
        const content = JSON.parse(fs.readFileSync(path, 'utf8'));
        console.log(`✅ File is valid JSON`);
        console.log(`   Project ID: ${content.project_id}`);
        console.log(`   Client Email: ${content.client_email}`);
        console.log(`   Type: ${content.type}`);
      } catch (error) {
        console.log(`❌ File is not valid JSON: ${error.message}`);
      }
    } else {
      console.log(`❌ File not found: ${path}`);
    }
  }

  // Test Vision API client creation
  console.log(`\n🔧 Testing Vision API Client:`);
  try {
    const { ImageAnnotatorClient } = require('@google-cloud/vision');

    const client = new ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    console.log('✅ Vision client created successfully');

    // Try a simple test - detect text in a basic test image
    console.log('\n📸 Testing text detection with sample data...');

    // Create a simple test image buffer (this will fail but we can see the error)
    const testBuffer = Buffer.from('fake image data');

    try {
      const [result] = await client.textDetection({
        image: { content: testBuffer }
      });
      console.log('✅ API call successful (unexpected!)');
    } catch (apiError) {
      if (apiError.message.includes('Invalid image') || apiError.code === 3) {
        console.log('✅ API is accessible (got expected "invalid image" error)');
        console.log('   This means authentication is working!');
      } else if (apiError.message.includes('quota') || apiError.message.includes('billing')) {
        console.log('⚠️ API quota or billing issue:');
        console.log(`   ${apiError.message}`);
      } else if (apiError.message.includes('permission') || apiError.code === 7) {
        console.log('❌ Permission denied - check service account permissions');
        console.log(`   ${apiError.message}`);
      } else {
        console.log(`❌ Unexpected API error: ${apiError.message}`);
        console.log(`   Code: ${apiError.code}`);
      }
    }

  } catch (error) {
    console.log(`❌ Failed to create Vision client: ${error.message}`);
  }

  console.log('\n📝 Recommendations:');
  console.log('1. Verify Google Cloud project has Vision API enabled');
  console.log('2. Check that billing is enabled for the project');
  console.log('3. Ensure service account has "Cloud Vision API User" role');
  console.log('4. Try uploading a real receipt image to test OCR');
}

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

testGoogleVision().catch(console.error);