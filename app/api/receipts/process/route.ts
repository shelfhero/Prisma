import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { processReceiptWithGoogleVision } from '@/lib/google-vision-ocr';

// Bulgarian error messages
const ERRORS = {
  UNAUTHORIZED: 'Неоторизиран достъп',
  INVALID_FILE: 'Невалиден файл',
  FILE_TOO_LARGE: 'Файлът е твърде голям (максимум 10MB)',
  UPLOAD_ERROR: 'Грешка при качване на файла',
  PROCESSING_ERROR: 'Проблем с обработката на бона',
  TABSCANNER_ERROR: 'Грешка при обработка на изображението',
  DATABASE_ERROR: 'Грешка в базата данни',
  RATE_LIMIT: 'Твърде много заявки. Опитайте отново след малко',
  INVALID_REQUEST: 'Невалидна заявка',
  CONFIG_ERROR: 'Грешка в конфигурацията на сървъра'
} as const;

// Success messages in Bulgarian
const SUCCESS = {
  PROCESSING_COMPLETE: 'Обработката на касовата бележка завърши успешно',
  RECEIPT_SAVED: 'Касовата бележка е запазена'
} as const;

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Item categorization rules
const CATEGORY_RULES = {
  'Хранителни продукти': [
    'хляб', 'мляко', 'яйца', 'сирене', 'кашкавал', 'йогурт', 'масло', 'олио',
    'месо', 'салам', 'шунка', 'пилешко', 'говеждо', 'свинско',
    'риба', 'тон', 'сьомга', 'скумрия',
    'плодове', 'ябълки', 'банани', 'портокали', 'лимони', 'грозде',
    'зеленчуци', 'домати', 'краставици', 'лук', 'картофи', 'моркови',
    'макарони', 'спагети', 'ориз', 'брашно', 'захар', 'сол'
  ],
  'Напитки': [
    'вода', 'сок', 'кока кола', 'фанта', 'спрайт', 'пепси',
    'бира', 'вино', 'ракия', 'уиски', 'кафе', 'чай'
  ],
  'Козметика и хигиена': [
    'сапун', 'шампоан', 'паста за зъби', 'четка за зъби',
    'дезодорант', 'парфюм', 'крем', 'маска', 'серум'
  ],
  'Битова химия': [
    'препарат за съдове', 'прах за пране', 'омекотител',
    'почистващ препарат', 'белина', 'освежител'
  ],
  'Други': []
};

interface TabscannerResponse {
  success: boolean;
  receipt?: {
    retailer?: string;
    total?: number;
    date?: string;
    items?: Array<{
      name: string;
      price: number;
      quantity?: number;
      barcode?: string;
    }>;
  };
  raw_text?: string;
  confidence?: number;
}

interface DatabaseSchema {
  receipts: {
    id: string;
    user_id: string;
    retailer_id: string | null;
    total_amount: number;
    currency: string;
    purchased_at: string;
    tabscanner_raw: any;
    created_at?: string;
    updated_at?: string;
  };
  receipt_images: {
    id: string;
    receipt_id: string;
    storage_path: string;
    width: number | null;
    height: number | null;
    created_at?: string;
  };
  items: {
    id: string;
    receipt_id: string;
    product_name: string;
    barcode: string | null;
    qty: number;
    unit_price: number;
    total_price: number;
    category_id: string | null;
    created_at?: string;
  };
  retailers: {
    id: string;
    name: string;
    created_at?: string;
  };
  categories: {
    id: string;
    name: string;
    created_at?: string;
  };
}

// Environment variable validation
function validateEnvironmentVariables(): { valid: boolean; missingVars: string[] } {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'TABSCANNER_API_KEY',
    'TABSCANNER_ENDPOINT'
  ];

  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missingVars.push(varName);
    }
  }

  return {
    valid: missingVars.length === 0,
    missingVars
  };
}

// Validate environment variables on module load
const envValidation = validateEnvironmentVariables();
if (!envValidation.valid) {
  console.error('❌ ПРИЗМА API: Липсват задължителни променливи:', envValidation.missingVars);
  console.error('📋 Проверете .env.local файла или конфигурацията на сървъра');
}

// Initialize Supabase client with validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Validate Supabase configuration
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase конфигурацията е непълна');
}

if (!supabaseUrl.startsWith('https://')) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL трябва да започва с https://');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Utility functions
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: ERRORS.INVALID_FILE };
  }

  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: ERRORS.FILE_TOO_LARGE };
  }

  return { valid: true };
}

