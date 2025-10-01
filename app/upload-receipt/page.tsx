/**
 * Upload Receipt Page for Призма
 * Upload and process receipt images with real OCR processing
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase-simple';

export default function UploadReceiptPage() {
  return (
    <ProtectedRoute>
      <UploadReceiptContent />
    </ProtectedRoute>
  );
}

function UploadReceiptContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    setError(null);
    setSuccess(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Моля изберете поне един файл');
      return;
    }

    if (!user) {
      setError('Трябва да сте влезли в системата');
      return;
    }

    setUploading(true);
    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      // Get auth token
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Няма активна сесия');
      }

      // Stage 1: Uploading
      setProcessingStage('Качване на снимката...');

      // Prepare form data
      const formData = new FormData();
      selectedFiles.forEach((file, index) => {
        formData.append(`image_${index}`, file);
      });

      // Upload to API with auto-processing
      setProcessingStage('Обработваме касовия бон...');

      const response = await fetch('/api/receipts/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Грешка при качване');
      }

      setProcessingStage('Категоризираме продуктите...');

      // Wait a moment for processing to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { receipt_id, auto_processed, requires_review } = result.data;

      // Redirect based on processing result
      if (auto_processed && !requires_review) {
        // Fully auto-processed - show success screen
        router.push(`/receipt/success/${receipt_id}`);
      } else if (requires_review) {
        // Needs review - show quick review
        router.push(`/receipt/quick-review/${receipt_id}`);
      } else {
        // Fallback to full review
        router.push(`/verify-receipt/${receipt_id}`);
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Неочаквана грешка');
      setProcessing(false);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  // Processing overlay
  if (processing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg className="w-10 h-10 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {processingStage}
            </h2>
            <p className="text-gray-600">
              Използваме AI за автоматично разпознаване и категоризиране
            </p>
          </div>

          {/* Progress stages */}
          <div className="space-y-2 text-left">
            <div className={`flex items-center ${processingStage.includes('Качване') ? 'text-blue-600' : 'text-green-600'}`}>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Качване на снимката</span>
            </div>
            <div className={`flex items-center ${processingStage.includes('Обработваме') ? 'text-blue-600' : processingStage.includes('Категоризираме') ? 'text-green-600' : 'text-gray-400'}`}>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                {processingStage.includes('Обработваме') || processingStage.includes('Категоризираме') ? (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                ) : (
                  <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.3" />
                )}
              </svg>
              <span className="text-sm font-medium">Разпознаване с OCR</span>
            </div>
            <div className={`flex items-center ${processingStage.includes('Категоризираме') ? 'text-blue-600' : 'text-gray-400'}`}>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                {processingStage.includes('Категоризираме') ? (
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                ) : (
                  <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.3" />
                )}
              </svg>
              <span className="text-sm font-medium">AI категоризация</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Качване на касова бележка
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Instructions */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Качете снимки на касова бележка
            </h2>
            <p className="text-sm text-gray-600">
              Изберете една или повече снимки на касова бележка. Системата автоматично ще разпознае информацията с помощта на OCR технология и ще я добави в базата данни.
            </p>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Снимки на бележка
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Качете файлове</span>
                    <input
                      type="file"
                      className="sr-only"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="pl-1">или плъзнете тук</p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF до 10MB всеки
                </p>
              </div>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Избрани файлове ({selectedFiles.length})
              </h3>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-900">{file.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({(file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{success}</p>
              <p className="text-xs text-green-600 mt-1">
                Пренасочване към проверка на данните...
              </p>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={uploading}
            >
              Отказ
            </Button>
            <Button
              onClick={handleUpload}
              loading={uploading}
              disabled={selectedFiles.length === 0 || uploading}
            >
              {uploading ? 'Обработва се...' : 'Обработи бележка'}
            </Button>
          </div>
        </div>

        {/* Features Info */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
            <span className="text-2xl mr-2">✨</span>
            Автоматично обработване
          </h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span><strong>Google Vision OCR</strong> разпознава текста</span>
            </p>
            <p className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span><strong>AI категоризира</strong> продуктите автоматично</span>
            </p>
            <p className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span><strong>Директно в бюджета</strong> - без ръчен преглед*</span>
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            * Преглед се изисква само при ниска сигурност на AI (&lt;70%)
          </p>
        </div>
      </main>
    </div>
  );
}