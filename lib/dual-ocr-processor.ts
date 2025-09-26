/**
 * Dual OCR Processing Pipeline for Bulgarian Receipts
 * This is the main solution that replaces all broken parsing logic
 */

import { openai, OPENAI_MODELS } from '@/lib/openai';

// Import Google Cloud Vision at module level to avoid Jest worker issues
let ImageAnnotatorClient: any = null;
try {
  if (typeof window === 'undefined' && !process.env.JEST_WORKER_ID) {
    const vision = require('@google-cloud/vision');
    ImageAnnotatorClient = vision.ImageAnnotatorClient;
  }
} catch (error) {
  console.warn('Google Cloud Vision not available in this environment');
}

interface ParsedReceiptItem {
  name: string;
  price: number;
  quantity: number;
  unitPrice: number;
  confidence: number;
}

interface ParsedReceipt {
  retailer: string;
  total: number;
  date: string;
  items: ParsedReceiptItem[];
  confidence: number;
}

interface DualOCRResult {
  success: boolean;
  receipt?: ParsedReceipt;
  raw_text?: string;
  confidence?: number;
  processing: {
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

export class DualOCRProcessor {

  /**
   * Main processing function
   */
  async processReceipt(imageBuffer: Buffer): Promise<DualOCRResult> {
    console.log('🚀 Starting Dual OCR Processing Pipeline...');

    let googleResult: ParsedReceipt | null = null;
    let gptResult: ParsedReceipt | null = null;
    let googleError = null;
    let gptError = null;

    // Step 1: Google Vision OCR
    try {
      console.log('📸 Step 1: Google Vision OCR...');
      googleResult = await this.processWithGoogleVision(imageBuffer);
      console.log(`✅ Google Vision: ${googleResult.items.length} items, ${googleResult.total} лв, ${googleResult.confidence}% confidence`);
    } catch (error) {
      googleError = error instanceof Error ? error.message : 'Unknown Google Vision error';
      console.log(`❌ Google Vision failed: ${googleError}`);
    }

    // Step 2: GPT-4o Vision OCR
    try {
      console.log('🤖 Step 2: GPT-4o Vision OCR...');
      gptResult = await this.processWithGPTVision(imageBuffer);
      console.log(`✅ GPT-4o Vision: ${gptResult.items.length} items, ${gptResult.total} лв, ${gptResult.confidence}% confidence`);
    } catch (error) {
      gptError = error instanceof Error ? error.message : 'Unknown GPT Vision error';
      console.log(`❌ GPT-4o Vision failed: ${gptError}`);
    }

    // Step 3: Intelligent Reconciliation
    if (googleResult && gptResult) {
      console.log('🔄 Step 3: Intelligent reconciliation...');
      return this.reconcileResults(googleResult, gptResult);
    } else if (googleResult) {
      console.log('📱 Using Google Vision only');
      return {
        success: true,
        receipt: googleResult,
        raw_text: 'Google Vision OCR processed',
        confidence: googleResult.confidence,
        processing: { googleVision: true, gptVision: false, reconciliation: false }
      };
    } else if (gptResult) {
      console.log('🤖 Using GPT-4o Vision only');
      return {
        success: true,
        receipt: gptResult,
        raw_text: 'GPT-4o Vision OCR processed',
        confidence: gptResult.confidence,
        processing: { googleVision: false, gptVision: true, reconciliation: false }
      };
    } else {
      console.log('❌ Both OCR systems failed');
      throw new Error(`OCR processing failed. Google Vision: ${googleError}. GPT-4o: ${gptError}`);
    }
  }

  /**
   * Google Vision OCR processing with enhanced Bulgarian parsing
   */
  private async processWithGoogleVision(imageBuffer: Buffer): Promise<ParsedReceipt> {
    if (!ImageAnnotatorClient) {
      throw new Error('Google Cloud Vision not available');
    }

    // Check configuration
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!projectId && !apiKey && !credentialsPath) {
      throw new Error('Google Cloud Vision not configured');
    }

    // Create client
    const clientConfig: any = {};
    if (projectId) clientConfig.projectId = projectId;
    if (apiKey && !apiKey.startsWith('.')) clientConfig.apiKey = apiKey;
    const client = new ImageAnnotatorClient(clientConfig);

    // Perform OCR
    const [result] = await client.textDetection({ image: { content: imageBuffer } });
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      throw new Error('No text detected by Google Vision');
    }

    const fullText = detections[0].description || '';
    const confidence = result.fullTextAnnotation?.pages?.[0]?.confidence || 0.8;

    return this.parseGoogleVisionText(fullText, confidence);
  }

  /**
   * GPT-4o Vision OCR processing
   */
  private async processWithGPTVision(imageBuffer: Buffer): Promise<ParsedReceipt> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const imageBase64 = imageBuffer.toString('base64');

