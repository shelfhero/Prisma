/**
 * Automatic Receipt Processing Engine
 *
 * Automatically processes receipts and saves to budget when confidence is high.
 * Only requests manual review when necessary.
 */

import { createClient } from '@supabase/supabase-js';

export interface ProcessedItem {
  name: string;
  quantity: number;
  price: number;
  category?: string;
  confidence?: number;
}

export interface ProcessingResult {
  autoProcessed: boolean;
  requiresReview: boolean;
  autoSavedItems: ProcessedItem[];
  uncertainItems: ProcessedItem[];
  categoryBreakdown: {
    category: string;
    total: number;
    itemCount: number;
  }[];
  totalAmount: number;
  confidenceRate: number;
}

const DEFAULT_CONFIDENCE_THRESHOLD = 0.70;
const HIGH_CONFIDENCE_THRESHOLD = 0.90;

/**
 * Get user's auto-processing preferences
 */
export async function getUserPreferences(userId: string, supabase: any) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // Return defaults if no preferences exist
    return {
      auto_process_receipts: true,
      confidence_threshold: DEFAULT_CONFIDENCE_THRESHOLD,
      always_review: false,
    };
  }

  return data;
}

/**
 * Analyze items and determine if auto-processing is possible
 */
export function analyzeItems(items: ProcessedItem[], confidenceThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD) {
  const autoSavedItems: ProcessedItem[] = [];
  const uncertainItems: ProcessedItem[] = [];
  let totalConfidence = 0;
  let itemsWithConfidence = 0;

  items.forEach(item => {
    const confidence = item.confidence || 0;

    if (confidence > 0) {
      totalConfidence += confidence;
      itemsWithConfidence++;
    }

    // Items above threshold are auto-saved
    if (item.category && confidence >= confidenceThreshold) {
      autoSavedItems.push(item);
    } else {
      uncertainItems.push(item);
    }
  });

  const averageConfidence = itemsWithConfidence > 0
    ? totalConfidence / itemsWithConfidence
    : 0;

  return {
    autoSavedItems,
    uncertainItems,
    averageConfidence,
    requiresReview: uncertainItems.length > 0,
  };
}

/**
 * Calculate category breakdown from items
 */
export function calculateCategoryBreakdown(items: ProcessedItem[]) {
  const breakdown = new Map<string, { total: number; itemCount: number }>();

  items.forEach(item => {
    if (!item.category) return;

    const existing = breakdown.get(item.category) || { total: 0, itemCount: 0 };
    breakdown.set(item.category, {
      total: existing.total + (item.price * item.quantity),
      itemCount: existing.itemCount + 1,
    });
  });

  return Array.from(breakdown.entries())
    .map(([category, stats]) => ({
      category,
      total: stats.total,
      itemCount: stats.itemCount,
    }))
    .sort((a, b) => b.total - a.total); // Sort by total amount descending
}

/**
 * Check if receipt totals match (to detect parsing errors)
 */
export function validateTotals(
  expectedTotal: number,
  items: ProcessedItem[],
  tolerancePercent: number = 2
): { valid: boolean; difference: number } {
  const calculatedTotal = items.reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  );

  const difference = Math.abs(expectedTotal - calculatedTotal);
  const toleranceAmount = expectedTotal * (tolerancePercent / 100);

  return {
    valid: difference <= toleranceAmount,
    difference,
  };
}

/**
 * Main auto-processing function with quality validation
 */
export async function autoProcessReceipt(
  receiptId: string,
  items: ProcessedItem[],
  expectedTotal: number,
  merchantName: string,
  userId: string,
  supabase: any
): Promise<ProcessingResult> {

  // Get user preferences
  const prefs = await getUserPreferences(userId, supabase);

  // If user has "always review" enabled, skip auto-processing
  if (prefs.always_review) {
    return {
      autoProcessed: false,
      requiresReview: true,
      autoSavedItems: [],
      uncertainItems: items,
      categoryBreakdown: [],
      totalAmount: expectedTotal,
      confidenceRate: 0,
    };
  }

  // Analyze items by confidence
  const analysis = analyzeItems(items, prefs.confidence_threshold);

  // Calculate category breakdown for auto-saved items
  const categoryBreakdown = calculateCategoryBreakdown(analysis.autoSavedItems);

  const result: ProcessingResult = {
    autoProcessed: !analysis.requiresReview || analysis.uncertainItems.length === 0,
    requiresReview: analysis.requiresReview,
    autoSavedItems: analysis.autoSavedItems,
    uncertainItems: analysis.uncertainItems,
    categoryBreakdown,
    totalAmount: expectedTotal,
    confidenceRate: Math.round(analysis.averageConfidence * 100),
  };

  // If we can fully auto-process, save everything to database
  if (result.autoProcessed && analysis.autoSavedItems.length > 0) {
    await saveAutoProcessedReceipt(
      receiptId,
      analysis.autoSavedItems,
      categoryBreakdown,
      userId,
      supabase
    );
  }
  // If partial auto-processing, save the confident items
  else if (analysis.autoSavedItems.length > 0 && analysis.uncertainItems.length > 0) {
    await savePartialAutoProcessedReceipt(
      receiptId,
      analysis.autoSavedItems,
      analysis.uncertainItems.length,
      userId,
      supabase
    );
  }

  return result;
}

