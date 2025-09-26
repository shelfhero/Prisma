/**
 * Google Cloud Vision API OCR Implementation for Призма
 * Enhanced Bulgarian receipt text recognition and parsing
 */

import { EnhancedReceiptParser } from './receipt-parsing/enhanced-parser';
import { ReceiptExtraction } from './receipt-parsing/types';
import { ReceiptImagePreprocessor, ReceiptValidator, PreprocessedImage } from './image-preprocessing';

// Import Google Cloud Vision at module level to avoid Jest worker issues
let ImageAnnotatorClient: any = null;
try {
  // Only import if we're not in a test environment
  if (typeof window === 'undefined' && !process.env.JEST_WORKER_ID) {
    const vision = require('@google-cloud/vision');
    ImageAnnotatorClient = vision.ImageAnnotatorClient;
  }
} catch (error) {
  console.warn('Google Cloud Vision not available in this environment');
}

interface ReceiptData {
  retailer: string;
  total: number;
  date: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    barcode?: string;
    category?: string;
    confidence?: number;
  }>;
}

interface OCRResponse {
  success: boolean;
  receipt?: ReceiptData;
  raw_text?: string;
  confidence?: number;
  extraction?: ReceiptExtraction;
  qualityReport?: {
    issues: number;
    suggestions: string[];
    processingTime: number;
  };
  preprocessing?: {
    attempts: number;
    bestAttempt: string;
    imageQualityIssues: string[];
    validationResults?: {
      isValid: boolean;
      discrepancy: number;
      confidence: 'high' | 'medium' | 'low';
      needsManualReview: boolean;
    };
  };
}

// Initialize Google Cloud Vision client
async function createVisionClient() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!projectId && !apiKey && !credentialsPath) {
    throw new Error('Google Cloud Vision not configured');
  }

  if (!ImageAnnotatorClient) {
    throw new Error('Google Cloud Vision not available in this environment');
  }

  try {
    // Use API key if available, otherwise fall back to service account
    const clientConfig: any = {};

    if (projectId) {
      clientConfig.projectId = projectId;
    }

    // Only use API key if it's not a file path
    if (apiKey && !apiKey.startsWith('.')) {
      clientConfig.apiKey = apiKey;
    }

    // For service account authentication, the client will automatically use GOOGLE_APPLICATION_CREDENTIALS
    return new ImageAnnotatorClient(clientConfig);
  } catch (error) {
    console.error('Failed to load Google Cloud Vision client:', error);
    throw new Error('Failed to initialize Google Vision client - process limitations');
  }
}

