import { NextRequest, NextResponse } from 'next/server';
import { processReceiptWithGoogleVision } from '@/lib/google-vision-ocr';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Debug: Testing Google Vision API');

    // Get uploaded file
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`📁 File received: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

    // Check environment
    const hasGoogleVision = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_API_KEY;
    console.log(`🔧 Google Vision configured: ${hasGoogleVision ? 'YES' : 'NO'}`);
    console.log(`   PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID ? 'SET' : 'NOT SET'}`);
    console.log(`   API_KEY: ${process.env.GOOGLE_CLOUD_API_KEY ? 'SET' : 'NOT SET'}`);
    console.log(`   CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'SET' : 'NOT SET'}`);

    if (!hasGoogleVision) {
      return NextResponse.json({
        error: 'Google Vision not configured',
        details: 'Environment variables missing'
      }, { status: 500 });
    }

    // Convert to buffer
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`📸 Image buffer created: ${imageBuffer.length} bytes`);

    // Test Google Vision
    console.log('🤖 Calling Google Vision API...');
    const result = await processReceiptWithGoogleVision(imageBuffer, true); // Enable debug mode

    console.log(`📊 Result: success=${result.success}, confidence=${result.confidence}`);

    if (result.success && result.receipt) {
      console.log(`🏪 Retailer: ${result.receipt.retailer}`);
      console.log(`💰 Total: ${result.receipt.total}`);
      console.log(`📦 Items: ${result.receipt.items.length}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Vision API test completed',
      result: {
        success: result.success,
        confidence: result.confidence,
        retailer: result.receipt?.retailer,
        total: result.receipt?.total,
        items_count: result.receipt?.items.length || 0,
        raw_text_preview: result.raw_text?.substring(0, 200) + '...',
        extraction_available: !!result.extraction,
        quality_report: result.qualityReport
      }
    });

  } catch (error) {
    console.error('❌ Debug test error:', error);
    return NextResponse.json({
      error: 'Vision API test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Upload an image file using POST to test Google Vision API',
    environment: {
      google_vision_configured: !!(process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_API_KEY),
      project_id: process.env.GOOGLE_CLOUD_PROJECT_ID ? 'SET' : 'NOT SET',
      api_key: process.env.GOOGLE_CLOUD_API_KEY ? 'SET' : 'NOT SET',
      credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'SET' : 'NOT SET',
      node_env: process.env.NODE_ENV
    }
  });
}