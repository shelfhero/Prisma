import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { openai, OPENAI_MODELS } from '@/lib/openai';
import { categorizeProducts, type CategoryName } from '@/lib/categorization';

// Bulgarian error messages
const ERRORS = {
  UNAUTHORIZED: 'Неоторизиран достъп',
  INVALID_FILE: 'Невалиден файл',
  FILE_TOO_LARGE: 'Файлът е твърде голям (максимум 10MB)',
  UPLOAD_ERROR: 'Грешка при качване на файла',
  PROCESSING_ERROR: 'Проблем с обработката на бона',
  OCR_ERROR: 'Грешка при обработка на изображението',
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

interface OCRResponse {
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
  processing?: {
    googleVision: boolean;
    gptVision: boolean;
    reconciliation: boolean;
  };
  reconciliation?: {
    discrepancies: number;
    needsManualReview: boolean;
    itemsAdded: number;
    priceCorrections: number;
  };
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
    'SUPABASE_SERVICE_ROLE_KEY'
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

async function processReceiptBasic(imageFiles: File[]): Promise<OCRResponse> {
  console.log('📸 Basic receipt processing (no OCR)...');
  console.log(`   Image files received: ${imageFiles.length}`);

  if (imageFiles.length === 0) {
    throw new Error('No image files provided');
  }

  // Get first image info
  const firstImage = imageFiles[0];
  console.log(`   Processing image: ${firstImage.name} (${Math.round(firstImage.size / 1024)}KB)`);

  // Create a basic receipt structure without any OCR processing
  const now = new Date();

  return {
    success: true,
    receipt: {
      retailer: 'Uploaded Receipt',
      total: 0.00,
      date: now.toISOString(),
      items: [
        {
          name: 'Receipt Processing Placeholder',
          price: 0.00,
          quantity: 1
        }
      ]
    },
    raw_text: `Receipt uploaded: ${firstImage.name}\nSize: ${Math.round(firstImage.size / 1024)}KB\nUploaded at: ${now.toLocaleString('bg-BG')}`,
    confidence: 100,
    processing: {
      googleVision: false,
      gptVision: false,
      reconciliation: false
    }
  };
}

async function processReceiptEnhanced(imageFiles: File[]): Promise<OCRResponse> {
  console.log('🚀 Enhanced receipt processing (Google Vision + GPT-4o Vision + Reconciliation)...');
  console.log(`   Image files received: ${imageFiles.length}`);

  if (imageFiles.length === 0) {
    throw new Error('No image files provided');
  }

  const firstImage = imageFiles[0];
  console.log(`   Processing image: ${firstImage.name} (${Math.round(firstImage.size / 1024)}KB)`);

  try {
    // Convert image to buffer for both OCR systems
    const imageBuffer = Buffer.from(await firstImage.arrayBuffer());

    // Step 1: Google Vision OCR processing
    console.log('   Step 1: Google Vision OCR processing...');
    let googleResult: any = null;
    let googleItems: any[] = [];
    let googleTotal = 0;
    let googleError = null;

    try {
      const { processReceiptWithGoogleVision } = await import('@/lib/google-vision-ocr');
      googleResult = await processReceiptWithGoogleVision(imageBuffer, true);

      if (googleResult.success && googleResult.receipt) {
        googleItems = googleResult.receipt.items || [];
        googleTotal = googleResult.receipt.total || 0;
        console.log(`   ✅ Google Vision: ${googleItems.length} items, total: ${googleTotal} лв (${googleResult.confidence}% confidence)`);
      } else {
        throw new Error('Google Vision returned unsuccessful result');
      }
    } catch (gError) {
      googleError = gError instanceof Error ? gError.message : 'Unknown Google Vision error';
      console.log(`   ❌ Google Vision failed: ${googleError}`);
    }

    // Step 2: GPT-4o Vision processing
    console.log('   Step 2: GPT-4o Vision processing...');
    let gptResult: any = null;
    let gptItems: any[] = [];
    let gptTotal = 0;
    let gptError = null;

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not found');
      }

      // GPT-4o Vision prompt for Bulgarian receipt analysis
      const prompt = `You are a Bulgarian receipt scanner. Extract ALL items from this receipt.

Return JSON:
{
  "storeName": "Store name",
  "totalAmount": 123.45,
  "date": "2023-12-25",
  "items": [
    {
      "name": "Product name",
      "price": 4.60,
      "quantity": 1,
      "unitPrice": 4.60
    }
  ]
}

Extract EVERY visible item with its exact price and quantity. Be thorough and accurate.`;

      // Call GPT-4o Vision API
      const response = await openai.chat.completions.create({
        model: OPENAI_MODELS.GPT4O,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.01,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (content) {
        // Parse GPT-4o response
        try {
          let cleanContent = content.replace(/```json\s*\n?/g, '').replace(/```\s*$/g, '').trim();
          const extractedData = JSON.parse(cleanContent);

          gptItems = extractedData.items || [];
          gptTotal = extractedData.totalAmount || 0;
          gptResult = {
            success: true,
            receipt: {
              retailer: extractedData.storeName || 'GPT-4o Analyzed Receipt',
              total: gptTotal,
              date: extractedData.date || new Date().toISOString(),
              items: gptItems
            },
            raw_text: content,
            confidence: 85
          };

          console.log(`   ✅ GPT-4o Vision: ${gptItems.length} items, total: ${gptTotal} лв (85% confidence)`);
        } catch (parseError) {
          throw new Error('Failed to parse GPT-4o response');
        }
      } else {
        throw new Error('No response from GPT-4o Vision');
      }
    } catch (gError) {
      gptError = gError instanceof Error ? gError.message : 'Unknown GPT-4o error';
      console.log(`   ❌ GPT-4o Vision failed: ${gptError}`);
    }

    // Step 3: Intelligent Reconciliation
    console.log('   Step 3: Intelligent reconciliation...');
    let finalResult;
    let reconciliationData = {
      discrepancies: 0,
      needsManualReview: false,
      itemsAdded: 0,
      priceCorrections: 0
    };

    if (googleResult && gptResult) {
      console.log('   🔄 Both OCR systems successful - performing reconciliation...');

      // Use the result with more items as base, supplement with the other
      const primaryItems = googleItems.length >= gptItems.length ? googleItems : gptItems;
      const secondaryItems = googleItems.length >= gptItems.length ? gptItems : googleItems;
      const primaryTotal = googleItems.length >= gptItems.length ? googleTotal : gptTotal;
      const primaryRetailer = googleItems.length >= gptItems.length ? (googleResult.receipt?.retailer || '') : (gptResult.receipt?.retailer || '');
      const primaryDate = googleItems.length >= gptItems.length ? (googleResult.receipt?.date || '') : (gptResult.receipt?.date || '');

      console.log(`   📊 Primary OCR (${googleItems.length >= gptItems.length ? 'Google' : 'GPT'}): ${primaryItems.length} items`);
      console.log(`   📊 Secondary OCR (${googleItems.length >= gptItems.length ? 'GPT' : 'Google'}): ${secondaryItems.length} items`);

      // Find items that are missing from primary but exist in secondary
      const missingItems: any[] = [];
      secondaryItems.forEach(secItem => {
        const found = primaryItems.find(primItem =>
          primItem.name.toLowerCase().includes(secItem.name.toLowerCase().substring(0, 5)) ||
          secItem.name.toLowerCase().includes(primItem.name.toLowerCase().substring(0, 5)) ||
          Math.abs(primItem.price - secItem.price) < 0.01
        );

        if (!found) {
          missingItems.push({
            ...secItem,
            source: googleItems.length >= gptItems.length ? 'gpt' : 'google'
          });
        }
      });

      if (missingItems.length > 0) {
        reconciliationData.itemsAdded = missingItems.length;
        console.log(`   ➕ Adding ${missingItems.length} missing items from secondary OCR`);
      }

      // Combine items
      const combinedItems = [...primaryItems, ...missingItems];

      // Check for price discrepancies between similar items
      let priceCorrections = 0;
      primaryItems.forEach(primItem => {
        const similarSecondary = secondaryItems.find(secItem =>
          primItem.name.toLowerCase().includes(secItem.name.toLowerCase().substring(0, 5)) ||
          secItem.name.toLowerCase().includes(primItem.name.toLowerCase().substring(0, 5))
        );

        if (similarSecondary && Math.abs(primItem.price - similarSecondary.price) > 0.02) {
          reconciliationData.priceCorrections++;
          priceCorrections++;
        }
      });

      reconciliationData.discrepancies = Math.abs(googleItems.length - gptItems.length) + priceCorrections;
      reconciliationData.needsManualReview = reconciliationData.discrepancies > 5 || Math.abs(googleTotal - gptTotal) > 5;

      // Categorize products
      let categorizedItems = combinedItems;
      try {
        const categoryResults = await categorizeProducts(
          combinedItems.map(item => item.name)
        );
        categorizedItems = combinedItems.map((item, index) => ({
          ...item,
          category: categoryResults[index]?.category || 'Други'
        }));
        console.log('   ✅ Auto-categorization completed');
      } catch (categorizeError) {
        console.error('   ❌ Auto-categorization failed:', categorizeError);
      }

      const finalTotal = Math.max(googleTotal, gptTotal); // Use the higher total as it's often more accurate

      finalResult = {
        success: true,
        receipt: {
          retailer: primaryRetailer || 'Dual OCR Analyzed Receipt',
          total: finalTotal,
          date: primaryDate || new Date().toISOString(),
          items: categorizedItems.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || item.price,
            barcode: item.barcode,
            category: (item as any).category
          }))
        },
        raw_text: `Google Vision Result:\n${googleResult.raw_text || ''}\n\nGPT-4o Vision Result:\n${gptResult.raw_text || ''}`,
        confidence: Math.round((googleResult.confidence + gptResult.confidence) / 2),
        processing: {
          googleVision: true,
          gptVision: true,
          reconciliation: true
        },
        reconciliation: reconciliationData
      };

      console.log(`   🎯 Reconciliation complete: ${categorizedItems.length} total items, ${finalTotal} лв`);
      console.log(`   📊 Discrepancies: ${reconciliationData.discrepancies}, Added items: ${reconciliationData.itemsAdded}`);

    } else if (googleResult) {
      console.log('   📱 Using Google Vision result only');

      // Categorize Google Vision items
      let categorizedItems = googleItems;
      try {
        const categoryResults = await categorizeProducts(
          googleItems.map(item => item.name)
        );
        categorizedItems = googleItems.map((item, index) => ({
          ...item,
          category: categoryResults[index]?.category || 'Други'
        }));
      } catch (categorizeError) {
        console.error('   ❌ Auto-categorization failed:', categorizeError);
      }

      finalResult = {
        ...googleResult,
        receipt: {
          ...googleResult.receipt,
          items: categorizedItems.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || item.price,
            barcode: item.barcode,
            category: (item as any).category
          }))
        },
        processing: {
          googleVision: true,
          gptVision: false,
          reconciliation: false
        }
      };

    } else if (gptResult) {
      console.log('   🤖 Using GPT-4o Vision result only');

      // Categorize GPT-4o items
      let categorizedItems = gptItems;
      try {
        const categoryResults = await categorizeProducts(
          gptItems.map(item => item.name)
        );
        categorizedItems = gptItems.map((item, index) => ({
          ...item,
          category: categoryResults[index]?.category || 'Други'
        }));
      } catch (categorizeError) {
        console.error('   ❌ Auto-categorization failed:', categorizeError);
      }

      finalResult = {
        ...gptResult,
        receipt: {
          ...gptResult.receipt,
          items: categorizedItems.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || item.price,
            barcode: item.barcode,
            category: (item as any).category
          }))
        },
        processing: {
          googleVision: false,
          gptVision: true,
          reconciliation: false
        }
      };

    } else {
      console.log('   ❌ Both OCR systems failed - falling back to basic processing');
      return await processReceiptBasic(imageFiles);
    }

    return finalResult;

  } catch (error) {
    console.error('Enhanced dual OCR processing failed:', error);
    // Fallback to basic processing
    return await processReceiptBasic(imageFiles);
  }
}