// Legacy parser - kept for backward compatibility
function parseReceiptText(text: string): ReceiptData {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  let retailer = 'Неизвестен магазин';
  let total = 0;
  let date = new Date().toISOString();
  const items: Array<{ name: string; price: number; quantity: number }> = [];

  // Common Bulgarian retailer patterns
  const retailerPatterns = [
    /ЛИДЛ|LIDL/i,
    /ФАНТАСТИКО|FANTASTICO/i,
    /БИЛЛА|BILLA/i,
    /КАУФЛАНД|KAUFLAND/i,
    /Т.МАРКЕТ|T.MARKET/i,
    /МЕТРО|METRO/i,
    /ОМВ|OMV/i,
    /SHELL|ШЕЛ/i
  ];

  // Extract retailer name
  for (const line of lines.slice(0, 5)) { // Check first 5 lines
    for (const pattern of retailerPatterns) {
      if (pattern.test(line)) {
        retailer = line;
        break;
      }
    }
    if (retailer !== 'Неизвестен магазин') break;
  }

  // Extract total amount - Enhanced patterns for Bulgarian receipts
  const totalPatterns = [
    /ОБЩО\s*СУМА/i,
    /ОБЩА\s*СУМА/i,
    /ОБЩО|TOTAL|СУМА/i,
    /К\s*ПЛАЩАНЕ/i,
    /ЗА\s*ПЛАЩАНЕ/i,
    /ПОЛУЧЕНИ/i,
    /SUMA/i,
    /ВСИЧКО/i,
    /ИТОГО/i
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for total patterns
    for (const pattern of totalPatterns) {
      if (pattern.test(line)) {
        console.log(`🔍 Found total pattern "${pattern}" in line: "${line}"`);

        // First, try to extract number from the same line
        let numberMatch = line.match(/(\d+[.,]\d{1,2})/);

        // If not found on same line, check next line
        if (!numberMatch && i + 1 < lines.length) {
          console.log(`🔍 Checking next line for total: "${lines[i + 1]}"`);
          numberMatch = lines[i + 1].match(/(\d+[.,]\d{1,2})/);
        }

        if (numberMatch) {
          total = parseFloat(numberMatch[1].replace(',', '.'));
          console.log(`💰 Found total: ${total}`);
          break;
        }
      }
    }

    // Look for lines ending with currency indicators
    if (total === 0) {
      const currencyPatterns = [
        /(\d+[.,]\d{1,2})\s*лв\.?\s*$/i,
        /(\d+[.,]\d{1,2})\s*BGN\s*$/i,
        /(\d+[.,]\d{1,2})\s*$/, // Just numbers at end
      ];

      for (const pattern of currencyPatterns) {
        const priceMatch = line.match(pattern);
        if (priceMatch) {
          const potentialTotal = parseFloat(priceMatch[1].replace(',', '.'));
          if (potentialTotal > total && potentialTotal < 1000) { // Reasonable total limit
            total = potentialTotal;
          }
        }
      }
    }
  }

  // Extract date
  const datePatterns = [
    /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/,
    /(\d{2,4})[.\/-](\d{1,2})[.\/-](\d{1,2})/
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          // Try to parse the date (assume DD.MM.YYYY format)
          const [, day, month, year] = match;
          const fullYear = year.length === 2 ? `20${year}` : year;
          const parsedDate = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString();
            break;
          }
        } catch (e) {
          // Continue with next pattern
        }
      }
    }
  }

  // Extract items - Enhanced parsing for Bulgarian receipts
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip header/footer/total lines
    if (/ЛИДЛ|БИЛЛА|КАСОВА|БЛАГОДАРИМ|VISIT|WWW|ФАНТАСТИКО|КАУФЛАНД/i.test(line)) continue;
    if (/ОБЩО|TOTAL|СУМА|ПЛАЩАНЕ|КАРТА|CASH|ПОЛУЧЕНИ|ВСИЧКО|ИТОГО|ОБЩА/i.test(line)) continue;
    if (/ДАТА|DATE|ВРЕМЕ|TIME|КАСИЕР|№|НОМЕР|ЕИК|ЗДДС|УНП|АРТИКУЛА/i.test(line)) continue;
    if (/Намаление|гр\.|ул\.|ЕООД/i.test(line)) continue;

    // Check if this line looks like an item name (no numbers at the end)
    if (line.trim().length > 2 && !/\d+[.,]\d{1,2}\s*[БлвBGN]*\s*$/i.test(line.trim())) {
      // Look for price on the next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const priceMatch = nextLine.match(/(\d+[.,]\d{1,2})\s*[БлвBGN]*\s*$/i);

        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(',', '.'));
          let itemName = line.trim();

          // Skip if price is too high (likely not an item)
          if (price > 0 && price <= (total || 1000)) {
            // Clean up item name
            itemName = itemName.replace(/[#<>]/g, '').trim();

            // Check for quantity patterns in the item name
            let quantity = 1;
            const qtyPatterns = [
              /(\d+[.,]\d+)\s*x\s*(\d+[.,]\d+)/i, // "1.585 x 1.00"
              /(\d+)\s*x\s*(.+)/i,                // "2 x Item"
              /(\d+)\s*бр\.?\s*(.+)/i,           // "2 бр Item"
              /(\d+)\s*шт\.?\s*(.+)/i,           // "2 шт Item"
            ];

            for (const qtyPattern of qtyPatterns) {
              const qtyMatch = itemName.match(qtyPattern);
              if (qtyMatch) {
                if (qtyPattern.source.includes('x.*\\d')) {
                  // Weight x price pattern - use the weight * price calculation
                  const weight = parseFloat(qtyMatch[1].replace(',', '.'));
                  const unitPrice = parseFloat(qtyMatch[2].replace(',', '.'));
                  quantity = weight;
                  break;
                } else {
                  quantity = parseInt(qtyMatch[1]);
                  itemName = qtyMatch[2].trim();
                  break;
                }
              }
            }

            // Add item if valid
            if (itemName.length > 0 && !(/^\d+[.,]\d+/.test(itemName))) {
              items.push({
                name: itemName,
                price: quantity > 1 ? price / quantity : price,
                quantity
              });
            }
          }
        }
      }
    }

    // Also try traditional same-line patterns as fallback
    const itemPatterns = [
      // Pattern: "Item name    price лв"
      /^(.+?)\s+(\d+[.,]\d{1,2})\s*лв\.?\s*$/i,
      // Pattern: "Item name    price BGN"
      /^(.+?)\s+(\d+[.,]\d{1,2})\s*BGN\s*$/i,
      // Pattern with multiple spaces: "Item name       price"
      /^(.+?)\s{2,}(\d+[.,]\d{1,2})\s*[БлвBGN]*\s*$/i,
    ];

    for (const pattern of itemPatterns) {
      const itemMatch = line.match(pattern);
      if (itemMatch) {
        const [, name, priceStr] = itemMatch;
        const price = parseFloat(priceStr.replace(',', '.'));

        // Validate item
        if (name.length > 1 && price > 0 && price <= (total || 1000)) {
          let cleanName = name.trim().replace(/[#<>]/g, '');

          // Add item if valid and not already added
          if (cleanName.length > 0 && !items.find(item => item.name === cleanName)) {
            items.push({
              name: cleanName,
              price: price,
              quantity: 1
            });
            break;
          }
        }
      }
    }
  }

  // If no items found, create a single item from the total
  if (items.length === 0 && total > 0) {
    items.push({
      name: 'Покупка',
      price: total,
      quantity: 1
    });
  }

  return {
    retailer,
    total,
    date,
    items
  };
}

