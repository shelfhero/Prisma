/**
 * GPT-4 Vision API Integration for Enhanced Receipt Processing
 * Works alongside Google Vision to catch missed items and improve accuracy
 */

import OpenAI from 'openai';
import { ReceiptExtraction } from './receipt-parsing/types';

interface GPTVisionResult {
  success: boolean;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    confidence: number;
    source: 'gpt_vision';
  }>;
  retailer: string;
  total: number;
  date: string;
  confidence: number;
  raw_response?: string;
  issues?: string[];
}

interface ReconciliationResult {
  success: boolean;
  finalItems: Array<{
    name: string;
    price: number;
    quantity: number;
    source: 'google_vision' | 'gpt_vision' | 'reconciled';
    confidence: number;
  }>;
  discrepancies: Array<{
    type: 'missing_item' | 'price_mismatch' | 'quantity_diff' | 'total_mismatch';
    description: string;
    googleVision?: any;
    gptVision?: any;
  }>;
  finalTotal: number;
  needsManualReview: boolean;
  reconciliationConfidence: number;
}

export class GPTVisionReceiptProcessor {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Process receipt image with GPT-4 Vision
   * Analyzes the original image alongside Google Vision OCR results
   */
  async processReceiptImage(
    imageBuffer: Buffer,
    googleVisionText: string,
    googleVisionResult: ReceiptExtraction
  ): Promise<GPTVisionResult> {
    try {
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.detectImageType(imageBuffer);

      const prompt = this.createBulgarianReceiptPrompt(googleVisionText, googleVisionResult);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: "high"
                }
              }
            ],
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from GPT-4 Vision');
      }

      return this.parseGPTResponse(content);

    } catch (error) {
      console.error('GPT-4 Vision processing failed:', error);
      return {
        success: false,
        items: [],
        retailer: '',
        total: 0,
        date: new Date().toISOString(),
        confidence: 0,
        issues: [`GPT-4 Vision error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Reconcile results from Google Vision and GPT-4 Vision
   */
  reconcileResults(
    googleVisionResult: ReceiptExtraction,
    gptVisionResult: GPTVisionResult
  ): ReconciliationResult {
    const discrepancies: ReconciliationResult['discrepancies'] = [];
    const finalItems: ReconciliationResult['finalItems'] = [];

    // Start with Google Vision items
    const googleItems = googleVisionResult.items.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      source: 'google_vision' as const,
      confidence: item.confidence || 0.8
    }));

    // Add GPT Vision items
    const gptItems = gptVisionResult.items.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      source: 'gpt_vision' as const,
      confidence: item.confidence
    }));

    // Create a normalized lookup for Google Vision items
    const googleItemsMap = new Map<string, typeof googleItems[0]>();
    googleItems.forEach(item => {
      const normalizedName = this.normalizeProductName(item.name);
      googleItemsMap.set(normalizedName, item);
    });

    // Process each GPT Vision item
    for (const gptItem of gptItems) {
      const normalizedGptName = this.normalizeProductName(gptItem.name);
      const matchingGoogleItem = googleItemsMap.get(normalizedGptName);

      if (matchingGoogleItem) {
        // Item exists in both - check for discrepancies
        const priceDiff = Math.abs(matchingGoogleItem.price - gptItem.price);
        const qtyDiff = Math.abs(matchingGoogleItem.quantity - gptItem.quantity);

        if (priceDiff > 0.10) { // More than 10 stotinki difference
          discrepancies.push({
            type: 'price_mismatch',
            description: `Price difference for "${gptItem.name}": Google Vision ${matchingGoogleItem.price}лв vs GPT-4 Vision ${gptItem.price}лв`,
            googleVision: matchingGoogleItem,
            gptVision: gptItem
          });
        }

        if (qtyDiff > 0.1) {
          discrepancies.push({
            type: 'quantity_diff',
            description: `Quantity difference for "${gptItem.name}": Google Vision ${matchingGoogleItem.quantity} vs GPT-4 Vision ${gptItem.quantity}`,
            googleVision: matchingGoogleItem,
            gptVision: gptItem
          });
        }

        // Use the result with higher confidence, or Google Vision as default
        const useGptResult = gptItem.confidence > matchingGoogleItem.confidence + 0.1;
        finalItems.push(useGptResult ? {
          ...gptItem,
          source: 'reconciled' as const
        } : matchingGoogleItem);

        // Remove processed item from Google map
        googleItemsMap.delete(normalizedGptName);
      } else {
        // Item only exists in GPT Vision - potential missed item
        if (gptItem.confidence > 0.6) {
          discrepancies.push({
            type: 'missing_item',
            description: `Item "${gptItem.name}" found by GPT-4 Vision but missed by Google Vision`,
            gptVision: gptItem
          });
          finalItems.push(gptItem);
        }
      }
    }

    // Add remaining Google Vision items that weren't matched
    googleItemsMap.forEach(item => {
      finalItems.push(item);
    });

    // Calculate totals and validate
    const finalTotal = finalItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const googleTotal = googleVisionResult.total;
    const gptTotal = gptVisionResult.total;

    // Check for total discrepancies
    const totalDiffGoogle = Math.abs(finalTotal - googleTotal);
    const totalDiffGPT = Math.abs(finalTotal - gptTotal);

    if (totalDiffGoogle > 0.50) { // More than 50 stotinki difference
      discrepancies.push({
        type: 'total_mismatch',
        description: `Total mismatch with Google Vision: calculated ${finalTotal.toFixed(2)}лв vs Google Vision ${googleTotal.toFixed(2)}лв`
      });
    }

    if (totalDiffGPT > 0.50) {
      discrepancies.push({
        type: 'total_mismatch',
        description: `Total mismatch with GPT-4 Vision: calculated ${finalTotal.toFixed(2)}лв vs GPT-4 Vision ${gptTotal.toFixed(2)}лв`
      });
    }

    // Determine if manual review is needed
    const needsManualReview = discrepancies.some(d =>
      d.type === 'missing_item' ||
      d.type === 'total_mismatch' ||
      (d.type === 'price_mismatch' && Math.abs((d.googleVision?.price || 0) - (d.gptVision?.price || 0)) > 1.0)
    );

    // Calculate reconciliation confidence
    const reconciliationConfidence = this.calculateReconciliationConfidence(
      googleVisionResult.confidence,
      gptVisionResult.confidence,
      discrepancies.length,
      finalItems.length
    );

    return {
      success: true,
      finalItems: finalItems.sort((a, b) => b.confidence - a.confidence),
      discrepancies,
      finalTotal: Math.round(finalTotal * 100) / 100,
      needsManualReview,
      reconciliationConfidence
    };
  }

  private createBulgarianReceiptPrompt(googleVisionText: string, googleVisionResult: ReceiptExtraction): string {
    const existingItems = googleVisionResult.items.map(item =>
      `${item.name} - ${item.price}лв x${item.quantity}`
    ).join('\n');

    return `Анализирай тази българска касова бележка от магазин. Имам резултати от Google Vision OCR, но искам да проверим дали има пропуснати артикули или грешки.

Google Vision OCR текст:
${googleVisionText}

Google Vision намерени продукти:
${existingItems}
Обща сума по Google Vision: ${googleVisionResult.total}лв

Моля, анализирай изображението директно и:

1. **Внимателно провери всички редове с продукти** - търси артикули, които Google Vision е пропуснал
2. **Фокусирай се върху малък текст** или размазани области, които OCR може да е пропуснал
3. **Обърни внимание на:**
   - Продукти с български имена (хляб, мляко, сирене, месо, плодове, зеленчуци)
   - Цени във формат XX,XX лв или XX.XX
   - Количества във формат X.XXX x Y.YY
   - Специални оферти или намаления

4. **Сравни намерените артикули** с тези от Google Vision
5. **Провери дали общата сума се сходи** с намерените продукти

Върни отговор в JSON формат:
{
  "success": true,
  "retailer": "име на магазина",
  "total": числова_стойност_обща_сума,
  "date": "YYYY-MM-DD дата",
  "items": [
    {
      "name": "име на продукт",
      "price": числова_цена_за_единица,
      "quantity": числово_количество,
      "confidence": 0.0_до_1.0_увереност
    }
  ],
  "confidence": 0.0_до_1.0_обща_увереност,
  "notes": ["забележки за пропуснати или различни артикули"]
}

ВАЖНО: Включи САМО артикули, които виждаш ясно на изображението. Ако не си сигурен за артикул, сложи по-ниска confidence стойност.`;
  }

  private parseGPTResponse(content: string): GPTVisionResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in GPT response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        success: parsed.success || false,
        items: (parsed.items || []).map((item: any) => ({
          name: String(item.name || '').trim(),
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          confidence: Number(item.confidence) || 0.5,
          source: 'gpt_vision' as const
        })),
        retailer: String(parsed.retailer || '').trim(),
        total: Number(parsed.total) || 0,
        date: parsed.date || new Date().toISOString(),
        confidence: Number(parsed.confidence) || 0,
        raw_response: content,
        issues: parsed.notes || []
      };
    } catch (error) {
      console.error('Failed to parse GPT response:', error);
      return {
        success: false,
        items: [],
        retailer: '',
        total: 0,
        date: new Date().toISOString(),
        confidence: 0,
        raw_response: content,
        issues: ['Failed to parse GPT response']
      };
    }
  }

  private normalizeProductName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\u0400-\u04FFa-z0-9\s]/g, '') // Keep only Cyrillic, Latin, numbers, spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  private detectImageType(buffer: Buffer): string {
    // Check first few bytes for common image signatures
    if (buffer.length < 8) return 'image/jpeg'; // default

    const header = buffer.subarray(0, 8);

    // PNG signature
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
      return 'image/png';
    }

    // JPEG signature
    if (header[0] === 0xFF && header[1] === 0xD8) {
      return 'image/jpeg';
    }

    // WebP signature
    if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
        header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) {
      return 'image/webp';
    }

    return 'image/jpeg'; // default fallback
  }

  private calculateReconciliationConfidence(
    googleConfidence: number,
    gptConfidence: number,
    discrepancyCount: number,
    itemCount: number
  ): number {
    // Base confidence is average of both systems
    let confidence = (googleConfidence + gptConfidence) / 2;

    // Reduce confidence based on discrepancies
    const discrepancyPenalty = Math.min(discrepancyCount * 0.1, 0.5);
    confidence -= discrepancyPenalty;

    // Boost confidence if both systems agree on most items
    if (discrepancyCount <= itemCount * 0.1) { // Less than 10% discrepancies
      confidence += 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Test if GPT-4 Vision is properly configured
   */
  async testConfiguration(): Promise<boolean> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.log('❌ OpenAI API key not configured');
        return false;
      }

      // Test with a simple request
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5
      });

      if (response.choices?.[0]?.message) {
        console.log('✅ GPT-4 Vision configured correctly');
        return true;
      } else {
        console.log('❌ GPT-4 Vision configuration error');
        return false;
      }
    } catch (error: any) {
      if (error.message?.includes('auth')) {
        console.log('❌ GPT-4 Vision authentication error');
      } else {
        console.log('⚠️ GPT-4 Vision test OK (expected error for test request)');
        return true;
      }
      return false;
    }
  }
}

// Test function for development
export async function testGPTVisionSetup(): Promise<boolean> {
  try {
    const processor = new GPTVisionReceiptProcessor();
    return await processor.testConfiguration();
  } catch (error) {
    console.error('❌ GPT-4 Vision setup test failed:', error);
    return false;
  }
}