function checkRateLimit(userKey: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const limit = rateLimitStore.get(userKey);

  if (!limit || now > limit.resetTime) {
    // Reset or first request
    rateLimitStore.set(userKey, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return { allowed: true };
  }

  if (limit.count >= 10) { // 10 requests per minute
    return { allowed: false, resetTime: limit.resetTime };
  }

  limit.count++;
  return { allowed: true };
}

function categorizeItem(productName: string): string | null {
  const normalizedName = productName.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    if (category === 'Други') continue;

    for (const keyword of keywords) {
      if (normalizedName.includes(keyword)) {
        return category;
      }
    }
  }

  return 'Други';
}

async function getOrCreateRetailer(retailerName: string): Promise<string> {
  if (!retailerName) {
    retailerName = 'Неизвестен магазин';
  }

  // Try to find existing retailer
  const { data: existingRetailer } = await supabase
    .from('retailers')
    .select('id')
    .eq('name', retailerName)
    .single();

  if (existingRetailer) {
    return existingRetailer.id;
  }

  // Create new retailer
  const { data: newRetailer, error } = await supabase
    .from('retailers')
    .insert({ name: retailerName })
    .select('id')
    .single();

  if (error || !newRetailer) {
    throw new Error('Failed to create retailer');
  }

  return newRetailer.id;
}

async function getCategoryId(categoryName: string): Promise<string | null> {
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('name', categoryName)
    .single();

  return category?.id || null;
}

