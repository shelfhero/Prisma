'use client';

/**
 * Error Handling Example Component
 * Demonstrates all error handling features
 * This is for reference - not used in production
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ErrorDisplay from '@/components/error/ErrorDisplay';
import { translateError, BudgetErrors, ReceiptErrors, logError } from '@/lib/error-handler';
import { validateBudgetSetup } from '@/lib/budget-validation';
import { useOffline } from '@/hooks/useOffline';
import { useUploadQueue } from '@/hooks/useUploadQueue';
import { toast } from 'sonner';

export default function ErrorHandlingExample() {
  const [error, setError] = useState<any>(null);
  const { isOffline, isOnline, wasOffline } = useOffline();
  const { pendingCount, add, process } = useUploadQueue();

  // Example 1: Handle network error
  const simulateNetworkError = () => {
    try {
      throw new Error('Failed to fetch');
    } catch (err) {
      const appError = translateError(err);
      logError(appError, err);
      setError(appError);
    }
  };

  // Example 2: Handle budget validation error
  const simulateBudgetError = () => {
    const error = BudgetErrors.negativeBudget();
    setError(error);
  };

  // Example 3: Handle budget mismatch
  const simulateBudgetMismatch = () => {
    const error = BudgetErrors.totalMismatch(1000, 950);
    setError(error);
  };

  // Example 4: Handle category over budget
  const simulateCategoryOverBudget = () => {
    const error = BudgetErrors.categoryOverBudget('Храни', 500, 400);
    setError(error);
  };

  // Example 5: Handle file too big
  const simulateFileTooBig = () => {
    const error = ReceiptErrors.fileTooBig(10);
    setError(error);
  };

  // Example 6: Handle blurry image
  const simulateBlurryImage = () => {
    const error = ReceiptErrors.blurryImage();
    setError(error);
  };

  // Example 7: Validate budget
  const validateBudget = () => {
    const result = validateBudgetSetup(1000, [
      { category_id: '1', category_name: 'Храни', limit_amount: 400 },
      { category_id: '2', category_name: 'Транспорт', limit_amount: 300 },
      { category_id: '3', category_name: 'Развлечения', limit_amount: 250 }, // Mismatch!
    ]);

    if (!result.isValid) {
      setError(result.errors[0]);
    } else {
      toast.success('Бюджетът е валиден!');
    }

    result.warnings.forEach(warning => {
      toast.warning(warning.title, { description: warning.message });
    });
  };

  // Example 8: Add to upload queue
  const addToQueue = () => {
    add({
      type: 'receipt',
      data: { test: 'data' },
    });
    toast.info('Добавено в опашка', {
      description: 'Pending uploads: ' + (pendingCount + 1)
    });
  };

  // Example 9: Process queue
  const processQueue = async () => {
    try {
      await process(async (item) => {
        console.log('Processing:', item);
        // Simulate upload
        await new Promise(resolve => setTimeout(resolve, 1000));
      });
      toast.success('Опашката е обработена!');
    } catch (err) {
      const appError = translateError(err);
      setError(appError);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Error Handling Examples</h1>
        <p className="text-gray-600 mb-4">
          Примери за обработка на грешки в Призма
        </p>

        {/* Network Status */}
        <div className="mb-6 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">Network Status:</h3>
          <div className="flex gap-2">
            <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
              {isOnline ? '🟢 Online' : '🔴 Offline'}
            </span>
            {wasOffline && <span className="text-blue-600">🔄 Recently reconnected</span>}
          </div>
          <div className="mt-2">
            <strong>Pending uploads:</strong> {pendingCount}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <ErrorDisplay
              error={error}
              onRetry={() => {
                console.log('Retrying...');
                setError(null);
              }}
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {/* Error Simulation Buttons */}
        <div className="space-y-4">
          <div>
            <h3 className="font-bold mb-2">Network Errors:</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={simulateNetworkError} variant="outline" size="sm">
                Network Error
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2">Budget Errors:</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={simulateBudgetError} variant="outline" size="sm">
                Negative Budget
              </Button>
              <Button onClick={simulateBudgetMismatch} variant="outline" size="sm">
                Budget Mismatch
              </Button>
              <Button onClick={simulateCategoryOverBudget} variant="outline" size="sm">
                Over Budget
              </Button>
              <Button onClick={validateBudget} variant="outline" size="sm">
                Validate Budget
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2">Upload Errors:</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={simulateFileTooBig} variant="outline" size="sm">
                File Too Big
              </Button>
              <Button onClick={simulateBlurryImage} variant="outline" size="sm">
                Blurry Image
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2">Upload Queue:</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={addToQueue} variant="outline" size="sm">
                Add to Queue
              </Button>
              <Button onClick={processQueue} variant="outline" size="sm" disabled={pendingCount === 0}>
                Process Queue ({pendingCount})
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Code Examples */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Code Examples:</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-mono font-bold mb-2">1. Translate Error:</h4>
            <pre className="bg-gray-100 p-3 rounded overflow-x-auto">
{`try {
  await fetch('/api/receipts');
} catch (error) {
  const appError = translateError(error, 'network');
  setError(appError);
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-mono font-bold mb-2">2. Validate Budget:</h4>
            <pre className="bg-gray-100 p-3 rounded overflow-x-auto">
{`const result = validateBudgetSetup(1000, allocations);
if (!result.isValid) {
  result.errors.forEach(err => toast.error(err.message));
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-mono font-bold mb-2">3. Upload Queue:</h4>
            <pre className="bg-gray-100 p-3 rounded overflow-x-auto">
{`if (isOffline) {
  uploadQueue.add({ type: 'receipt', data });
  toast.info('Ще се качи когато се свържете');
} else {
  await uploadReceipt(data);
}`}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
}
