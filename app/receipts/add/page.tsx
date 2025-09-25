/**
 * Add Receipt Page for Призма
 * Upload and process receipt images
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase-simple';

export default function AddReceiptPage() {
  return (
    <ProtectedRoute>
      <AddReceiptContent />
    </ProtectedRoute>
  );
}

function AddReceiptContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    setError(null);
    setSuccess(null);

    try {
      // Get auth token
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Няма активна сесия');
      }

      // Prepare form data
      const formData = new FormData();
      selectedFiles.forEach((file, index) => {
        formData.append(`image_${index}`, file);
      });

      // Upload to API
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

      const { total_amount, retailer, confidence, processing_status, receipt_id } = result.data;

      let message = `Касовата бележка е обработена успешно! Обща сума: ${total_amount} лв.`;

      if (processing_status === 'mock_ocr_processed') {
        message = `✅ Касова бележка от ${retailer} - ${total_amount} лв. (Симулация OCR: ${confidence}%)`;
      }

      setSuccess(message);
      setSelectedFiles([]);

      // Redirect to verification page immediately with any receipt ID
      setTimeout(() => {
        const mockReceiptId = receipt_id || Date.now().toString();
        router.push(`/verify-receipt/${mockReceiptId}`);
      }, 1500);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Неочаквана грешка');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

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
                Добави касова бележка
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
              Изберете една или повече снимки на касова бележка. Системата автоматично ще разпознае информацията и ще я добави в базата данни.
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
      </main>
    </div>
  );
}