// Main OCR function with enhanced preprocessing and multiple attempts
export async function processReceiptWithGoogleVision(imageBuffer: Buffer, debugMode = false): Promise<OCRResponse> {
  const startTime = Date.now();

  try {
    // Check if Google Cloud Vision is configured
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!projectId && !apiKey && !credentialsPath) {
      throw new Error('Google Cloud Vision not configured');
    }

    const client = await createVisionClient();

    if (debugMode) {
      console.log('🖼️ Starting image preprocessing and OCR analysis...');
    }

    // Step 1: Analyze image quality and generate preprocessing options
    const qualityAnalysis = await ReceiptImagePreprocessor.analyzeImageQuality(imageBuffer);

    if (debugMode) {
      console.log('📊 Image quality analysis:');
      console.log(`  Issues detected: ${qualityAnalysis.issues.join(', ')}`);
      console.log(`  Needs enhancement: ${qualityAnalysis.needsEnhancement}`);
    }

    // Step 2: Generate multiple preprocessed versions
    const preprocessedImages = await ReceiptImagePreprocessor.preprocessReceipt(
      imageBuffer,
      qualityAnalysis.suggestedOptions
    );

    if (debugMode) {
      console.log(`🔄 Generated ${preprocessedImages.length} image variants for processing`);
    }

    // Step 3: Process each variant and collect results
    const ocrResults: Array<{
      extraction: ReceiptExtraction;
      confidence: number;
      rawText: string;
      variant: string;
    }> = [];

    for (let i = 0; i < preprocessedImages.length; i++) {
      const variant = preprocessedImages[i];

      try {
        if (debugMode) {
          console.log(`📸 Processing variant ${i + 1}/${preprocessedImages.length}: [${variant.metadata.preprocessing.join(', ')}]`);
        }

        // Perform OCR on this variant
        const [result] = await client.textDetection({
          image: { content: variant.buffer }
        });

        const detections = result.textAnnotations;
        if (detections && detections.length > 0) {
          const fullText = detections[0].description || '';

          // Parse with enhanced parser
          const parser = new EnhancedReceiptParser({ debugMode: false }); // Suppress debug for variants
          const extraction = await parser.parseReceipt(fullText, 'google_vision');

          // Calculate Google Vision confidence
          const googleConfidence = result.fullTextAnnotation?.pages?.[0]?.confidence || 0.8;

          ocrResults.push({
            extraction,
            confidence: extraction.confidence * googleConfidence,
            rawText: fullText,
            variant: variant.metadata.preprocessing.join(', ')
          });

          if (debugMode) {
            console.log(`  ✓ Variant ${i + 1}: ${extraction.items.length} items, ${Math.round(extraction.confidence * 100)}% confidence`);
          }
        }
      } catch (variantError) {
        if (debugMode) {
          console.log(`  ✗ Variant ${i + 1} failed: ${variantError instanceof Error ? variantError.message : 'Unknown error'}`);
        }
      }
    }

    if (ocrResults.length === 0) {
      throw new Error('No text detected in any image variant');
    }

    // Step 4: Select best result based on confidence and validation
    let bestResult = ocrResults[0];
    let bestValidation: ReturnType<typeof ReceiptValidator.validateReceiptMath> | undefined;

    for (const result of ocrResults) {
      // Validate math for this result
      const validation = ReceiptValidator.validateReceiptMath(
        result.extraction.items.map(item => ({ price: item.price, quantity: item.quantity })),
        result.extraction.total
      );

      // Calculate combined score
      let score = result.confidence;
      if (validation.isValid) score += 0.2;
      if (validation.confidence === 'high') score += 0.1;
      if (validation.confidence === 'medium') score += 0.05;

      // Prefer results with more items (up to a point)
      const itemBonus = Math.min(result.extraction.items.length * 0.02, 0.1);
      score += itemBonus;

      if (score > bestResult.confidence || !bestValidation || validation.confidence === 'high') {
        bestResult = result;
        bestValidation = validation;
      }
    }

    // Step 5: Calculate overall confidence
    const textQuality = {
      hasAllPrices: bestResult.extraction.items.every(item => item.price > 0),
      hasValidItems: bestResult.extraction.items.length > 0 &&
                     bestResult.extraction.items.every(item => item.name.length > 1)
    };

    const confidenceAnalysis = ReceiptValidator.calculateOCRConfidence(
      bestResult.confidence * 100,
      bestValidation!,
      bestResult.extraction.items.length,
      textQuality
    );

    // Convert to legacy format for compatibility
    const receiptData: ReceiptData = {
      retailer: bestResult.extraction.retailer,
      total: bestResult.extraction.total,
      date: bestResult.extraction.date,
      items: bestResult.extraction.items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        barcode: item.barcode,
        category: item.category,
        confidence: item.confidence
      }))
    };

    if (debugMode) {
      console.log('🏆 Best result selected:');
      console.log(`  📸 Best variant: [${bestResult.variant}]`);
      console.log(`  🏪 Retailer: "${bestResult.extraction.retailer}"`);
      console.log(`  💰 Total: ${bestResult.extraction.total} лв`);
      console.log(`  📅 Date: ${new Date(bestResult.extraction.date).toLocaleDateString('bg-BG')}`);
      console.log(`  📦 Items: ${bestResult.extraction.items.length}`);
      console.log(`  🎯 Final Confidence: ${Math.round(confidenceAnalysis.overallConfidence)}%`);
      console.log(`  ✅ Math Valid: ${bestValidation?.isValid ? 'Yes' : 'No'} (${bestValidation?.confidence})`);
      console.log(`  ⚠️  Manual Review: ${confidenceAnalysis.needsManualReview ? 'Required' : 'Not needed'}`);

      if (bestValidation?.discrepancy && bestValidation.discrepancy > 0.01) {
        console.log(`  💸 Discrepancy: ${bestValidation.discrepancy.toFixed(2)} лв`);
      }

      bestResult.extraction.items.forEach((item, i) => {
        console.log(`    ${i + 1}. "${item.name}" - ${item.price} лв x${item.quantity}`);
      });

      if (confidenceAnalysis.reasons.length > 0) {
        console.log('🚨 Confidence Issues:');
        confidenceAnalysis.reasons.forEach(reason => console.log(`    ${reason}`));
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      success: bestResult.extraction.success,
      receipt: receiptData,
      raw_text: bestResult.rawText,
      confidence: Math.round(confidenceAnalysis.overallConfidence),
      extraction: bestResult.extraction,
      qualityReport: {
        issues: bestResult.extraction.qualityIssues.length,
        suggestions: bestResult.extraction.suggestions,
        processingTime
      },
      preprocessing: {
        attempts: ocrResults.length,
        bestAttempt: bestResult.variant,
        imageQualityIssues: qualityAnalysis.issues,
        validationResults: bestValidation
      }
    };

  } catch (error) {
    console.error('Google Vision OCR error:', error);

    return {
      success: false,
      raw_text: `Google Vision OCR error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidence: 0,
      preprocessing: {
        attempts: 0,
        bestAttempt: 'none',
        imageQualityIssues: ['Processing failed'],
        validationResults: {
          isValid: false,
          discrepancy: 0,
          confidence: 'low',
          needsManualReview: true
        }
      }
    };
  }
}

// Test function for local development
export async function testGoogleVisionSetup(): Promise<boolean> {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!projectId && !apiKey && !credentialsPath) {
      console.log('❌ Google Cloud Vision not configured');
      return false;
    }

    const client = await createVisionClient();

    // Test with a simple image buffer (1x1 pixel)
    const testImage = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG header

    // This will likely fail but we can check if authentication works
    try {
      await client.textDetection({ image: { content: testImage } });
      console.log('✅ Google Cloud Vision configured correctly');
      return true;
    } catch (err: any) {
      if (err.message?.includes('Invalid image') || err.message?.includes('authentication')) {
        console.log('⚠️ Google Cloud Vision auth OK, but invalid test image (expected)');
        return true;
      } else {
        console.log('❌ Google Cloud Vision configuration error:', err.message);
        return false;
      }
    }

  } catch (error) {
    console.error('❌ Google Vision setup test failed:', error);
    return false;
  }
}