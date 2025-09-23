/**
 * Store-Specific Receipt Format Definitions for Bulgarian Retailers
 * Handles different layouts, number formats, and parsing patterns
 */

import { StoreFormat, ItemPattern, NumberFormat, ReceiptLayout } from './types';

const BGN_NUMBER_FORMAT: NumberFormat = {
  decimalSeparator: ',',
  thousandsSeparator: ' ',
  currencySymbol: 'лв',
  currencyPosition: 'after'
};

const EUR_NUMBER_FORMAT: NumberFormat = {
  decimalSeparator: '.',
  thousandsSeparator: ' ',
  currencySymbol: '€',
  currencyPosition: 'after'
};

const STANDARD_LAYOUT: ReceiptLayout = {
  headerLines: 5,
  footerLines: 3,
  pricePosition: 'right',
  quantityPosition: 'prefix'
};

const KAUFLAND_PATTERNS: ItemPattern[] = [
  {
    pattern: /^(.{1,40})\s+(\d+[,.]\d{2})\s*[БA-Z]*\s*$/,
    nameGroup: 1,
    priceGroup: 2,
    confidence: 0.9,
    description: 'Standard item with price (same line)'
  },
  {
    pattern: /^(.{3,40}),?\s*$/,
    nameGroup: 1,
    priceGroup: 0, // Price will be found on next line
    confidence: 0.75,
    description: 'Product name only (price on next line)'
  },
  {
    pattern: /^(\d+[,.]\d{3,5})\s*[x×]\s*(\d+[,.]\d{2})\s*$/,
    nameGroup: 0, // Name should be on previous line
    priceGroup: 2,
    quantityGroup: 1,
    confidence: 0.95,
    description: 'Weight × unit price format'
  },
  {
    pattern: /^(\d+[,.]\d{2})\s*[БA-Z]*\s*$/,
    nameGroup: 0, // Name should be on previous line
    priceGroup: 1,
    confidence: 0.8,
    description: 'Price only (name on previous line)'
  },
  {
    pattern: /^(.{1,40})\s+(\d{13})\s*$/,
    nameGroup: 1,
    priceGroup: -1,
    barcodeGroup: 2,
    confidence: 0.8,
    description: 'Item with barcode'
  },
  {
    pattern: /^(\d+[,.]\d{3,5})\s*[x×]\s*(\d+[,.]\d{2})\s*\n\s*#?\s*$/,
    nameGroup: 0,
    priceGroup: 2,
    quantityGroup: 1,
    confidence: 0.9,
    description: 'Multi-line weight × price'
  }
];

const BILLA_PATTERNS: ItemPattern[] = [
  {
    pattern: /^(.{1,40})\s{2,}(\d+[,]\d{2})$/,
    nameGroup: 1,
    priceGroup: 2,
    confidence: 0.85,
    description: 'Standard BILLA format'
  },
  {
    pattern: /^(\d+)\s*[x×]\s*(.{1,40})\s+(\d+[,]\d{2})$/,
    nameGroup: 2,
    priceGroup: 3,
    quantityGroup: 1,
    confidence: 0.9,
    description: 'Quantity prefix format'
  }
];

const LIDL_PATTERNS: ItemPattern[] = [
  {
    pattern: /^(.{1,40})\s*$/,
    nameGroup: 1,
    priceGroup: -1,
    confidence: 0.7,
    description: 'Item name (price on next line)'
  },
  {
    pattern: /^\s*(\d+[,]\d{2})\s*[лвA-Z]*\s*$/,
    nameGroup: -1,
    priceGroup: 1,
    confidence: 0.8,
    description: 'Price line'
  },
  {
    pattern: /^(.{1,40})\s+(\d+[,]\d{2})\s*[лвA-Z]*$/,
    nameGroup: 1,
    priceGroup: 2,
    confidence: 0.85,
    description: 'Same line format'
  }
];

const FANTASTICO_PATTERNS: ItemPattern[] = [
  {
    pattern: /^(.{1,40})\s+(\d+[,]\d{2})\s*лв\s*$/,
    nameGroup: 1,
    priceGroup: 2,
    confidence: 0.9,
    description: 'Standard with лв'
  },
  {
    pattern: /^(\d+[,]\d+)\s*кг\s*[x×]\s*(\d+[,]\d{2})\s*(.{1,40})$/,
    nameGroup: 3,
    priceGroup: 2,
    quantityGroup: 1,
    confidence: 0.95,
    description: 'Weight-based pricing'
  }
];

const TMARKET_PATTERNS: ItemPattern[] = [
  {
    pattern: /^(.{1,40})\s+(\d+[,]\d{2})$/,
    nameGroup: 1,
    priceGroup: 2,
    confidence: 0.8,
    description: 'Simple format'
  }
];