async function saveReceiptToDatabase(
  userId: string,
  ocrResponse: OCRResponse,
  imageFiles: File[]
): Promise<{ receiptId: string; totalAmount: number; itemsCount: number }> {
  const receipt = ocrResponse.receipt;

  if (!receipt) {
    throw new Error('No receipt data from OCR processing');
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
      tabscanner_raw: ocrResponse
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
    const unitPrice = item.unitPrice || item.price; // Use unit price if available
    const totalPrice = item.price; // Always use the total price from receipt

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
      // Process with enhanced pipeline (Google Vision + GPT-4o)
      const ocrResponse = await processReceiptEnhanced(files);

      // Save to database (this will generate the receiptId)
      const result = await saveReceiptToDatabase(
        userId,
        ocrResponse,
        files
      );

      receiptId = result.receiptId;

      // Return success response with enhanced processing details
      const hasGoogleVision = (ocrResponse as any).processing?.googleVision;
      const hasGPTVision = (ocrResponse as any).processing?.gptVision;
      const hasReconciliation = (ocrResponse as any).processing?.reconciliation;

      let message: string = SUCCESS.PROCESSING_COMPLETE;
      let status = 'completed';
      let processingDetails: any = {};

      if (hasGoogleVision && hasGPTVision && hasReconciliation) {
        // Enhanced two-step processing with reconciliation
        const reconciliation = (ocrResponse as any).reconciliation;
        message = `🤖🧠 Касовата бележка е обработена с Google Vision + GPT-4 Vision (${ocrResponse.confidence}% точност)`;
        status = 'enhanced_dual_ocr_processed';

        processingDetails = {
          dualOCRProcessing: true,
          discrepancies: reconciliation.discrepancies,
          itemsAdded: reconciliation.itemsAdded,
          priceCorrections: reconciliation.priceCorrections,
          manualReviewNeeded: reconciliation.needsManualReview
        };

        if (reconciliation.discrepancies === 0) {
          message += ' - ✅ Пълно съответствие';
        } else if (reconciliation.itemsAdded > 0) {
          message += ` - 🔍 Намерени ${reconciliation.itemsAdded} допълнителни артикула`;
        } else if (reconciliation.discrepancies <= 3) {
          message += ` - ⚠️ ${reconciliation.discrepancies} малки различия`;
        } else {
          message += ` - ❌ ${reconciliation.discrepancies} сериозни различия`;
        }

        if (reconciliation.needsManualReview) {
          message += ' - ⚙️ Препоръчва се ръчна проверка';
        }
      } else if (hasGoogleVision) {
        // Google Vision only
        message = `🤖 Касовата бележка е прочетена с Enhanced Google Vision OCR (${ocrResponse.confidence}% точност)`;
        status = 'google_vision_enhanced_processed';

        // Add enhanced processing details if available
        if ((ocrResponse as any).qualityReport) {
          const qualityReport = (ocrResponse as any).qualityReport;
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
      } else {
        message = `📄 Изображението е качено успешно (обработката на текста е временно недостъпна)`;
        status = 'image_uploaded';
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
          confidence: ocrResponse.confidence,
          retailer: ocrResponse.receipt?.retailer,
          processing_details: processingDetails,
          enhanced_features: {
            store_detection: hasGoogleVision,
            product_categorization: hasGoogleVision,
            quality_scoring: hasGoogleVision,
            bulgarian_recognition: hasGoogleVision,
            gpt_vision_analysis: hasGPTVision,
            intelligent_reconciliation: hasReconciliation,
            dual_ocr_verification: hasGoogleVision && hasGPTVision
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
        if (processingError.message.includes('Google Vision')) {
          errorMessage = 'Грешка при Google Vision OCR обработка';
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