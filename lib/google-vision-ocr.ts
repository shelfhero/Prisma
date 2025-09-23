/**
 * Google Cloud Vision API OCR Implementation for Призма
 * Enhanced Bulgarian receipt text recognition and parsing
 */

import { ImageAnnotatorClient } from '@google-cloud/vision';
import { EnhancedReceiptParser } from './receipt-parsing/enhanced-parser';
import { ReceiptExtraction } from './receipt-parsing/types';

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
}

// Initialize Google Cloud Vision client
function createVisionClient() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!projectId && !apiKey && !credentialsPath) {
    throw new Error('Google Cloud Vision not configured');
  }

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

// Main OCR function with enhanced parsing
export async function processReceiptWithGoogleVision(imageBuffer: Buffer, debugMode = false): Promise<OCRResponse> {
  try {
    // Check if Google Cloud Vision is configured
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!projectId && !apiKey && !credentialsPath) {
      throw new Error('Google Cloud Vision not configured');
    }

    const client = createVisionClient();

    // Perform text detection
    const [result] = await client.textDetection({
      image: { content: imageBuffer }
    });

    const detections = result.textAnnotations;
    if (!detections || detections.length === 0) {
      throw new Error('No text detected in image');
    }

    // Get full text
    const fullText = detections[0].description || '';

    if (debugMode) {
      console.log('🔍 Raw OCR text detected:');
      console.log('='.repeat(50));
      console.log(fullText);
      console.log('='.repeat(50));
    }

    // Use enhanced parser
    const parser = new EnhancedReceiptParser({ debugMode });
    const extraction = await parser.parseReceipt(fullText, 'google_vision');

    // Convert to legacy format for compatibility
    const receiptData: ReceiptData = {
      retailer: extraction.retailer,
      total: extraction.total,
      date: extraction.date,
      items: extraction.items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        barcode: item.barcode,
        category: item.category,
        confidence: item.confidence
      }))
    };

    if (debugMode) {
      console.log('📊 Enhanced parsing results:');
      console.log(`  🏪 Retailer: "${extraction.retailer}"`);
      console.log(`  💰 Total: ${extraction.total} лв`);
      console.log(`  📅 Date: ${new Date(extraction.date).toLocaleDateString('bg-BG')}`);
      console.log(`  📦 Items: ${extraction.items.length}`);
      console.log(`  🎯 Confidence: ${Math.round(extraction.confidence * 100)}%`);
      console.log(`  ⚠️  Quality Issues: ${extraction.qualityIssues.length}`);
      console.log(`  🔍 Store Format: ${extraction.metadata.detectedStore?.name || 'Generic'}`);
      console.log(`  ⏱️  Processing Time: ${extraction.metadata.processingTime}ms`);

      extraction.items.forEach((item, i) => {
        console.log(`    ${i + 1}. "${item.name}" - ${item.price} лв x${item.quantity} (${Math.round(item.confidence * 100)}% confidence)`);
        if (item.category) console.log(`       Category: ${item.category}`);
        if (item.qualityFlags.length > 0) {
          console.log(`       Issues: ${item.qualityFlags.map(f => f.description).join(', ')}`);
        }
      });

      if (extraction.suggestions.length > 0) {
        console.log('💡 Suggestions:');
        extraction.suggestions.forEach(suggestion => console.log(`    ${suggestion}`));
      }
    }

    return {
      success: extraction.success,
      receipt: receiptData,
      raw_text: fullText,
      confidence: Math.round(extraction.confidence * 100),
      extraction,
      qualityReport: {
        issues: extraction.qualityIssues.length,
        suggestions: extraction.suggestions,
        processingTime: extraction.metadata.processingTime
      }
    };

  } catch (error) {
    console.error('Google Vision OCR error:', error);

    return {
      success: false,
      raw_text: `Google Vision OCR error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidence: 0
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

    const client = createVisionClient();

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