/**
 * Save fully auto-processed receipt to database
 */
async function saveAutoProcessedReceipt(
  receiptId: string,
  items: ProcessedItem[],
  categoryBreakdown: any[],
  userId: string,
  supabase: any
) {
  try {
    // Save items to receipt_items table
    const itemsToInsert = items.map(item => ({
      receipt_id: receiptId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      category: item.category,
      auto_categorized: true,
      confidence_score: item.confidence,
      user_id: userId,
    }));

    const { error: itemsError } = await supabase
      .from('receipt_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // Update receipt status
    const { error: receiptError } = await supabase
      .from('receipts')
      .update({
        status: 'completed',
        auto_processed: true,
        requires_review: false,
        auto_categorized_count: items.length,
        manual_review_count: 0,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', receiptId);

    if (receiptError) throw receiptError;

    // Update budget with category breakdown
    for (const breakdown of categoryBreakdown) {
      await updateBudgetCategory(
        userId,
        breakdown.category,
        breakdown.total,
        supabase
      );
    }

    console.log(`✓ Auto-processed receipt ${receiptId}: ${items.length} items saved`);
  } catch (error) {
    console.error('Error saving auto-processed receipt:', error);
    throw error;
  }
}

/**
 * Save partially auto-processed receipt (some items need review)
 */
async function savePartialAutoProcessedReceipt(
  receiptId: string,
  autoSavedItems: ProcessedItem[],
  uncertainCount: number,
  userId: string,
  supabase: any
) {
  try {
    // Save auto-categorized items
    const itemsToInsert = autoSavedItems.map(item => ({
      receipt_id: receiptId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      category: item.category,
      auto_categorized: true,
      confidence_score: item.confidence,
      user_id: userId,
    }));

    const { error: itemsError } = await supabase
      .from('receipt_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // Update receipt to require review for remaining items
    const { error: receiptError } = await supabase
      .from('receipts')
      .update({
        status: 'pending',
        auto_processed: false,
        requires_review: true,
        auto_categorized_count: autoSavedItems.length,
        manual_review_count: uncertainCount,
      })
      .eq('id', receiptId);

    if (receiptError) throw receiptError;

    console.log(`✓ Partially auto-processed receipt ${receiptId}: ${autoSavedItems.length} items saved, ${uncertainCount} need review`);
  } catch (error) {
    console.error('Error saving partial auto-processed receipt:', error);
    throw error;
  }
}

/**
 * Update budget with category spending
 */
async function updateBudgetCategory(
  userId: string,
  category: string,
  amount: number,
  supabase: any
) {
  try {
    // Get current month's budget entry
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Check if budget entry exists for this category this month
    const { data: existing, error: fetchError } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .gte('month', monthStart)
      .lte('month', monthEnd)
      .single();

    if (existing) {
      // Update existing budget entry
      const { error: updateError } = await supabase
        .from('budget_categories')
        .update({
          spent: (existing.spent || 0) + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      // Create new budget entry
      const { error: insertError } = await supabase
        .from('budget_categories')
        .insert({
          user_id: userId,
          category,
          spent: amount,
          month: monthStart,
        });

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error(`Error updating budget for category ${category}:`, error);
    // Don't throw - budget update failure shouldn't fail the whole process
  }
}

/**
 * Get processing statistics for user (for trust building)
 */
export async function getUserProcessingStats(userId: string, supabase: any) {
  const { data, error } = await supabase
    .from('user_processing_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return {
      total_receipts: 0,
      auto_processed_count: 0,
      total_auto_categorized_items: 0,
      total_manual_review_items: 0,
      auto_categorization_rate: 0,
    };
  }

  return data;
}
