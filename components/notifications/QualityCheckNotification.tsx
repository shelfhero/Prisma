'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

interface QualityIssue {
  receiptId: string;
  merchantName: string;
  issueCount: number;
  totalAmount: number;
  createdAt: string;
}

/**
 * Silent quality check notification
 * Only shows when there are genuine issues that need attention
 */
export default function QualityCheckNotification() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [issue, setIssue] = useState<QualityIssue | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForIssues();

    // Check every 30 seconds for new issues
    const interval = setInterval(checkForIssues, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkForIssues = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get receipts that require review (created in last hour)
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data: receipts } = await supabase
        .from('receipts')
        .select('id, merchant_name, total_amount, manual_review_count, created_at')
        .eq('user_id', user.id)
        .eq('requires_review', true)
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (receipts && receipts.length > 0) {
        const receipt = receipts[0];
        setIssue({
          receiptId: receipt.id,
          merchantName: receipt.merchant_name,
          issueCount: receipt.manual_review_count || 1,
          totalAmount: receipt.total_amount,
          createdAt: receipt.created_at,
        });
      } else {
        setIssue(null);
      }
    } catch (error) {
      console.error('Error checking for quality issues:', error);
    }
  };

  const handleReview = () => {
    if (issue) {
      router.push(`/receipt/quick-review/${issue.receiptId}`);
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Auto-show again after 15 minutes
    setTimeout(() => setDismissed(false), 15 * 60 * 1000);
  };

  // Don't show if dismissed or no issues
  if (dismissed || !issue) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-slide-up">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-yellow-300 p-4">
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-xl">😊</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Всичко добре, но...
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Проверете {issue.issueCount} {issue.issueCount === 1 ? 'продукт' : 'продукта'} от {issue.merchantName}
            </p>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleReview}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg font-medium text-sm transition-colors"
              >
                Прегледай
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm transition-colors"
              >
                По-късно
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Inline CSS for animation */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