    const prompt = `You are an expert Bulgarian receipt scanner. Extract ALL items from this receipt with absolute precision.

CRITICAL REQUIREMENTS:
1. Extract ONLY real product names (ignore prices, totals, store info, VAT codes)
2. Get exact prices and quantities for each item
3. Find the TOTAL amount at the bottom (usually after "ОБЩА СУМА" or "ВСИЧКО")
4. Identify the store name from the header

Return ONLY this JSON structure:
{
  "storeName": "Store name (e.g., Лидл, Билла, etc.)",
  "totalAmount": 123.45,
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": "Product name",
      "price": 4.60,
      "quantity": 1,
      "unitPrice": 4.60
    }
  ]
}

IGNORE:
- Currency symbols (лв, BGN)
- VAT codes (G, B, etc.)
- Price fragments
- Store addresses
- Receipt numbers
- Totals/subtotals as items

Be extremely careful to extract real products only!`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODELS.GPT4O,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
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
      max_tokens: 3000,
      temperature: 0.01,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No response from GPT-4o Vision');
    }

    return this.parseGPTResponse(content);
  }

  /**
   * Parse Google Vision text with Bulgarian-specific logic
   */
  private parseGoogleVisionText(text: string, confidence: number): ParsedReceipt {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Extract retailer
    let retailer = 'Неизвестен магазин';
    const retailerPatterns = [
      /ЛИДЛ|LIDL/i,
      /БИЛЛА|BILLA/i,
      /КАУФЛАНД|KAUFLAND/i,
      /ФАНТАСТИКО|FANTASTICO/i,
      /МЕТРО|METRO/i,
      /ОМВ|OMV/i,
    ];

    for (const line of lines.slice(0, 10)) {
      for (const pattern of retailerPatterns) {
        if (pattern.test(line)) {
          retailer = line;
          break;
        }
      }
      if (retailer !== 'Неизвестен магазин') break;
    }

    // Extract total amount
    let total = 0;
    const totalPatterns = [
      /(?:ОБЩА\s*СУМА|ОБЩО|TOTAL|ВСИЧКО|К\s*ПЛАЩАНЕ|ЗА\s*ПЛАЩАНЕ)\s*:?\s*(\d+[.,]\d{1,2})/i,
    ];

    for (const line of lines) {
      for (const pattern of totalPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(',', '.'));
          if (amount > total && amount < 10000) { // Sanity check
            total = amount;
          }
        }
      }
    }

    // Extract date
    let date = new Date().toISOString();
    const datePattern = /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/;

    for (const line of lines) {
      const match = line.match(datePattern);
      if (match) {
        try {
          const [, day, month, year] = match;
          const fullYear = year.length === 2 ? `20${year}` : year;
          const parsedDate = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString();
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    }

    // Extract items - much more robust parsing
    const items: ParsedReceiptItem[] = [];
    const excludePatterns = [
      /ЛИДЛ|БИЛЛА|КАУФЛАНД|ФАНТАСТИКО|КАСОВА|БЛАГОДАРИМ|VISIT|WWW/i,
      /ОБЩО|TOTAL|СУМА|ПЛАЩАНЕ|КАРТА|CASH|ПОЛУЧЕНИ|ВСИЧКО|ИТОГО/i,
      /ДАТА|DATE|ВРЕМЕ|TIME|КАСИЕР|НОМЕР|ЕИК|ЗДДС|УНП|АРТИКУЛА/i,
      /Намаление|гр\.|ул\.|ЕООД|^\d+[.,]\d{1,2}\s*[БлвBGN]*\s*$/i,
      /^[БлвBGN]+$/i, // Currency only
      /^\d+\s*[GB]\s*$/i, // VAT codes only
      /^[.,]\d+$/i, // Price fragments
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip excluded patterns
      if (excludePatterns.some(pattern => pattern.test(line))) continue;

      // Skip lines that are just numbers or currency
      if (/^\d+[.,]?\d*$/.test(line) || /^[БлвBGN\s]+$/.test(line)) continue;

      // Look for potential product names (lines with letters)
      if (/[а-яА-Я\w]{3,}/.test(line) && !/^\d/.test(line)) {

        // Check if next line has a price
        let price = 0;
        let quantity = 1;

        // Look for price in next few lines
        for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
          const nextLine = lines[j];

          // Match price patterns
          const priceMatch = nextLine.match(/(\d+[.,]\d{1,2})\s*[БлвBGN]*\s*[GB]?\s*$/i);
          if (priceMatch) {
            const potentialPrice = parseFloat(priceMatch[1].replace(',', '.'));

            // Sanity check - reasonable item price
            if (potentialPrice > 0 && potentialPrice <= (total || 1000)) {
              price = potentialPrice;

              // Check for quantity patterns in the product line
              const qtyMatch = line.match(/(\d+[.,]\d*)\s*[×x]\s*(\d+[.,]\d+)/i);
              if (qtyMatch) {
                quantity = parseFloat(qtyMatch[1].replace(',', '.'));
                const unitPrice = parseFloat(qtyMatch[2].replace(',', '.'));
                // Verify that quantity * unitPrice ≈ price
                if (Math.abs(quantity * unitPrice - price) < 0.1) {
                  price = unitPrice; // Store unit price
                }
              }

              break;
            }
          }
        }

        // If we found a valid price, add the item
        if (price > 0) {
          let productName = line.replace(/\d+[.,]\d*\s*[×x]\s*\d+[.,]\d+/i, '').trim();
          productName = productName.replace(/[#<>]/g, '').trim();

          if (productName.length >= 3 && !items.find(item => item.name === productName)) {
            items.push({
              name: productName,
              price: price * quantity, // Total price for this item
              quantity: quantity,
              unitPrice: price,
              confidence: 0.8
            });
          }
        }
      }
    }

    return {
      retailer,
      total,
      date,
      items,
      confidence: Math.round(confidence * 100)
    };
  }

  /**
   * Parse GPT-4o response
   */
  private parseGPTResponse(content: string): ParsedReceipt {
    try {
      // Clean up the response
      let cleanContent = content.replace(/```json\s*\n?/g, '').replace(/```\s*$/g, '').trim();

      const data = JSON.parse(cleanContent);

      return {
        retailer: data.storeName || 'GPT Анализиран',
        total: data.totalAmount || 0,
        date: data.date || new Date().toISOString().split('T')[0],
        items: (data.items || []).map((item: any) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.price,
          confidence: 0.9
        })),
        confidence: 85
      };
    } catch (error) {
      throw new Error(`Failed to parse GPT-4o response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reconcile results from both OCR systems
   */
  private reconcileResults(google: ParsedReceipt, gpt: ParsedReceipt): DualOCRResult {
    console.log(`🔄 Reconciling Google (${google.items.length} items, ${google.total} лв) vs GPT (${gpt.items.length} items, ${gpt.total} лв)`);

    // Choose the result with more reasonable parsing
    const googleItemsValid = google.items.filter(item =>
      item.name.length >= 3 &&
      item.price > 0 &&
      !['лв', 'ЛЕЗ'].includes(item.name)
    ).length;

    const gptItemsValid = gpt.items.filter(item =>
      item.name.length >= 3 &&
      item.price > 0 &&
      !['лв', 'ЛЕЗ'].includes(item.name)
    ).length;

    console.log(`📊 Valid items: Google=${googleItemsValid}, GPT=${gptItemsValid}`);

    // Use the one with more valid items, or better total if close
    let primaryResult = google;
    let secondaryResult = gpt;

    if (gptItemsValid > googleItemsValid * 1.5) {
      primaryResult = gpt;
      secondaryResult = google;
    }

    // Use the more reasonable total
    if (Math.abs(secondaryResult.total - primaryResult.total) < primaryResult.total * 0.1) {
      primaryResult.total = Math.max(primaryResult.total, secondaryResult.total);
    }

    // Filter out obviously wrong items
    const cleanItems = primaryResult.items.filter(item => {
      // Basic validation
      if (item.name.length < 3) return false;
      if (item.price <= 0) return false;

      // Remove obvious OCR artifacts
      if (['лв', 'ЛЕЗ', 'BGN', 'Fi'].includes(item.name)) return false;
      if (/^\d+[.,]\d+\s*[GB]\s*$/i.test(item.name)) return false;
      if (/^\d+[.,]\d+\s*Fi\s*$/i.test(item.name)) return false;

      // Remove obvious price fragments that became items
      if (/^\d+[.,]\d+$/.test(item.name)) return false;

      // Allow reasonable prices (don't filter by total since total extraction can be wrong)
      if (item.price > 1000) return false; // Sanity check for individual items

      return true;
    });

    const reconciliation = {
      discrepancies: Math.abs(google.items.length - gpt.items.length),
      needsManualReview: Math.abs(google.total - gpt.total) > 10,
      itemsAdded: 0,
      priceCorrections: 0
    };

    console.log(`✅ Reconciliation complete: ${cleanItems.length} clean items, ${primaryResult.total} лв`);

    return {
      success: true,
      receipt: {
        ...primaryResult,
        items: cleanItems,
        confidence: Math.round((google.confidence + gpt.confidence) / 2)
      },
      raw_text: `Google Vision + GPT-4o dual processing completed`,
      confidence: Math.round((google.confidence + gpt.confidence) / 2),
      processing: { googleVision: true, gptVision: true, reconciliation: true },
      reconciliation
    };
  }
}

// Export singleton instance
export const dualOCRProcessor = new DualOCRProcessor();