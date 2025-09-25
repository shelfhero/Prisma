/**
 * Enhanced Bulgarian Receipt Parsing Module
 * Exports all parsing components and utilities
 */

// Core parser
export { EnhancedReceiptParser } from './enhanced-parser';

// Type definitions
export type {
  ReceiptExtraction,
  ExtractedItem,
  QualityIssue,
  ItemQualityFlag,
  TotalValidationResult,
  ExtractionMetadata,
  StoreFormat,
  BulgarianProduct,
  OCRConfidenceScore,
  ProcessingContext
} from './types';

// Import for internal use
import { EnhancedReceiptParser } from './enhanced-parser';
import type { ReceiptExtraction } from './types';

// Store format utilities
export {
  STORE_FORMATS,
  detectStoreFormat,
  getStoreSpecificPatterns,
  parseNumberWithFormat
} from './store-formats';

// Bulgarian product recognition
export {
  BULGARIAN_PRODUCTS,
  PRODUCT_CATEGORIES,
  recognizeBulgarianProduct,
  categorizeBulgarianProduct,
  validateBulgarianProductPrice
} from './bulgarian-products';

// Utility functions for common operations
export const ReceiptParsingUtils = {
  // Quick parse function for simple use cases
  async quickParse(text: string, engine: 'google_vision' | 'gpt_vision' | 'mock' = 'mock'): Promise<ReceiptExtraction> {
    const parser = new EnhancedReceiptParser({ debugMode: false });
    return await parser.parseReceipt(text, engine);
  },

  // Parse with debug output
  async debugParse(text: string, engine: 'google_vision' | 'gpt_vision' | 'mock' = 'mock'): Promise<ReceiptExtraction> {
    const parser = new EnhancedReceiptParser({ debugMode: true });
    return await parser.parseReceipt(text, engine);
  },

  // Validate receipt data quality
  assessReceiptQuality(extraction: ReceiptExtraction) {
    const criticalIssues = extraction.qualityIssues.filter((i: any) => i.severity === 'critical').length;
    const highIssues = extraction.qualityIssues.filter((i: any) => i.severity === 'high').length;
    const mediumIssues = extraction.qualityIssues.filter((i: any) => i.severity === 'medium').length;

    let quality: 'excellent' | 'good' | 'fair' | 'poor';

    if (criticalIssues > 0) {
      quality = 'poor';
    } else if (highIssues > 1 || mediumIssues > 3) {
      quality = 'fair';
    } else if (highIssues > 0 || mediumIssues > 1) {
      quality = 'good';
    } else {
      quality = 'excellent';
    }

    return {
      quality,
      score: extraction.confidence,
      issues: {
        critical: criticalIssues,
        high: highIssues,
        medium: mediumIssues,
        low: extraction.qualityIssues.filter((i: any) => i.severity === 'low').length
      },
      recommendations: extraction.suggestions
    };
  },

  // Get processing statistics
  getProcessingStats(extraction: ReceiptExtraction) {
    const categorizedItems = extraction.items.filter((item: any) =>
      item.category && item.category !== 'Други'
    ).length;

    const highConfidenceItems = extraction.items.filter((item: any) =>
      item.confidence >= 0.8
    ).length;

    const avgItemConfidence = extraction.items.length > 0
      ? extraction.items.reduce((sum: any, item: any) => sum + item.confidence, 0) / extraction.items.length
      : 0;

    return {
      processingTime: extraction.metadata.processingTime,
      totalItems: extraction.items.length,
      categorizedItems,
      highConfidenceItems,
      avgItemConfidence: Math.round(avgItemConfidence * 100) / 100,
      storeDetected: !!extraction.metadata.detectedStore,
      totalValidated: extraction.metadata.totalValidation.valid,
      textQuality: extraction.metadata.textQuality,
      layoutComplexity: extraction.metadata.layoutComplexity
    };
  }
};