async function uploadImageToStorage(
  file: File,
  userId: string,
  receiptId: string,
  imageIndex: number
): Promise<{ path: string }> {
  const fileExtension = file.name.split('.').pop() || 'jpg';
  const fileName = `image_${imageIndex}.${fileExtension}`;
  const storagePath = `receipts/${userId}/${receiptId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('receipt-images')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Note: Image dimensions would require additional server-side libraries
  // For now, skip dimensions as they're not critical for functionality

  return { path: storagePath };
}

async function processReceiptOCR(imageFiles: File[]): Promise<TabscannerResponse> {
  // Try Google Cloud Vision first - Check for ANY valid configuration
  const hasProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const hasApiKey = process.env.GOOGLE_CLOUD_API_KEY;
  const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasGoogleVision = hasProjectId || hasApiKey || hasCredentials;

  console.log('🔧 OCR Processing Debug:');
  console.log(`   Google Vision configured: ${hasGoogleVision ? 'YES' : 'NO'}`);
  console.log(`   PROJECT_ID: ${hasProjectId ? 'SET' : 'NOT SET'}`);
  console.log(`   API_KEY: ${hasApiKey ? 'SET' : 'NOT SET'}`);
  console.log(`   CREDENTIALS: ${hasCredentials ? 'SET' : 'NOT SET'}`);
  console.log(`   Image files: ${imageFiles.length}`);

  if (hasGoogleVision && imageFiles.length > 0) {
    try {
      console.log('🤖 Using Enhanced Google Cloud Vision for OCR...');

      // Convert first image file to buffer
      const firstImage = imageFiles[0];
      const imageBuffer = Buffer.from(await firstImage.arrayBuffer());

      // Use enhanced OCR with debug mode in development
      const debugMode = process.env.NODE_ENV === 'development';
      const result = await processReceiptWithGoogleVision(imageBuffer, debugMode);

      if (result.success && result.receipt) {
        console.log('✅ Enhanced Google Vision OCR successful');

        if (result.qualityReport) {
          console.log(`📊 Quality Report: ${result.qualityReport.issues} issues, ${result.qualityReport.processingTime}ms`);
          if (result.qualityReport.suggestions.length > 0) {
            console.log('💡 Suggestions:', result.qualityReport.suggestions.join('; '));
          }
        }

        if (result.extraction) {
          console.log(`🏪 Store: ${result.extraction.retailer} (${result.extraction.metadata.detectedStore?.type || 'unknown'})`);
          console.log(`💰 Total: ${result.extraction.total} лв (validation: ${result.extraction.metadata.totalValidation.valid ? '✅' : '❌'})`);
          console.log(`📦 Items: ${result.extraction.items.length} (avg confidence: ${Math.round(result.extraction.items.reduce((sum, item) => sum + item.confidence, 0) / result.extraction.items.length * 100)}%)`);

          // Log categorized items
          const categorized = result.extraction.items.filter(item => item.category && item.category !== 'Други');
          if (categorized.length > 0) {
            console.log(`📋 Auto-categorized: ${categorized.length}/${result.extraction.items.length} items`);
          }
        }

        return {
          success: true,
          receipt: {
            retailer: result.receipt.retailer,
            total: result.receipt.total,
            date: result.receipt.date,
            items: result.receipt.items.map(item => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity || 1,
              barcode: item.barcode
            }))
          },
          raw_text: result.raw_text || '',
          confidence: result.confidence || 95
        };
      } else {
        console.warn('⚠️ Google Vision OCR failed, but config is present');
        if (result.extraction && result.extraction.qualityIssues.length > 0) {
          console.log('❌ Quality Issues:', result.extraction.qualityIssues.map(issue => issue.description).join('; '));
        }
        // Don't fall back immediately - let's show the error
        throw new Error(`Google Vision OCR failed: ${result.raw_text || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Google Vision error:', error);
      // Re-throw to show user the actual error instead of hiding it with mock data
      throw new Error(`Google Vision API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Fallback to TabScanner if Google Vision is not configured
  const tabscannerEndpoint = process.env.TABSCANNER_ENDPOINT;
  const tabscannerApiKey = process.env.TABSCANNER_API_KEY;

  if (tabscannerEndpoint && tabscannerApiKey) {
    try {
      console.log('🔄 Fallback: Trying TabScanner API...');

      const formData = new FormData();
      formData.append('api_key', tabscannerApiKey);

      imageFiles.forEach((file, index) => {
        formData.append(`image_${index}`, file);
      });

      formData.append('language', 'bg');
      formData.append('currency', 'BGN');
      formData.append('return_raw_text', 'true');

      const response = await fetch(tabscannerEndpoint, {
        method: 'POST',
        body: formData,
        headers: { 'User-Agent': 'Prizma-App/1.0' }
      });

      if (response.ok) {
        const result: TabscannerResponse = await response.json();
        if (result.success) {
          console.log('✅ TabScanner OCR successful');
          return result;
        }
      }
      console.warn('❌ TabScanner API failed');
    } catch (error) {
      console.error('❌ TabScanner error:', error);
    }
  }

  // If both real OCR options failed, throw error instead of using mock data
  if (hasGoogleVision || tabscannerEndpoint) {
    throw new Error('All OCR services failed. Please check your receipt image quality and try again.');
  }

  // Only use mock data in development when no OCR is configured
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️ Development mode: Using mock OCR data (no OCR services configured)');
    return createMockOCRResponse(imageFiles);
  }

  throw new Error('No OCR services are configured. Please contact support.');
}

// Enhanced mock OCR function that simulates real receipt parsing
function createMockOCRResponse(imageFiles: File[]): TabscannerResponse {
  const now = new Date();

  // Realistic Bulgarian retailers
  const retailers = [
    'Лидл България', 'Фантастико', 'Билла', 'Кауфланд', 'Т-Маркет',
    'Пикадили', 'МЕТРО', 'Технополис', 'ОМВ', 'Шел'
  ];

  // Common Bulgarian products with realistic prices
  const productTemplates = [
    { names: ['Хляб пълнозърнест', 'Хляб бял', 'Питка'], priceRange: [0.85, 1.50] },
    { names: ['Мляко прясно 3.6%', 'Мляко краве 2.8%'], priceRange: [2.20, 2.80] },
    { names: ['Яйца свежи', 'Яйца M размер'], priceRange: [4.50, 5.20] },
    { names: ['Домати розови', 'Домати червени'], priceRange: [3.80, 4.50] },
    { names: ['Банани', 'Банани Еквадор'], priceRange: [2.90, 3.50] },
    { names: ['Сирене бяло краве', 'Кашкавал'], priceRange: [12.50, 18.90] },
    { names: ['Олио слънчогледово', 'Олио рапично'], priceRange: [4.20, 6.80] },
    { names: ['Ориз басмати', 'Ориз дълъг'], priceRange: [3.50, 5.20] },
    { names: ['Кафе разтворимо', 'Кафе мляно'], priceRange: [8.90, 15.50] },
    { names: ['Вода минерална', 'Вода изворна'], priceRange: [0.65, 1.20] }
  ];

  // Generate realistic receipt data
  const retailer = retailers[Math.floor(Math.random() * retailers.length)];
  const itemCount = Math.floor(Math.random() * 6) + 3; // 3-8 items
  const items = [];

  for (let i = 0; i < itemCount; i++) {
    const template = productTemplates[Math.floor(Math.random() * productTemplates.length)];
    const name = template.names[Math.floor(Math.random() * template.names.length)];
    const basePrice = template.priceRange[0] + Math.random() * (template.priceRange[1] - template.priceRange[0]);
    const price = Math.round(basePrice * 100) / 100; // Round to 2 decimals
    const quantity = Math.random() < 0.8 ? 1 : Math.floor(Math.random() * 3) + 2; // Usually 1, sometimes 2-4

    items.push({
      name,
      price,
      quantity
    });
  }

  const total = Math.round(items.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 100) / 100;

  // Simulate realistic processing time variation
  const confidence = Math.floor(Math.random() * 15) + 85; // 85-99% confidence

  return {
    success: true,
    receipt: {
      retailer,
      total,
      date: now.toISOString(),
      items
    },
    raw_text: `Касова бележка от ${retailer}\nДата: ${now.toLocaleDateString('bg-BG')}\nОбща сума: ${total.toFixed(2)} лв.\n${items.map(item => `${item.name} x${item.quantity} = ${(item.price * item.quantity).toFixed(2)} лв.`).join('\n')}`,
    confidence
  };
}

async function saveReceiptToDatabase(
  userId: string,
  tabscannerResponse: TabscannerResponse,
  imageFiles: File[]
): Promise<{ receiptId: string; totalAmount: number; itemsCount: number }> {
  const receipt = tabscannerResponse.receipt;

  if (!receipt) {
    throw new Error('No receipt data from Tabscanner');
  }

  // Get or create retailer
  const retailerId = await getOrCreateRetailer(receipt.retailer || 'Неизвестен магазин');

  // Prepare receipt data
  const totalAmount = receipt.total || 0;
  const purchasedAt = receipt.date || new Date().toISOString();

  // Insert receipt (let database auto-generate ID)
  const { data: receiptData, error: receiptError } = await supabase
    .from('receipts')
    .insert({
      user_id: userId,
      retailer_id: retailerId,
      total_amount: totalAmount,
      currency: 'BGN',
      purchased_at: purchasedAt,
      tabscanner_raw: tabscannerResponse
    })
    .select()
    .single();

  if (receiptError) {
    throw new Error(`Receipt insert failed: ${receiptError.message}`);
  }

  const receiptId = receiptData.id;

  // Upload and store images
  for (let i = 0; i < imageFiles.length; i++) {
    try {
      const imagePath = await uploadImageToStorage(imageFiles[i], userId, receiptId, i);

      const { error: imageError } = await supabase
        .from('receipt_images')
        .insert({
          receipt_id: receiptId,
          storage_path: imagePath.path,
          width: null,
          height: null
        });

      if (imageError) {
        console.error('Image insert failed:', imageError);
        // Don't throw here, images are not critical
      }
    } catch (imageError) {
      console.error('Image upload/storage failed:', imageError);
      // Continue with other images
    }
  }

  // Insert items
  const items = receipt.items || [];
  let itemsInserted = 0;

  for (const item of items) {
    if (!item.name || !item.price) continue;

    const categoryName = categorizeItem(item.name);
    const categoryId = categoryName ? await getCategoryId(categoryName) : null;

    const quantity = item.quantity || 1;
    const unitPrice = item.price;
    const totalPrice = unitPrice * quantity;

    const { error: itemError } = await supabase
      .from('items')
      .insert({
        receipt_id: receiptId,
        product_name: item.name,
        barcode: item.barcode || null,
        qty: quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        category_id: categoryId
      });

    if (itemError) {
      console.error('Item insert failed:', itemError);
      // Continue with other items
    } else {
      itemsInserted++;
    }
  }

  return {
    receiptId,
    totalAmount,
    itemsCount: itemsInserted
  };
}

async function cleanupFailedUpload(userId: string, receiptId: string) {
  try {
    // Delete from storage
    const { data: files } = await supabase.storage
      .from('receipt-images')
      .list(`receipts/${userId}/${receiptId}`);

    if (files && files.length > 0) {
      const filesToDelete = files.map(file => `receipts/${userId}/${receiptId}/${file.name}`);
      await supabase.storage
        .from('receipt-images')
        .remove(filesToDelete);
    }

    // Delete from database (cascade will handle related records)
    await supabase
      .from('receipts')
      .delete()
      .eq('id', receiptId);

  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables at runtime
    if (!envValidation.valid) {
      console.error('❌ API заявка провалена: Липсват променливи:', envValidation.missingVars);
      return NextResponse.json(
        {
          error: ERRORS.CONFIG_ERROR,
          details: process.env.NODE_ENV === 'development' ?
            `Липсват променливи: ${envValidation.missingVars.join(', ')}` :
            undefined
        },
        { status: 500 }
      );
    }

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: ERRORS.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify JWT token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: ERRORS.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Rate limiting
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: ERRORS.RATE_LIMIT,
          resetTime: rateLimit.resetTime
        },
        { status: 429 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const files: File[] = [];

    // Extract files from form data
    for (const [key, value] of formData.entries()) {
      if (value instanceof File && key.startsWith('image')) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: ERRORS.INVALID_REQUEST },
        { status: 400 }
      );
    }

    // Validate all files
    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    // Generate unique receipt ID (will be auto-generated by database)
    let receiptId: string;

    try {
      // Process with OCR (Google Vision → TabScanner → Mock)
      const tabscannerResponse = await processReceiptOCR(files);

      // Save to database (this will generate the receiptId)
      const result = await saveReceiptToDatabase(
        userId,
        tabscannerResponse,
        files
      );

      receiptId = result.receiptId;

      // Return success response
      const isGoogleVision = tabscannerResponse.confidence && tabscannerResponse.confidence >= 50 && tabscannerResponse.confidence < 100;
      const isTabScanner = tabscannerResponse.confidence === 100;
      const isMockOCR = tabscannerResponse.confidence && tabscannerResponse.confidence >= 85 && tabscannerResponse.confidence < 100 && !isGoogleVision;

      let message: string = SUCCESS.PROCESSING_COMPLETE;
      let status = 'completed';
      let processingDetails: any = {};

      if (isGoogleVision) {
        message = `🤖 Касовата бележка е прочетена с Enhanced Google Vision OCR (${tabscannerResponse.confidence}% точност)`;
        status = 'google_vision_enhanced_processed';

        // Add enhanced processing details if available
        if ((tabscannerResponse as any).qualityReport) {
          const qualityReport = (tabscannerResponse as any).qualityReport;
          processingDetails = {
            qualityIssues: qualityReport.issues,
            processingTime: qualityReport.processingTime,
            suggestions: qualityReport.suggestions
          };

          if (qualityReport.issues === 0) {
            message += ' - ✅ Пълно качество';
          } else if (qualityReport.issues <= 2) {
            message += ` - ⚠️ ${qualityReport.issues} проблема`;
          } else {
            message += ` - ❌ ${qualityReport.issues} проблема`;
          }
        }
      } else if (isTabScanner) {
        message = `📄 Касовата бележка е обработена с TabScanner (${tabscannerResponse.confidence}% точност)`;
        status = 'tabscanner_processed';
      } else if (isMockOCR) {
        message = `🧪 Касовата бележка е обработена със симулирано OCR (${tabscannerResponse.confidence}% увереност)`;
        status = 'mock_ocr_processed';
      }

      return NextResponse.json({
        success: true,
        message,
        data: {
          receipt_id: result.receiptId,
          total_amount: result.totalAmount,
          items_count: result.itemsCount,
          processing_status: status,
          currency: 'BGN',
          confidence: tabscannerResponse.confidence,
          retailer: tabscannerResponse.receipt?.retailer,
          processing_details: processingDetails,
          enhanced_features: {
            store_detection: isGoogleVision,
            product_categorization: isGoogleVision,
            quality_scoring: isGoogleVision,
            bulgarian_recognition: isGoogleVision
          }
        }
      });

    } catch (processingError) {
      // Cleanup on failure (only if receiptId was generated)
      if (receiptId!) {
        await cleanupFailedUpload(userId, receiptId!);
      }

      console.error('Processing error:', processingError);

      // Determine specific error type
      let errorMessage: string = ERRORS.PROCESSING_ERROR;

      if (processingError instanceof Error) {
        if (processingError.message.includes('Tabscanner')) {
          errorMessage = ERRORS.TABSCANNER_ERROR;
        } else if (processingError.message.includes('Storage')) {
          errorMessage = ERRORS.UPLOAD_ERROR;
        } else if (processingError.message.includes('database') || processingError.message.includes('insert')) {
          errorMessage = ERRORS.DATABASE_ERROR;
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? processingError?.toString() : undefined
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API route error:', error);

    return NextResponse.json(
      {
        error: ERRORS.PROCESSING_ERROR,
        details: process.env.NODE_ENV === 'development' ? error?.toString() : undefined
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: ERRORS.INVALID_REQUEST },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: ERRORS.INVALID_REQUEST },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: ERRORS.INVALID_REQUEST },
    { status: 405 }
  );
}