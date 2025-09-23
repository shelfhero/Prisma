/**
 * Types for Enhanced Bulgarian Receipt Processing
 * Supports complex OCR parsing, store-specific formats, and quality scoring
 */

export interface ReceiptExtraction {
  success: boolean;
  confidence: number;
  retailer: string;
  total: number;
  date: string;
  items: ExtractedItem[];
  rawText: string;
  metadata: ExtractionMetadata;
  qualityIssues: QualityIssue[];
  suggestions: string[];
}

export interface ExtractedItem {
  name: string;
  originalText: string;
  price: number;
  quantity: number;
  unit?: string;
  barcode?: string;
  productCode?: string;
  category?: string;
  confidence: number;
  qualityFlags: ItemQualityFlag[];
  lineNumber: number;
  normalizedName: string;
}

export interface ExtractionMetadata {
  processingEngine: 'google_vision' | 'tabscanner' | 'mock';
  processingTime: number;
  detectedStore: StoreFormat | null;
  language: 'bg' | 'en' | 'mixed';
  textQuality: 'high' | 'medium' | 'low';
  layoutComplexity: 'simple' | 'medium' | 'complex';
  totalValidation: TotalValidationResult;
}

export interface QualityIssue {
  type: 'unclear_text' | 'missing_total' | 'item_mismatch' | 'price_inconsistency' | 'date_unclear' | 'store_unclear';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedItems?: number[];
  suggestedAction: string;
}

export interface ItemQualityFlag {
  type: 'ocr_uncertain' | 'price_suspicious' | 'name_incomplete' | 'quantity_unclear' | 'category_uncertain';
  confidence: number;
  description: string;
}

export interface TotalValidationResult {
  calculatedTotal: number;
  ocrTotal: number;
  difference: number;
  percentageDiff: number;
  valid: boolean;
  explanation: string;
}

export interface StoreFormat {
  name: string;
  pattern: RegExp;
  type: 'kaufland' | 'billa' | 'lidl' | 'fantastico' | 'tmarket' | 'other';
  layout: ReceiptLayout;
  numberFormat: NumberFormat;
  dateFormat: string[];
  itemPatterns: ItemPattern[];
  totalPatterns: RegExp[];
  discountPatterns?: RegExp[];
}

export interface ReceiptLayout {
  headerLines: number;
  footerLines: number;
  itemSectionStart?: string[];
  itemSectionEnd?: string[];
  pricePosition: 'right' | 'inline' | 'nextline';
  quantityPosition: 'prefix' | 'suffix' | 'separate';
}

export interface NumberFormat {
  decimalSeparator: ',' | '.';
  thousandsSeparator: ' ' | '.' | ',' | '';
  currencySymbol: 'лв' | 'BGN' | '€' | '$';
  currencyPosition: 'before' | 'after';
}

export interface ItemPattern {
  pattern: RegExp;
  nameGroup: number;
  priceGroup: number;
  quantityGroup?: number;
  barcodeGroup?: number;
  confidence: number;
  description: string;
}

export interface BulgarianProduct {
  name: string;
  alternatives: string[];
  category: string;
  commonMisspellings: string[];
  priceRange: {
    min: number;
    max: number;
    unit: string;
  };
  keywords: string[];
  brands?: string[];
}

export interface OCRConfidenceScore {
  overall: number;
  text: number;
  structure: number;
  validation: number;
  factors: ConfidenceFactor[];
}

export interface ConfidenceFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
}

export interface ProcessingContext {
  storeFormat?: StoreFormat;
  previousExtractions?: ReceiptExtraction[];
  userPreferences?: {
    preferredStores: string[];
    commonProducts: string[];
    defaultCategories: string[];
  };
  debugMode: boolean;
}