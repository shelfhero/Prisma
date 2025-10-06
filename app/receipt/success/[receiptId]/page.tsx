'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AutoProcessSuccess from '@/components/receipt/AutoProcessSuccess';
import { ProcessingResult } from '@/lib/auto-processor';

export default function ReceiptSuccessPage() {
  const params = useParams();
  const receiptId = params.receiptId as string;
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [merchantName, setMerchantName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReceiptResult();
  }, [receiptId]);

  const loadReceiptResult = async () => {
    try {
      // Load receipt data
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', receiptId)
        .single();

      if (receiptError) throw receiptError;

      // Load items with categories
      const { data: itemsData, error: itemsError } = await supabase
        .from('receipt_items')
        .select('*')
        .eq('receipt_id', receiptId);

      if (itemsError) throw itemsError;

      // Build processing result from database data
      const autoSavedItems = itemsData?.filter(item => item.auto_categorized) || [];
      const uncertainItems = itemsData?.filter(item => !item.auto_categorized) || [];

      // Calculate category breakdown
      const categoryMap = new Map<string, { total: number; itemCount: number }>();
      autoSavedItems.forEach(item => {
        const existing = categoryMap.get(item.category) || { total: 0, itemCount: 0 };
        categoryMap.set(item.category, {
          total: existing.total + (item.price * item.quantity),
          itemCount: existing.itemCount + 1,
        });
      });

      const categoryBreakdown = Array.from(categoryMap.entries())
        .map(([category, stats]) => ({
          category,
          total: stats.total,
          itemCount: stats.itemCount,
        }))
        .sort((a, b) => b.total - a.total);

      const processingResult: ProcessingResult = {
        autoProcessed: receiptData.auto_processed || false,
        requiresReview: receiptData.requires_review || false,
        autoSavedItems: autoSavedItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          category: item.category,
          confidence: item.confidence_score,
        })),
        uncertainItems: uncertainItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          category: item.category,
          confidence: item.confidence_score,
        })),
        categoryBreakdown,
        totalAmount: receiptData.total_amount || 0,
        confidenceRate: Math.round(
          autoSavedItems.reduce((sum, item) => sum + (item.confidence_score || 0), 0) /
          (autoSavedItems.length || 1) * 100
        ),
      };

      setResult(processingResult);
      setMerchantName(receiptData.merchant_name || 'Неизвестен магазин');
    } catch (error) {
      console.error('Error loading receipt result:', error);
      setError('Грешка при зареждане на резултата');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Зареждане...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Грешка при зареждане'}</p>
          <a href="/dashboard" className="text-blue-600 hover:underline">
            Към началото
          </a>
        </div>
      </div>
    );
  }

  return (
    <AutoProcessSuccess
      result={result}
      receiptId={receiptId}
      merchantName={merchantName}
    />
  );
}
