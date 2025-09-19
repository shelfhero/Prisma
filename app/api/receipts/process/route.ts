import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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
): Promise<{ path: string; width?: number; height?: number }> {
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

  // Get image dimensions if possible
  let width: number | undefined;
  let height: number | undefined;

  try {
    // Create image to get dimensions
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();

    await new Promise((resolve, reject) => {
      img.onload = () => {
        width = img.naturalWidth;
        height = img.naturalHeight;
        URL.revokeObjectURL(imageUrl);
        resolve(void 0);
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  } catch (error) {
    // Dimensions not critical, continue without them
    console.warn('Could not get image dimensions:', error);
  }

  return { path: storagePath, width, height };
}

async function callTabscannerAPI(imageFiles: File[]): Promise<TabscannerResponse> {
  const tabscannerEndpoint = process.env.TABSCANNER_ENDPOINT!;
  const tabscannerApiKey = process.env.TABSCANNER_API_KEY!;

  if (!tabscannerEndpoint || !tabscannerApiKey) {
    throw new Error('Tabscanner configuration missing');
  }

  const formData = new FormData();

  // Add API key
  formData.append('api_key', tabscannerApiKey);

  // Add images
  imageFiles.forEach((file, index) => {
    formData.append(`image_${index}`, file);
  });

  // Add processing options
  formData.append('language', 'bg'); // Bulgarian language
  formData.append('currency', 'BGN');
  formData.append('return_raw_text', 'true');

  const response = await fetch(tabscannerEndpoint, {
    method: 'POST',
    body: formData,
    headers: {
      'User-Agent': 'Призма-App/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Tabscanner API error: ${response.status} ${response.statusText}`);
  }

  const result: TabscannerResponse = await response.json();

  if (!result.success) {
    throw new Error('Tabscanner processing failed');
  }

  return result;
}

async function saveReceiptToDatabase(
  userId: string,
  receiptId: string,
  tabscannerResponse: TabscannerResponse,
  imagePaths: Array<{ path: string; width?: number; height?: number }>
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

  // Insert receipt
  const { data: receiptData, error: receiptError } = await supabase
    .from('receipts')
    .insert({
      id: receiptId,
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

  // Insert receipt images
  for (const imagePath of imagePaths) {
    const { error: imageError } = await supabase
      .from('receipt_images')
      .insert({
        receipt_id: receiptId,
        storage_path: imagePath.path,
        width: imagePath.width || null,
        height: imagePath.height || null
      });

    if (imageError) {
      console.error('Image insert failed:', imageError);
      // Don't throw here, images are not critical
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

    // Generate unique receipt ID
    const receiptId = uuidv4();

    try {
      // Upload images to Supabase Storage
      const imagePaths: Array<{ path: string; width?: number; height?: number }> = [];

      for (let i = 0; i < files.length; i++) {
        const imagePath = await uploadImageToStorage(files[i], userId, receiptId, i);
        imagePaths.push(imagePath);
      }

      // Process with Tabscanner API
      const tabscannerResponse = await callTabscannerAPI(files);

      // Save to database
      const result = await saveReceiptToDatabase(
        userId,
        receiptId,
        tabscannerResponse,
        imagePaths
      );

      // Return success response
      return NextResponse.json({
        success: true,
        message: SUCCESS.PROCESSING_COMPLETE,
        data: {
          receipt_id: result.receiptId,
          total_amount: result.totalAmount,
          items_count: result.itemsCount,
          processing_status: 'completed',
          currency: 'BGN'
        }
      });

    } catch (processingError) {
      // Cleanup on failure
      await cleanupFailedUpload(userId, receiptId);

      console.error('Processing error:', processingError);

      // Determine specific error type
      let errorMessage = ERRORS.PROCESSING_ERROR;

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