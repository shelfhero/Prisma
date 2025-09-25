/**
 * Enhanced Bulgarian Receipt Parser
 * Combines Google Vision OCR with intelligent parsing, validation, and quality scoring
 */

import {
  ReceiptExtraction,
  ExtractedItem,
  QualityIssue,
  ItemQualityFlag,
  TotalValidationResult,
  ExtractionMetadata,
  OCRConfidenceScore,
  ProcessingContext
} from './types';
import { detectStoreFormat, parseNumberWithFormat, STORE_FORMATS } from './store-formats';
import { recognizeBulgarianProduct, categorizeBulgarianProduct, validateBulgarianProductPrice } from './bulgarian-products';

export class EnhancedReceiptParser {
  private context: ProcessingContext;

  constructor(context: ProcessingContext = { debugMode: true }) {
    this.context = context;
  }

  async parseReceipt(rawText: string, processingEngine: 'google_vision' | 'gpt_vision' | 'mock'): Promise<ReceiptExtraction> {
    const startTime = Date.now();

    if (this.context.debugMode) {
      console.log('🔍 Enhanced parser starting with text:', rawText.substring(0, 200) + '...');
    }

    // Detect store format
    const storeFormat = detectStoreFormat(rawText);
    this.context.storeFormat = storeFormat || undefined;

    // Parse basic information
    const retailer = this.extractRetailer(rawText, storeFormat);
    const date = this.extractDate(rawText, storeFormat);
    const items = this.extractItems(rawText, storeFormat);
    const total = this.extractTotal(rawText, storeFormat);

    // Validate and calculate quality metrics
    const totalValidation = this.validateTotal(items, total);
    const qualityIssues = this.analyzeQualityIssues(rawText, items, total, totalValidation);
    const confidence = this.calculateConfidence(rawText, items, total, totalValidation, storeFormat);

    // Generate suggestions
    const suggestions = this.generateSuggestions(qualityIssues, totalValidation);

    const metadata: ExtractionMetadata = {
      processingEngine,
      processingTime: Date.now() - startTime,
      detectedStore: storeFormat,
      language: this.detectLanguage(rawText),
      textQuality: this.assessTextQuality(rawText),
      layoutComplexity: this.assessLayoutComplexity(rawText),
      totalValidation
    };

    return {
      success: items.length > 0 || total > 0,
      confidence: confidence.overall,
      retailer,
      total,
      date,
      items,
      rawText,
      metadata,
      qualityIssues,
      suggestions
    };
  }

  private extractRetailer(text: string, storeFormat: any): string {
    if (storeFormat) {
      return storeFormat.name;
    }

    const lines = text.split('\n').slice(0, 10);
    const retailerPatterns = [
      /ЛИДЛ|LIDL/i,
      /ФАНТАСТИКО|FANTASTICO/i,
      /БИЛЛА|BILLA/i,
      /КАУФЛАНД|KAUFLAND/i,
      /Т[\s\-]*МАРКЕТ|T[\s\-]*MARKET/i,
      /МЕТРО|METRO/i,
      /ОМВ|OMV/i,
      /SHELL|ШЕЛ/i,
      /ПИКАДИЛИ|PICCADILLY/i
    ];

    for (const line of lines) {
      for (const pattern of retailerPatterns) {
        if (pattern.test(line)) {
          return line.trim();
        }
      }
    }

    return 'Неизвестен магазин';
  }

