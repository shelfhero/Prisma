'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = params.id as string;

  useEffect(() => {
    // Redirect to the new verification page
    if (receiptId) {
      router.replace(`/verify-receipt/${receiptId}`);
    }
  }, [receiptId, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Пренасочване...</p>
      </div>
    </div>
  );
}