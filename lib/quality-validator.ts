/**
 * Silent Quality Validation Engine
 *
 * Runs background checks on processed receipts.
 * Only alerts users when genuine issues are detected.
 * Trust by default - 95% of receipts should pass silently.
 */

import { createClient } from '@supabase/supabase-js';

export interface ValidationIssue {
  type: 'total_mismatch' | 'unusual_item' | 'pattern_break' | 'ocr_error';
  severity: 'low' | 'medium' | 'high';
  itemId?: string;
  itemName?: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  requiresUserAttention: boolean;
  autoResolved: ValidationIssue[];
}

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category?: string;
  confidence_score?: number;
}

interface UserHistory {
  commonCategories: Set<string>;
  commonStores: Set<string>;
  averagePrices: Map<string, number>;
  categoryByStore: Map<string, Set<string>>;
}

const TOLERANCE_PERCENT = 2; // 2% tolerance for total mismatch
const PRICE_ANOMALY_THRESHOLD = 3; // 3x more expensive than average
const NEW_ITEM_CONFIDENCE_THRESHOLD = 0.85; // High confidence needed for new items

/**
 * Main validation function
 */
export async function validateReceipt(
  receiptId: string,
  items: ReceiptItem[],
  expectedTotal: number,
  merchantName: string,
  userId: string,
  supabase: any
): Promise<ValidationResult> {

  const issues: ValidationIssue[] = [];
  const autoResolved: ValidationIssue[] = [];

  // Load user history for pattern detection
  const userHistory = await loadUserHistory(userId, supabase);

  // Check 1: Total validation
  const totalIssue = validateTotal(items, expectedTotal);
  if (totalIssue) {
    issues.push(totalIssue);
  }

  // Check 2: Unusual items
  const unusualItemIssues = await detectUnusualItems(
    items,
    userHistory,
    supabase,
    userId
  );
  issues.push(...unusualItemIssues);

  // Check 3: Pattern breaks
  const patternIssues = await detectPatternBreaks(
    items,
    merchantName,
    userHistory,
    supabase
  );
  issues.push(...patternIssues);

  // Check 4: OCR errors (store/product mismatches)
  const ocrIssues = detectOCRErrors(items, merchantName, userHistory);
  issues.push(...ocrIssues);

  // Filter: Only flag issues that truly need user attention
  const criticalIssues = issues.filter(issue =>
    issue.severity === 'high' ||
    (issue.severity === 'medium' && issue.type !== 'unusual_item')
  );

  // Auto-resolve low severity issues
  const lowSeverityIssues = issues.filter(issue => issue.severity === 'low');
  autoResolved.push(...lowSeverityIssues);

  const requiresAttention = criticalIssues.length > 0;

  return {
    passed: criticalIssues.length === 0,
    issues: criticalIssues,
    requiresUserAttention: requiresAttention,
    autoResolved,
  };
}

/**
 * Check if items total matches receipt total
 */
function validateTotal(items: ReceiptItem[], expectedTotal: number): ValidationIssue | null {
  const calculatedTotal = items.reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  );

  const difference = Math.abs(expectedTotal - calculatedTotal);
  const toleranceAmount = expectedTotal * (TOLERANCE_PERCENT / 100);

  if (difference > toleranceAmount) {
    return {
      type: 'total_mismatch',
      severity: difference > toleranceAmount * 2 ? 'high' : 'medium',
      message: `Сумата на продуктите (${calculatedTotal.toFixed(2)} лв) не съвпада с общата сума (${expectedTotal.toFixed(2)} лв)`,
      suggestion: 'Възможно е да има грешка при разпознаването. Моля проверете продуктите.',
    };
  }

  return null;
}

/**
 * Detect unusual items (new items, price anomalies)
 */