  private extractDate(text: string, storeFormat: any): string {
    const datePatterns = [
      /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/g,
      /(\d{2,4})[.\/-](\d{1,2})[.\/-](\d{1,2})/g,
      /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\s+(\d{1,2}):(\d{2})/g
    ];

    for (const pattern of datePatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        try {
          let day, month, year;

          if (match[3] && match[3].length === 4) {
            // DD.MM.YYYY format
            [, day, month, year] = match;
          } else if (match[1] && match[1].length === 4) {
            // YYYY.MM.DD format
            [, year, month, day] = match;
          } else {
            // DD.MM.YY format
            [, day, month, year] = match;
            year = year.length === 2 ? `20${year}` : year;
          }

          const parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);

          if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() >= 2020) {
            return parsedDate.toISOString();
          }
        } catch (e) {
          continue;
        }
      }
    }

    return new Date().toISOString();
  }

  private extractItems(text: string, storeFormat: any): ExtractedItem[] {
    // NEW SIMPLE APPROACH: Extract everything first, filter intelligently later
    const allPossibleItems = this.extractAllPossibleItems(text, storeFormat);

    if (this.context.debugMode) {
      console.log(`📦 Found ${allPossibleItems.length} potential items before filtering`);
    }

    // Use intelligent classification to filter out non-products
    const realProducts = this.classifyAndFilterProducts(allPossibleItems);

    if (this.context.debugMode) {
      console.log(`✅ After filtering: ${realProducts.length} real products`);
    }

    return this.postProcessItems(realProducts);
  }

  private extractAllPossibleItems(text: string, storeFormat: any): ExtractedItem[] {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const items: ExtractedItem[] = [];

    // Find the product section (between header and footer)
    const startIndex = Math.max(0, this.findItemSectionStart(lines, storeFormat));
    const endIndex = Math.min(lines.length, this.findItemSectionEnd(lines, storeFormat));
    const itemLines = lines.slice(startIndex, endIndex);

    // Try to extract multi-line items first (for Lidl format)
    let i = 0;
    while (i < itemLines.length) {
      // Skip obvious non-item lines (very minimal filtering)
      if (this.isObviouslyNotAnItem(itemLines[i])) {
        i++;
        continue;
      }

      // Try multi-line extraction
      const multiLineItem = this.tryExtractMultiLineItem(itemLines, i, startIndex, storeFormat);
      if (multiLineItem) {
        items.push(multiLineItem.item);
        i += multiLineItem.linesConsumed;
        continue;
      }

      // Try single line extraction with looser criteria
      const singleItem = this.tryExtractSingleItem(itemLines[i], itemLines, i, startIndex, storeFormat);
      if (singleItem) {
        items.push(singleItem);
      }

      i++;
    }

    return items;
  }

  private tryExtractSingleItem(line: string, allLines: string[], index: number, globalStart: number, storeFormat: any): ExtractedItem | null {
    // Look for product names that might have prices nearby
    const trimmed = line.trim();

    // Skip very short or empty lines
    if (trimmed.length < 2) return null;

    // Skip lines that are obviously prices or codes
    if (/^\d+[.,]\d{2}\s*[A-Z]?\s*$/.test(trimmed)) return null;
    if (/^\d+\s*[A-Z]?\s*$/.test(trimmed) && trimmed.length < 6) return null;

    // Try to find a price for this potential product name
    let price = 0;
    let quantity = 1;
    let priceSource = '';

    // Look in current line first
    const samePriceMatch = trimmed.match(/^(.+?)\s+(\d+[.,]\d{2})\s*(?:лв|BGN|[A-Z])?\s*$/);
    if (samePriceMatch) {
      const productName = samePriceMatch[1].trim();
      const priceStr = samePriceMatch[2];

      if (productName.length >= 3) {
        price = parseNumberWithFormat(priceStr, storeFormat?.numberFormat);
        priceSource = 'same_line';
      }
    }

    // Look in next lines for price if not found
    if (price === 0 && index < allLines.length - 2) {
      for (let j = 1; j <= 2; j++) {
        const nextLine = allLines[index + j]?.trim();
        if (!nextLine) continue;

        // Check for price patterns
        const priceMatch = nextLine.match(/^(\d+[.,]\d{2})\s*[A-Z]?\s*$/);
        if (priceMatch) {
          price = parseNumberWithFormat(priceMatch[1], storeFormat?.numberFormat);
          priceSource = `next_line_${j}`;
          break;
        }

        // Check for quantity x price patterns
        const qtyPriceMatch = nextLine.match(/^(\d+\.?\d*)\s*[x×]\s*(\d+[.,]\d{2})\s*$/i);
        if (qtyPriceMatch) {
          quantity = parseFloat(qtyPriceMatch[1]) || 1;
          const unitPrice = parseNumberWithFormat(qtyPriceMatch[2], storeFormat?.numberFormat);
          price = unitPrice;
          priceSource = `qty_price_line_${j}`;
          break;
        }
      }
    }

    // If we found a price and the name seems reasonable, create item
    if (price > 0 && trimmed.length >= 2) {
      return this.createExtractedItem(
        trimmed,
        `${line}${priceSource ? ` [${priceSource}]` : ''}`,
        price,
        quantity,
        globalStart + index
      );
    }

    return null;
  }

  private tryExtractMultiLineItem(lines: string[], startIndex: number, globalStartIndex: number, storeFormat: any): { item: ExtractedItem, linesConsumed: number } | null {
    // Try to match Lidl's multi-line format:
    // Line 1: Product name (e.g., "СЛАДОЛЕД МИНИ КЛАСИК")
    // Line 2: Quantity x unit price (e.g., "2.000 x 7.49")
    // Line 3: Total price with suffix (e.g., "14.98 G")

    if (startIndex + 2 >= lines.length) {
      return null;
    }

    const line1 = lines[startIndex].trim();
    const line2 = lines[startIndex + 1].trim();
    const line3 = lines[startIndex + 2].trim();

    // Line 1 should be a product name (no obvious price patterns)
    if (this.shouldSkipLine(line1) || /\d+[.,]\d{2}/.test(line1)) {
      return null;
    }

    // Line 2 should have quantity x unit price pattern
    const qtyPriceMatch = line2.match(/^(\d+\.?\d*)\s*[x×]\s*(\d+[.,]\d{2})\s*$/i);
    if (!qtyPriceMatch) {
      return null;
    }

    // Line 3 should have total price with letter suffix
    const totalPriceMatch = line3.match(/^(\d+[.,]\d{2})\s*[A-Z]?\s*$/);
    if (!totalPriceMatch) {
      return null;
    }

    const productName = line1;
    const quantity = parseFloat(qtyPriceMatch[1]) || 1;
    const unitPrice = parseNumberWithFormat(qtyPriceMatch[2], storeFormat?.numberFormat);
    const totalPrice = parseNumberWithFormat(totalPriceMatch[1], storeFormat?.numberFormat);

    // Validate that quantity * unit price ≈ total price (within 5% tolerance)
    const expectedTotal = quantity * unitPrice;
    const priceDiff = Math.abs(expectedTotal - totalPrice);
    const tolerance = expectedTotal * 0.05;

    if (priceDiff > tolerance && priceDiff > 0.02) {
      return null; // Price mismatch, not a valid multi-line item
    }

    // Validate that this is a real product name
    if (!this.isValidProductName(productName)) {
      return null;
    }

    const item = this.createExtractedItem(
      productName,
      `${line1}\n${line2}\n${line3}`,
      unitPrice,
      quantity,
      globalStartIndex + startIndex
    );

    return {
      item,
      linesConsumed: 3 // We consumed 3 lines
    };
  }

  private wasMultiLineItem(item: ExtractedItem, allLines: string[], currentIndex: number): boolean {
    // Check if the next line was used to complete this item
    if (currentIndex >= allLines.length - 1) {
      return false;
    }

    const nextLine = allLines[currentIndex + 1].trim();

    // If next line is just a price pattern, it was likely used for this item
    const isPriceOnlyLine = /^(\d+[,.]?\d{0,2})\s*(?:лв|BGN|Б|[A-Z])*\s*$/.test(nextLine);

    // If current line has no price in original text and next line is a price, it's multi-line
    const currentLineHasPrice = /\d+[,.]?\d{1,2}/.test(allLines[currentIndex]);

    return isPriceOnlyLine && !currentLineHasPrice;
  }

  private extractItemFromLine(
    line: string,
    lineNumber: number,
    allLines: string[],
    currentIndex: number,
    storeFormat: any
  ): ExtractedItem | null {

    // Try store-specific patterns first
    if (storeFormat && storeFormat.itemPatterns) {
      for (const pattern of storeFormat.itemPatterns) {
        const match = line.match(pattern.pattern);
        if (match) {
          // Handle multi-line patterns
          const item = this.createItemFromMatch(match, pattern, line, lineNumber, allLines, currentIndex, storeFormat);
          if (item) {
            return item;
          }
        }
      }
    }

    // Fallback to generic patterns
    const genericPatterns = [
      // Name followed by price with spaces
      { pattern: /^(.{3,50})\s{2,}(\d+[,]\d{1,2})\s*(?:лв|BGN|Б)?\s*$/i, nameGroup: 1, priceGroup: 2 },
      // Name followed by price on same line
      { pattern: /^(.{3,50})\s+(\d+[,]\d{1,2})\s*(?:лв|BGN|Б)?\s*$/i, nameGroup: 1, priceGroup: 2 },
      // Check if this line is a name and next line is price
      { pattern: /^(.{3,50})$/, nameGroup: 1, priceGroup: -1 }
    ];

    for (const genericPattern of genericPatterns) {
      const match = line.match(genericPattern.pattern);
      if (match) {
        let price = 0;
        let name = match[genericPattern.nameGroup]?.trim() || '';

        if (genericPattern.priceGroup > 0) {
          price = parseNumberWithFormat(match[genericPattern.priceGroup], storeFormat?.numberFormat || { decimalSeparator: ',', thousandsSeparator: ' ', currencySymbol: 'лв', currencyPosition: 'after' });
        } else if (currentIndex + 1 < allLines.length) {
          // Check next line for price
          const nextLine = allLines[currentIndex + 1];
          const priceMatch = nextLine.match(/^\s*(\d+[,.]?\d{1,2})\s*(?:лв|BGN|Б|[A-Z])?\s*$/i);
          if (priceMatch) {
            price = parseNumberWithFormat(priceMatch[1], storeFormat?.numberFormat);
          }
        }

        if (name.length >= 3 && price > 0 && this.isValidProductName(name)) {
          return this.createExtractedItem(name, line, price, 1, lineNumber);
        }
      }
    }

    return null;
  }

  private createItemFromMatch(
    match: RegExpMatchArray,
    pattern: any,
    originalText: string,
    lineNumber: number,
    allLines?: string[],
    currentIndex?: number,
    storeFormat?: any
  ): ExtractedItem | null {
    let name = match[pattern.nameGroup]?.trim() || '';
    let priceStr = match[pattern.priceGroup] || '';
    const quantityStr = match[pattern.quantityGroup] || '1';
    const barcode = match[pattern.barcodeGroup] || undefined;

    // Handle multi-line patterns where name or price is on a different line
    if (allLines && currentIndex !== undefined) {
      // If name group is 0, look for name on previous line
      if (pattern.nameGroup === 0 && currentIndex > 0) {
        const previousLine = allLines[currentIndex - 1].trim();
        // Check if previous line looks like a product name (not a price or barcode)
        if (previousLine.length >= 3 && !/^\d+[,.]\d{2}/.test(previousLine) && !/^\d{13}/.test(previousLine)) {
          name = previousLine;
        }
      }

      // If price group is 0 or -1, look for price on next line
      if ((pattern.priceGroup === 0 || pattern.priceGroup === -1) && currentIndex < allLines.length - 1) {
        const nextLine = allLines[currentIndex + 1].trim();
        const priceMatch = nextLine.match(/^(\d+[,.]\d{1,2})\s*(?:лв|BGN|Б|[A-Z])*\s*$/);
        if (priceMatch) {
          priceStr = priceMatch[1];
        }
      }
    }

    const price = parseNumberWithFormat(priceStr, storeFormat?.numberFormat || {
      decimalSeparator: ',',
      thousandsSeparator: ' ',
      currencySymbol: 'лв',
      currencyPosition: 'after'
    });
    const quantity = parseFloat(quantityStr.replace(',', '.')) || 1;

    // Only create item if we have both name and price AND it's a valid product
    if (name.length >= 3 && price > 0 && this.isValidProductName(name)) {
      return this.createExtractedItem(name, originalText, price, quantity, lineNumber, barcode);
    }

    return null;
  }

  private createExtractedItem(
    name: string,
    originalText: string,
    price: number,
    quantity: number,
    lineNumber: number,
    barcode?: string
  ): ExtractedItem {

    // Clean up name
    const cleanName = this.cleanProductName(name);

    // Recognize Bulgarian product
    const recognition = recognizeBulgarianProduct(cleanName);
    const category = recognition.product?.category || categorizeBulgarianProduct(cleanName);

    // Validate price
    const priceValidation = validateBulgarianProductPrice(cleanName, price);

    // Calculate confidence and quality flags
    const qualityFlags: ItemQualityFlag[] = [];
    let confidence = 0.8; // Base confidence

    // OCR confidence factors
    if (cleanName.length < 3) {
      qualityFlags.push({
        type: 'name_incomplete',
        confidence: 0.3,
        description: 'Името на продукта е твърде кратко'
      });
      confidence -= 0.3;
    }

    if (!priceValidation.valid) {
      qualityFlags.push({
        type: 'price_suspicious',
        confidence: priceValidation.confidence,
        description: priceValidation.explanation
      });
      confidence -= 0.2;
    }

    if (recognition.confidence > 0) {
      confidence += recognition.confidence * 0.2;
    }

    if (this.hasOCRErrors(originalText)) {
      qualityFlags.push({
        type: 'ocr_uncertain',
        confidence: 0.6,
        description: 'Възможни грешки при разпознаване на текста'
      });
      confidence -= 0.1;
    }

    return {
      name: cleanName,
      originalText,
      price,
      quantity,
      barcode,
      category,
      confidence: Math.max(0.1, Math.min(1.0, confidence)),
      qualityFlags,
      lineNumber,
      normalizedName: this.normalizeProductName(cleanName)
    };
  }

  private cleanProductName(name: string): string {
    return name
      .replace(/[#<>\"\']/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^\d+\s*[x×]\s*/i, '')
      .replace(/\s*\d+[,]\d{3}\s*кг.*$/i, '')
      .trim();
  }

  private normalizeProductName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\u0400-\u04FFa-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractTotal(text: string, storeFormat: any): number {
    // First try patterns that work on the full text (handles multi-line cases)
    const fullTextPatterns = [
      // Enhanced patterns for Bulgarian receipts - including ОБЩА СУМА
      /(?:ОБЩО|ОБЩА|TOTAL|СУМА|К\s*ПЛАЩАНЕ|ЗА\s*ПЛАЩАНЕ|ВСИЧКО|ИТОГО)\s*(?:СУМА)?\s*\n?\s*(\d+[,.]\d{1,2})/i,
      /(?:ОБЩО|ОБЩА|TOTAL)\s*(?:СУМА)?\s*\n?\s*(\d+[,.]\d{1,2})/i,
      /(?:ПОЛУЧЕНИ|SUMA)\s*(\d+[,.]\d{1,2})/i
    ];

    // Try full text patterns first (better for multi-line totals)
    for (const pattern of fullTextPatterns) {
      const match = text.match(pattern);
      if (match) {
        const total = parseNumberWithFormat(match[1], storeFormat?.numberFormat);
        if (total > 0) {
          if (this.context.debugMode) {
            console.log(`✅ Found total using full-text pattern: ${total} лв from "${match[0]}"`);
          }
          return total;
        }
      }
    }

    // Fallback to line-by-line patterns
    const linePatterns = storeFormat?.totalPatterns || [
      /(?:ОБЩО|ОБЩА|TOTAL|СУМА|К\s*ПЛАЩАНЕ|ЗА\s*ПЛАЩАНЕ|ВСИЧКО|ИТОГО)\s*(?:СУМА)?\s*(\d+[,.]\d{1,2})/i,
      /(?:ПОЛУЧЕНИ|SUMA)\s*(\d+[,.]\d{1,2})/i
    ];

    const lines = text.split('\n');

    for (const pattern of linePatterns) {
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(pattern);
        if (match) {
          const total = parseNumberWithFormat(match[1], storeFormat?.numberFormat);
          if (total > 0) {
            if (this.context.debugMode) {
              console.log(`✅ Found total using line pattern: ${total} лв from line "${lines[i]}"`);
            }
            return total;
          }
        }
      }
    }

    // Special case: Look for "ОБЩА СУМА" followed by a number on the next line
    for (let i = 0; i < lines.length - 1; i++) {
      if (/(?:ОБЩО|ОБЩА)\s*СУМА/i.test(lines[i])) {
        const nextLine = lines[i + 1].trim();
        const numberMatch = nextLine.match(/^(\d+[,.]\d{1,2})/);
        if (numberMatch) {
          const total = parseNumberWithFormat(numberMatch[1], storeFormat?.numberFormat);
          if (total > 0) {
            if (this.context.debugMode) {
              console.log(`✅ Found total on next line after "${lines[i]}": ${total} лв from "${nextLine}"`);
            }
            return total;
          }
        }
      }
    }

    // Fallback: find largest price that could be total
    const pricePattern = /(\d+[,.]\d{1,2})\s*(?:лв|BGN)?\s*$/i;
    const prices: number[] = [];

    for (const line of lines) {
      const match = line.match(pricePattern);
      if (match) {
        const price = parseNumberWithFormat(match[1], storeFormat?.numberFormat);
        if (price > 0) {
          prices.push(price);
        }
      }
    }

    return prices.length > 0 ? Math.max(...prices) : 0;
  }

  private validateTotal(items: ExtractedItem[], ocrTotal: number): TotalValidationResult {
    const calculatedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const difference = Math.abs(calculatedTotal - ocrTotal);
    const percentageDiff = ocrTotal > 0 ? (difference / ocrTotal) * 100 : 0;

    const valid = percentageDiff <= 5; // Allow 5% difference

    let explanation = '';
    if (valid) {
      explanation = 'Общата сума се валидира правилно';
    } else if (percentageDiff <= 15) {
      explanation = 'Малка разлика в общата сума - възможни грешки при OCR';
    } else {
      explanation = 'Значителна разлика в общата сума - необходима проверка';
    }

    return {
      calculatedTotal: Math.round(calculatedTotal * 100) / 100,
      ocrTotal,
      difference: Math.round(difference * 100) / 100,
      percentageDiff: Math.round(percentageDiff * 100) / 100,
      valid,
      explanation
    };
  }

  private calculateConfidence(
    rawText: string,
    items: ExtractedItem[],
    total: number,
    validation: TotalValidationResult,
    storeFormat: any
  ): OCRConfidenceScore {

    let textScore = 0.7; // Base score
    let structureScore = 0.5;
    let validationScore = 0.5;

    // Text quality assessment
    const bulgarianChars = (rawText.match(/[\u0400-\u04FF]/g) || []).length;
    const totalChars = rawText.length;
    if (bulgarianChars / totalChars > 0.3) textScore += 0.2;

    // Structure assessment
    if (storeFormat) structureScore += 0.3;
    if (items.length > 0) structureScore += 0.2;
    if (total > 0) structureScore += 0.2;

    // Validation assessment
    if (validation.valid) validationScore += 0.4;
    if (validation.percentageDiff < 10) validationScore += 0.2;

    const overall = (textScore * 0.3) + (structureScore * 0.4) + (validationScore * 0.3);

    return {
      overall: Math.round(overall * 100) / 100,
      text: Math.round(textScore * 100) / 100,
      structure: Math.round(structureScore * 100) / 100,
      validation: Math.round(validationScore * 100) / 100,
      factors: [
        { name: 'Качество на текста', weight: 0.3, score: textScore, description: 'OCR точност и четимост' },
        { name: 'Структура на касовата бележка', weight: 0.4, score: structureScore, description: 'Разпознаване на формат и елементи' },
        { name: 'Валидация на данните', weight: 0.3, score: validationScore, description: 'Съответствие между суми и продукти' }
      ]
    };
  }

  private analyzeQualityIssues(
    rawText: string,
    items: ExtractedItem[],
    total: number,
    validation: TotalValidationResult
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check for missing total
    if (total === 0) {
      issues.push({
        type: 'missing_total',
        severity: 'high',
        description: 'Не е намерена обща сума в касовата бележка',
        suggestedAction: 'Проверете ръчно общата сума'
      });
    }

    // Check total validation
    if (!validation.valid) {
      issues.push({
        type: 'price_inconsistency',
        severity: validation.percentageDiff > 20 ? 'critical' : 'medium',
        description: `Разлика между изчислената (${validation.calculatedTotal} лв) и OCR сумата (${validation.ocrTotal} лв)`,
        suggestedAction: 'Проверете цените на продуктите'
      });
    }

    // Check for items with low confidence
    const lowConfidenceItems = items.filter(item => item.confidence < 0.6);
    if (lowConfidenceItems.length > 0) {
      issues.push({
        type: 'item_mismatch',
        severity: 'medium',
        description: `${lowConfidenceItems.length} продукта с ниска увереност при разпознаване`,
        affectedItems: lowConfidenceItems.map(item => item.lineNumber),
        suggestedAction: 'Проверете и поправете неясните продукти'
      });
    }

    // Check text quality
    if (this.assessTextQuality(rawText) === 'low') {
      issues.push({
        type: 'unclear_text',
        severity: 'medium',
        description: 'Ниско качество на разпознатия текст',
        suggestedAction: 'Опитайте с по-качествено изображение'
      });
    }

    return issues;
  }

  private generateSuggestions(issues: QualityIssue[], validation: TotalValidationResult): string[] {
    const suggestions: string[] = [];

    if (issues.some(i => i.type === 'unclear_text')) {
      suggestions.push('💡 За по-добри резултати използвайте ясни снимки при добро осветление');
    }

    if (issues.some(i => i.type === 'price_inconsistency')) {
      suggestions.push('⚠️ Проверете дали всички цени са правилно разпознати');
    }

    if (issues.some(i => i.type === 'item_mismatch')) {
      suggestions.push('📝 Прегледайте продуктите с ниска увереност и ги коригирайте при нужда');
    }

    if (validation.valid && issues.length === 0) {
      suggestions.push('✅ Касовата бележка е обработена успешно');
    }

    return suggestions;
  }

  // Helper methods
  private shouldSkipLine(line: string): boolean {
    const skipPatterns = [
      // Separators and formatting
      /^={2,}$/,
      /^-{2,}$/,
      /^\s*\*{2,}\s*$/,
      /^\s*#{2,}\s*$/,

      // Header/footer content
      /КАСОВА\s*БЕЛЕЖКА/i,
      /БЛАГОДАРИМ/i,
      /VISIT|WWW/i,
      /ДАТА|DATE|ВРЕМЕ|TIME/i,
      /КАСИЕР|№|НОМЕР|ЕИК|ЗДДС|УНП/i,
      /^ул\.|^гр\.|ЕООД|ООД/i,
      /^\s*\d{1,2}:\d{2}\s*$/,
      /^\s*\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\s*$/,

      // Payment and total related lines - ENHANCED
      /МЕЖДИННА\s*СУМА/i,
      /ОБЩА\s*СУМА/i,
      /TOTAL|СУМА/i,
      /КРЕДИТНА?\s*КАРТА/i,
      /ДЕБИТНА?\s*КАРТА/i,
      /КАРТА|CARD/i,
      /ПЛАЩАНЕ|PAYMENT/i,
      /КРЕДИТ\s*\/?\s*ДЕБИТ/i,
      /ДЕБИТ\s*\/?\s*КРЕДИТ/i,
      /КРЕДИТ\s*ПЛАЩАНЕ/i,
      /ДЕБИТ\s*ПЛАЩАНЕ/i,
      /БАНКА|BANK/i,
      /ЕВРО|EURO/i,
      /КУРС|RATE|EXCHANGE/i,
      /ОБМЕНЕН/i,
      /CHANGE|РЕСТО/i,
      /ПОЛУЧЕНО|RECEIVED/i,
      /ДЪЛЖИМО|DUE/i,
      /ЧЕКА|CHECK/i,
      /ПАРИЧНИ\s*СРЕДСТВА/i,
      /НАЛИЧНОСТ|CASH/i,
      /БАНКНОТА|БАНКНОТИ/i,

      // Store/receipt identifiers
      /TID:|VAT:|TAX/i,
      /RECEIPT|БОН/i,
      /ОТЧЕТ|REPORT/i,
      /ТРАНЗАКЦИЯ|TRANSACTION/i,
      /TERMINAL|ТЕРМИНАЛ/i,
      /POS/i,
      /REF\s*NO|REFERENCE/i,

      // Operator/system info
      /ОПЕРАТОР|OPERATOR/i,
      /КАСА|КАСИЕР/i,
      /СИСТЕМА|SYSTEM/i,

      // Empty or very short lines
      /^\s*[A-Z]\s*$/,  // Single letters like "B", "G", etc.
      /^\s*\d{1,3}\s*$/,  // Just numbers without context
      /^\s*[A-Z]{1,2}\s*\d{0,3}\s*$/,  // Letter combinations with numbers

      // Lines that are just codes or reference numbers
      /^\s*\d{4,}\s*$/,  // Long numbers (receipt numbers)
      /^\s*[A-Z0-9]{5,}\s*$/,  // Code patterns

      // Date/time patterns
      /\d{2}\/\d{2}\/\d{2,4}/,
      /\d{2}\.\d{2}\.\d{2,4}/,
      /\d{2}-\d{2}-\d{2,4}/,

      // Lines with just prices (no product names)
      /^\s*\d+[.,]\d{2}\s*(?:лв|BGN)?\s*$/,

      // Store address/contact info
      /тел\.|phone|факс|fax/i,
      /email|mail|www\./i,
      /софия|варна|пловдив|бургас/i,  // Major Bulgarian cities in addresses

      // Additional payment method patterns
      /CONTACTLESS|БЕЗКОНТАКТНО/i,
      /CHIP\s*&\s*PIN/i,
      /МАГНИТНА\s*ЛЕНТА/i,
      /EMV/i,
      /VISA|MASTERCARD|MAESTRO/i,
      /APPROVED|ОДОБРЕНО/i,
      /DECLINED|ОТХВЪРЛЕНО/i,

      // Receipt completion indicators
      /КРАЙ\s*НА\s*КАСОВ/i,
      /END\s*OF\s*RECEIPT/i,
      /ЗАПАЗЕТЕ\s*БЕЛЕЖКАТА/i,
      /KEEP\s*RECEIPT/i
    ];

    // Check if line is too short to be a meaningful product
    if (line.length < 3) {
      return true;
    }

    // Check if line matches any skip pattern
    if (skipPatterns.some(pattern => pattern.test(line))) {
      return true;
    }

    // Additional logic: Skip lines that are mostly numbers/codes
    const cleanLine = line.trim();
    if (/^\d+[A-Z]*\d*$/.test(cleanLine) && cleanLine.length < 8) {
      return true;
    }

    // Skip lines that are just currency amounts without product context
    if (/^\s*\d+[.,]\d{2}\s*[A-Z]?\s*$/.test(cleanLine)) {
      return true;
    }

    return false;
  }

  private findItemSectionStart(lines: string[], storeFormat: any): number {
    if (storeFormat?.layout?.itemSectionStart) {
      for (let i = 0; i < lines.length; i++) {
        for (const startMarker of storeFormat.layout.itemSectionStart) {
          if (lines[i].includes(startMarker)) {
            return i + 1;
          }
        }
      }
    }
    return Math.min(storeFormat?.layout?.headerLines || 5, lines.length - 1);
  }

  private findItemSectionEnd(lines: string[], storeFormat: any): number {
    if (storeFormat?.layout?.itemSectionEnd) {
      for (let i = lines.length - 1; i >= 0; i--) {
        for (const endMarker of storeFormat.layout.itemSectionEnd) {
          if (lines[i].includes(endMarker)) {
            return i;
          }
        }
      }
    }
    return lines.length - (storeFormat?.layout?.footerLines || 3);
  }

  private detectLanguage(text: string): 'bg' | 'en' | 'mixed' {
    const bulgarianChars = (text.match(/[\u0400-\u04FF]/g) || []).length;
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
    const total = bulgarianChars + latinChars;

    if (total === 0) return 'en';
    if (bulgarianChars / total > 0.7) return 'bg';
    if (latinChars / total > 0.7) return 'en';
    return 'mixed';
  }

  private assessTextQuality(text: string): 'high' | 'medium' | 'low' {
    const totalChars = text.length;
    const specialChars = (text.match(/[^a-zA-Z\u0400-\u04FF0-9\s.,;:()\-]/g) || []).length;
    const ratio = specialChars / totalChars;

    if (ratio < 0.05) return 'high';
    if (ratio < 0.15) return 'medium';
    return 'low';
  }

  private assessLayoutComplexity(text: string): 'simple' | 'medium' | 'complex' {
    const lines = text.split('\n');
    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    const variability = this.calculateLineVariability(lines);

    if (variability < 0.3 && avgLineLength < 50) return 'simple';
    if (variability < 0.6 && avgLineLength < 80) return 'medium';
    return 'complex';
  }

  private calculateLineVariability(lines: string[]): number {
    const lengths = lines.map(line => line.length);
    const avg = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;
    return Math.sqrt(variance) / avg;
  }

  private hasOCRErrors(text: string): boolean {
    const errorIndicators = [
      /[Il1][0O][Il1]/g,  // Common OCR confusions
      /[0O]{2,}/g,        // Multiple O/0 in sequence
      /[Il1]{2,}/g,       // Multiple I/l/1 in sequence
      /[^a-zA-Z\u0400-\u04FF0-9\s.,;:()\-]/g  // Unusual characters
    ];

    return errorIndicators.some(pattern => pattern.test(text));
  }

  private isObviouslyNotAnItem(line: string): boolean {
    const trimmed = line.trim().toLowerCase();

    // Only skip the most obvious non-items
    if (trimmed.length === 0) return true;

    // Skip separators
    if (/^[=\-*#]{3,}$/.test(trimmed)) return true;

    // Skip timestamps
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) return true;

    // Skip dates
    if (/^\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4}$/.test(trimmed)) return true;

    return false;
  }

  private classifyAndFilterProducts(items: ExtractedItem[]): ExtractedItem[] {
    // Simple but effective classification
    return items.filter(item => this.isLikelyProduct(item));
  }

  private isLikelyProduct(item: ExtractedItem): boolean {
    const name = item.name.toLowerCase().trim();

    // Explicit non-products (exact matches)
    const nonProducts = [
      'обща сума лев',
      'обща сума в евро',
      'междинна сума',
      'кредитна/дебитна карта',
      'total',
      'subtotal',
      'сума',
      'банка дск',
      'банка',
      'получено',
      'ресто',
      'change',
      'курс',
      'rate'
    ];

    for (const nonProduct of nonProducts) {
      if (name === nonProduct || name.includes(nonProduct)) {
        return false;
      }
    }

    // Price-only lines (like "14.98 G")
    if (/^\d+[.,]\d{2}\s*[a-z]?\s*$/i.test(name)) {
      return false;
    }

    // Single letters or very short codes
    if (/^[a-z]{1,2}\d*$/i.test(name) && name.length < 4) {
      return false;
    }

    // Pure numbers
    if (/^\d+$/.test(name)) {
      return false;
    }

    // Must have a reasonable price
    if (item.price <= 0 || item.price > 1000) {
      return false;
    }

    // Must have reasonable name length
    if (name.length < 2) {
      return false;
    }

    // Everything else is likely a product
    return true;
  }

  private isValidProductName(name: string): boolean {
    const cleanName = name.trim().toLowerCase();

    // Skip if too short
    if (cleanName.length < 2) {
      return false;
    }

    // Skip obvious non-product patterns (more specific now)
    const nonProductPatterns = [
      // Payment methods and financial terms - more specific
      /кредитна?\s*\/?\s*дебитна?\s*карта/i,
      /payment|кредит\s*\/?\s*дебит\s*плащане/i,
      /^(visa|mastercard|maestro)$/i,
      /^(contactless|безконтактно)$/i,
      /^(cash|наличност)$/i,

      // Totals and sums - exact matches
      /^(общо|обща)\s*сума/i,
      /^(междинна)\s*сума/i,
      /^(total|сума)$/i,
      /^subtotal$/i,

      // Store operations - exact matches
      /^(касиер|каса|operator|оператор)$/i,
      /^(receipt|бон|касова\s*бележка)$/i,
      /^(транзакция|transaction)$/i,

      // System codes and IDs - exact patterns
      /^[a-z]{1,2}\d+$/i,  // Short codes like "a12", "bc34"
      /^\d+[a-z]?$/i,      // Numbers with optional letter suffix, but not product codes

      // Time and date related
      /^(време|time|дата|date)$/i,
      /^\d{1,2}:\d{2}$/,   // Time format
      /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/,  // Date format

      // Administrative - exact matches
      /^(данък|tax|зддс|vat)$/i,
      /^(благодарим|thanks|спасибо)$/i,
      /^(довиждане|goodbye)$/i,

      // Pure numbers or currency amounts
      /^\d+$/,             // Just numbers
      /^\d+[.,]\d{2}\s*(?:лв|bgn|б)?$/i, // Pure price lines

      // Very short meaningless text
      /^[a-zа-я]{1}$/i,    // Single letters only
    ];

    // Check against non-product patterns
    if (nonProductPatterns.some(pattern => pattern.test(cleanName))) {
      return false;
    }

    // Must contain at least one letter (not just numbers and symbols)
    if (!/[a-zа-я]/i.test(cleanName)) {
      return false;
    }

    // Allow products with numbers (like "KINDER COUNTRY", "BL. ANGUS", etc.)
    // Only reject if it's ALL numbers or mostly numbers with no meaningful text
    const digitCount = (cleanName.match(/\d/g) || []).length;
    const letterCount = (cleanName.match(/[a-zа-я]/gi) || []).length;

    // Only reject if it's more than 80% digits AND has less than 3 letters
    if (digitCount > 0 && letterCount < 3 && digitCount > letterCount * 4) {
      return false;
    }

    return true;
  }

  private postProcessItems(items: ExtractedItem[]): ExtractedItem[] {
    // Additional filtering: remove items that slipped through initial validation
    const validItems = items.filter(item => {
      // Double-check with more strict validation
      if (!this.isValidProductName(item.name)) {
        return false;
      }

      // Remove items with suspicious prices (too low or too high for typical products)
      if (item.price < 0.01 || item.price > 10000) {
        return false;
      }

      // Remove items where name is just repeating characters
      const normalized = item.normalizedName;
      if (/^(.)\1+$/.test(normalized) || normalized.length < 2) {
        return false;
      }

      return true;
    });

    // Remove duplicates based on normalized name and price
    const seen = new Set<string>();
    const uniqueItems = validItems.filter(item => {
      const key = `${item.normalizedName}_${item.price}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    // Sort by confidence (highest first)
    return uniqueItems.sort((a, b) => b.confidence - a.confidence);
  }
}