/**
 * Receipt Quality Validation API
 *
 * Runs background quality checks on receipts
 * Returns validation results with issues that need user attention
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { validateReceipt, createValidationSummary } from '@/lib/quality-validator';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { receiptId, merchantName } = body;

    if (!receiptId) {
      return NextResponse.json(
        { error: 'Receipt ID is required' },
        { status: 400 }
      );
    }

    // Load receipt data
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .eq('user_id', session.user.id)
      .single();

    if (receiptError || !receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Load items
    const { data: items, error: itemsError } = await supabase
      .from('receipt_items')
      .select('*')
      .eq('receipt_id', receiptId);

    if (itemsError || !items) {
      return NextResponse.json(
        { error: 'Failed to load receipt items' },
        { status: 500 }
      );
    }

    // Run validation
    const validationResult = await validateReceipt(
      receiptId,
      items,
      receipt.total_amount,
      merchantName || receipt.merchant_name,
      session.user.id,
      supabase
    );

    // Update receipt with validation results
    if (validationResult.requiresUserAttention) {
      const criticalItems = validationResult.issues
        .filter(issue => issue.itemId)
        .map(issue => issue.itemId);

      await supabase
        .from('receipts')
        .update({
          requires_review: true,
          manual_review_count: criticalItems.length,
        })
        .eq('id', receiptId);

      // Flag items that need review
      if (criticalItems.length > 0) {
        for (const itemId of criticalItems) {
          await supabase
            .from('receipt_items')
            .update({
              auto_categorized: false,
            })
            .eq('id', itemId);
        }
      }
    }

    // Return validation summary
    return NextResponse.json({
      success: true,
      validation: {
        passed: validationResult.passed,
        requiresAttention: validationResult.requiresUserAttention,
        summary: createValidationSummary(validationResult),
        issues: validationResult.issues.map(issue => ({
          type: issue.type,
          severity: issue.severity,
          message: issue.message,
          suggestion: issue.suggestion,
          itemId: issue.itemId,
          itemName: issue.itemName,
        })),
        autoResolved: validationResult.autoResolved.length,
      },
    });
  } catch (error) {
    console.error('Error validating receipt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