export const STORE_FORMATS: StoreFormat[] = [
  {
    name: 'Кауфланд',
    pattern: /KAUFLAND|КАУФЛАНД/i,
    type: 'kaufland',
    layout: {
      ...STANDARD_LAYOUT,
      itemSectionStart: ['ПРОДАЖБА', 'НАЧАЛО', 'СТОКИ'],
      itemSectionEnd: ['ОБЩО', 'СУМА', 'TOTAL'],
      pricePosition: 'right'
    },
    numberFormat: BGN_NUMBER_FORMAT,
    dateFormat: ['DD.MM.YYYY', 'DD/MM/YYYY', 'DD-MM-YYYY'],
    itemPatterns: KAUFLAND_PATTERNS,
    totalPatterns: [
      /ОБЩО\s*СУМА\s*(\d+[,.]\d{2})/i,
      /ОБЩА\s*СУМА\s*(\d+[,.]\d{2})/i,
      /TOTAL\s*(\d+[,.]\d{2})/i,
      /К\s*ПЛАЩАНЕ\s*(\d+[,.]\d{2})/i,
      // Pattern for when total appears on next line
      /(?:ОБЩО|ОБЩА)\s*СУМА\s*\n?\s*(\d+[,.]\d{2})/i
    ],
    discountPatterns: [
      /ОТСТЪПКА\s*(\d+[,]\d{2})/i,
      /ПРОМОЦИЯ\s*(\d+[,]\d{2})/i
    ]
  },
  {
    name: 'Билла',
    pattern: /BILLA|БИЛЛА/i,
    type: 'billa',
    layout: {
      ...STANDARD_LAYOUT,
      headerLines: 4,
      footerLines: 4,
      pricePosition: 'right'
    },
    numberFormat: BGN_NUMBER_FORMAT,
    dateFormat: ['DD.MM.YY', 'DD.MM.YYYY'],
    itemPatterns: BILLA_PATTERNS,
    totalPatterns: [
      /ОБЩО\s*(\d+[,]\d{2})/i,
      /СУМА\s*(\d+[,]\d{2})/i
    ]
  },
  {
    name: 'Лидл',
    pattern: /LIDL|ЛИДЛ/i,
    type: 'lidl',
    layout: {
      ...STANDARD_LAYOUT,
      pricePosition: 'nextline',
      quantityPosition: 'separate'
    },
    numberFormat: BGN_NUMBER_FORMAT,
    dateFormat: ['DD.MM.YYYY', 'DD/MM/YY'],
    itemPatterns: LIDL_PATTERNS,
    totalPatterns: [
      /СУМА\s*(\d+[,]\d{2})/i,
      /ОБЩО\s*(\d+[,]\d{2})/i,
      /ВСИЧКО\s*(\d+[,]\d{2})/i
    ]
  },
  {
    name: 'Фантастико',
    pattern: /FANTASTICO|ФАНТАСТИКО/i,
    type: 'fantastico',
    layout: {
      ...STANDARD_LAYOUT,
      headerLines: 6,
      itemSectionStart: ['ПРОДАЖБА'],
      pricePosition: 'right'
    },
    numberFormat: BGN_NUMBER_FORMAT,
    dateFormat: ['DD.MM.YYYY HH:mm', 'DD/MM/YYYY'],
    itemPatterns: FANTASTICO_PATTERNS,
    totalPatterns: [
      /ОБЩО\s*(\d+[,]\d{2})\s*лв/i,
      /ВСИЧКО\s*(\d+[,]\d{2})/i
    ]
  },
  {
    name: 'Т Маркет',
    pattern: /T[\s\-]*MARKET|Т[\s\-]*МАРКЕТ/i,
    type: 'tmarket',
    layout: STANDARD_LAYOUT,
    numberFormat: BGN_NUMBER_FORMAT,
    dateFormat: ['DD.MM.YYYY', 'DD-MM-YYYY'],
    itemPatterns: TMARKET_PATTERNS,
    totalPatterns: [
      /ОБЩО\s*(\d+[,]\d{2})/i,
      /TOTAL\s*(\d+[,]\d{2})/i
    ]
  }
];

export function detectStoreFormat(text: string): StoreFormat | null {
  const normalizedText = text.toUpperCase();

  for (const format of STORE_FORMATS) {
    if (format.pattern.test(normalizedText)) {
      return format;
    }
  }

  return null;
}

export function getStoreSpecificPatterns(storeType: string): ItemPattern[] {
  const store = STORE_FORMATS.find(s => s.type === storeType);
  return store ? store.itemPatterns : [];
}

export function parseNumberWithFormat(numberStr: string, format: NumberFormat): number {
  if (!numberStr) return 0;

  let cleaned = numberStr.trim();

  // Remove currency symbols
  cleaned = cleaned.replace(new RegExp(format.currencySymbol, 'gi'), '');

  // Handle Bulgarian format (12,50 = 12.50) OR OCR variations with dots
  if (format.decimalSeparator === ',') {
    // If there's a space before the last comma, it's thousands separator
    if (/\d\s+\d{1,3},\d{2}$/.test(cleaned)) {
      cleaned = cleaned.replace(/\s+/g, '').replace(',', '.');
    } else {
      // Just replace comma with dot for decimal
      cleaned = cleaned.replace(',', '.');
    }
  }

  // Additional OCR error handling - sometimes OCR returns dot instead of comma for Bulgarian receipts
  // Handle patterns like "6.37" which should be valid even for Bulgarian format
  if (/^\d+\.\d{1,2}$/.test(cleaned)) {
    // Already in correct decimal format, do nothing
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}