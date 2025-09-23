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

  constructor(context: ProcessingContext = { debugMode: false }) {
    this.context = context;
  }

  async parseReceipt(rawText: string, processingEngine: 'google_vision' | 'tabscanner' | 'mock'): Promise<ReceiptExtraction> {
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
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const items: ExtractedItem[] = [];

    // Skip header and footer lines
    const startIndex = this.findItemSectionStart(lines, storeFormat);
    const endIndex = this.findItemSectionEnd(lines, storeFormat);
    const itemLines = lines.slice(startIndex, endIndex);

    if (this.context.debugMode) {
      console.log(`📦 Processing ${itemLines.length} potential item lines (${startIndex}-${endIndex})`);
    }

    let i = 0;
    while (i < itemLines.length) {
      const line = itemLines[i];
      const lineNumber = startIndex + i;

      // Skip lines that are clearly not items
      if (this.shouldSkipLine(line)) {
        i++;
        continue;
      }

      const extractedItem = this.extractItemFromLine(line, lineNumber, itemLines, i, storeFormat);
      if (extractedItem) {
        items.push(extractedItem);

        // If this was a multi-line item, skip the next line to avoid double processing
        if (this.wasMultiLineItem(extractedItem, itemLines, i)) {
          i++; // Skip the next line since it was part of this item
        }
      }
      i++;
    }

    return this.postProcessItems(items);
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

        if (name.length >= 3 && price > 0) {
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

    // Only create item if we have both name and price
    if (name.length >= 3 && price > 0) {
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
      /^={2,}$/,
      /^-{2,}$/,
      /КАСОВА\s*БЕЛЕЖКА/i,
      /БЛАГОДАРИМ/i,
      /VISIT|WWW/i,
      /ДАТА|DATE|ВРЕМЕ|TIME/i,
      /КАСИЕР|№|НОМЕР|ЕИК|ЗДДС|УНП/i,
      /^ул\.|^гр\.|ЕООД|ООД/i,
      /^\s*\d{1,2}:\d{2}\s*$/,
      /^\s*\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\s*$/
    ];

    return skipPatterns.some(pattern => pattern.test(line)) || line.length < 3;
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

  private postProcessItems(items: ExtractedItem[]): ExtractedItem[] {
    // Remove duplicates based on normalized name and price
    const seen = new Set<string>();
    const uniqueItems = items.filter(item => {
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