async function detectUnusualItems(
  items: ReceiptItem[],
  userHistory: UserHistory,
  supabase: any,
  userId: string
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  for (const item of items) {
    // Skip items with low confidence already flagged
    if (item.confidence_score && item.confidence_score < 0.7) {
      continue;
    }

    // Check if this is a first-time item with medium confidence
    const isNewItem = await isFirstTimeItem(item.name, userId, supabase);
    if (isNewItem && item.confidence_score && item.confidence_score < NEW_ITEM_CONFIDENCE_THRESHOLD) {
      issues.push({
        type: 'unusual_item',
        severity: 'medium',
        itemId: item.id,
        itemName: item.name,
        message: `Нов продукт: "${item.name}" (${Math.round((item.confidence_score || 0) * 100)}% сигурност)`,
        suggestion: 'Първи път виждаме този продукт. Моля потвърдете категорията.',
      });
      continue;
    }

    // Check for price anomalies
    const avgPrice = userHistory.averagePrices.get(normalizeItemName(item.name));
    if (avgPrice && item.price > avgPrice * PRICE_ANOMALY_THRESHOLD) {
      issues.push({
        type: 'unusual_item',
        severity: 'low', // Low severity - might be bulk purchase
        itemId: item.id,
        itemName: item.name,
        message: `Необичайна цена: "${item.name}" е ${(item.price / avgPrice).toFixed(1)}x по-скъп от обичайното`,
        suggestion: 'Проверете дали цената и количеството са правилни.',
      });
    }
  }

  return issues;
}

/**
 * Detect pattern breaks (unusual categories for user)
 */
async function detectPatternBreaks(
  items: ReceiptItem[],
  merchantName: string,
  userHistory: UserHistory,
  supabase: any
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  // Get unique categories in this receipt
  const categoriesInReceipt = new Set(
    items.filter(item => item.category).map(item => item.category!)
  );

  // Check for unusual categories for this user
  for (const category of categoriesInReceipt) {
    if (!userHistory.commonCategories.has(category)) {
      // User never bought from this category before
      const itemsInCategory = items.filter(item => item.category === category);

      // Only flag if multiple items AND low average confidence
      if (itemsInCategory.length >= 2) {
        const avgConfidence = itemsInCategory.reduce(
          (sum, item) => sum + (item.confidence_score || 0),
          0
        ) / itemsInCategory.length;

        if (avgConfidence < 0.75) {
          issues.push({
            type: 'pattern_break',
            severity: 'medium',
            message: `Нова категория: "${category}" (${itemsInCategory.length} продукта)`,
            suggestion: `Не сте купували от "${category}" преди. Моля проверете дали категоризацията е правилна.`,
          });
        }
      }
    }
  }

  // Check for store-category mismatches
  const storeCategoriesHistory = userHistory.categoryByStore.get(merchantName);
  if (storeCategoriesHistory) {
    for (const category of categoriesInReceipt) {
      if (!storeCategoriesHistory.has(category)) {
        // This store never sold this category before
        const itemsInCategory = items.filter(item => item.category === category);

        if (itemsInCategory.length >= 1 && itemsInCategory[0].confidence_score && itemsInCategory[0].confidence_score < 0.8) {
          issues.push({
            type: 'pattern_break',
            severity: 'low',
            itemId: itemsInCategory[0].id,
            itemName: itemsInCategory[0].name,
            message: `${merchantName} обикновено не продава "${category}"`,
            suggestion: 'Възможна грешка при категоризацията.',
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Detect OCR errors (product names that don't match store)
 */
function detectOCRErrors(
  items: ReceiptItem[],
  merchantName: string,
  userHistory: UserHistory
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Known store brands
  const storeBrands: { [key: string]: string[] } = {
    'Kaufland': ['kaufland', 'k-classic', 'k-take it', 'k-bio'],
    'Lidl': ['lidl', 'favorina', 'freeway', 'bellarom', 'cien'],
    'Billa': ['billa', 'clever', 'ja! natürlich'],
    'Fantastico': ['fantastico'],
    'T-Market': ['t-market'],
  };

  // Check if product names mention competing stores
  const merchantKey = Object.keys(storeBrands).find(store =>
    merchantName.toLowerCase().includes(store.toLowerCase())
  );

  if (merchantKey) {
    const competitorBrands = Object.entries(storeBrands)
      .filter(([store]) => store !== merchantKey)
      .flatMap(([_, brands]) => brands);

    for (const item of items) {
      const itemNameLower = item.name.toLowerCase();

      for (const competitorBrand of competitorBrands) {
        if (itemNameLower.includes(competitorBrand)) {
          issues.push({
            type: 'ocr_error',
            severity: 'high',
            itemId: item.id,
            itemName: item.name,
            message: `Продукт "${item.name}" изглежда не е от ${merchantName}`,
            suggestion: 'Възможна грешка при разпознаването. Проверете името на продукта.',
          });
          break;
        }
      }
    }
  }

  return issues;
}

/**
 * Load user's purchase history for pattern detection
 */
async function loadUserHistory(userId: string, supabase: any): Promise<UserHistory> {
  try {
    // Get user's receipt items from last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: receipts } = await supabase
      .from('receipts')
      .select('id, merchant_name')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('created_at', threeMonthsAgo.toISOString());

    if (!receipts || receipts.length === 0) {
      return createEmptyHistory();
    }

    const receiptIds = receipts.map((r: any) => r.id);

    const { data: items } = await supabase
      .from('receipt_items')
      .select('name, category, price, quantity')
      .in('receipt_id', receiptIds);

    if (!items || items.length === 0) {
      return createEmptyHistory();
    }

    // Build history
    const commonCategories = new Set<string>();
    const commonStores = new Set<string>();
    const averagePrices = new Map<string, number>();
    const categoryByStore = new Map<string, Set<string>>();
    const priceData = new Map<string, number[]>();

    items.forEach((item: any) => {
      if (item.category) {
        commonCategories.add(item.category);
      }

      // Track average prices
      const normalizedName = normalizeItemName(item.name);
      if (!priceData.has(normalizedName)) {
        priceData.set(normalizedName, []);
      }
      priceData.get(normalizedName)!.push(item.price);
    });

    // Calculate average prices
    priceData.forEach((prices, name) => {
      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      averagePrices.set(name, avg);
    });

    // Track store-category relationships
    receipts.forEach((receipt: any) => {
      const storeItems = items.filter((i: any) =>
        receipts.find((r: any) => r.id === receipt.id)
      );

      if (!categoryByStore.has(receipt.merchant_name)) {
        categoryByStore.set(receipt.merchant_name, new Set());
      }

      storeItems.forEach((item: any) => {
        if (item.category) {
          categoryByStore.get(receipt.merchant_name)!.add(item.category);
        }
      });

      commonStores.add(receipt.merchant_name);
    });

    return {
      commonCategories,
      commonStores,
      averagePrices,
      categoryByStore,
    };
  } catch (error) {
    console.error('Error loading user history:', error);
    return createEmptyHistory();
  }
}

function createEmptyHistory(): UserHistory {
  return {
    commonCategories: new Set(),
    commonStores: new Set(),
    averagePrices: new Map(),
    categoryByStore: new Map(),
  };
}

/**
 * Check if this is the first time seeing an item
 */
async function isFirstTimeItem(itemName: string, userId: string, supabase: any): Promise<boolean> {
  try {
    const normalized = normalizeItemName(itemName);

    const { data, error } = await supabase
      .from('receipt_items')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', `%${normalized}%`)
      .limit(1);

    return !data || data.length === 0;
  } catch (error) {
    console.error('Error checking first time item:', error);
    return false;
  }
}

/**
 * Normalize item name for comparison
 */
function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zа-я0-9\s]/g, '') // Remove special chars
    .trim()
    .split(/\s+/)
    .slice(0, 2) // Take first 2 words
    .join(' ');
}

/**
 * Create a user-friendly summary of validation results
 */
export function createValidationSummary(result: ValidationResult): string {
  if (result.passed) {
    return '✓ Всичко изглежда наред';
  }

  const highPriorityIssues = result.issues.filter(i => i.severity === 'high');
  const mediumPriorityIssues = result.issues.filter(i => i.severity === 'medium');

  if (highPriorityIssues.length > 0) {
    return `Проверете ${highPriorityIssues.length} ${highPriorityIssues.length === 1 ? 'продукт' : 'продукта'}`;
  }

  if (mediumPriorityIssues.length > 0) {
    return `${mediumPriorityIssues.length} ${mediumPriorityIssues.length === 1 ? 'продукт изисква' : 'продукта изискват'} внимание`;
  }

  return '✓ Всичко изглежда наред';
}
