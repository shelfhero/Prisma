'use client';

/**
 * Progressive Upload Component
 * Upload with progress bar, cancellation, and optimization
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { optimizeImage, validateImageFile } from '@/lib/image-optimization';
import { toast } from 'sonner';

interface ProgressiveUploadProps {
  onUploadComplete: (fileUrl: string, metadata: any) => void;
  onUploadError?: (error: Error) => void;
  maxSizeMB?: number;
  accept?: string;
}

export default function ProgressiveUpload({
  onUploadComplete,
  onUploadError,
  maxSizeMB = 1,
  accept = 'image/*',
}: ProgressiveUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'optimizing' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file
    const validation = validateImageFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error!);
      setStatus('error');
      toast.error('Невалиден файл', { description: validation.error });
      return;
    }

    setFile(selectedFile);
    setStatus('idle');
    setError(null);
    setProgress(0);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStatus('optimizing');
    setProgress(0);
    setError(null);

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Step 1: Optimize image (20% progress)
      toast.info('Оптимизиране на снимката...');
      const optimized = await optimizeImage(file, { maxSizeMB });

      if (abortControllerRef.current.signal.aborted) {
        throw new Error('Upload cancelled');
      }

      setProgress(20);

      toast.success('Снимката е оптимизирана', {
        description: `Намаляване от ${(optimized.originalSize / 1024 / 1024).toFixed(1)} MB на ${(optimized.compressedSize / 1024 / 1024).toFixed(1)} MB`,
      });

      // Step 2: Upload to Supabase Storage (20% -> 100%)
      setStatus('uploading');
      await uploadToStorage(optimized.file, (progress) => {
        setProgress(20 + (progress * 0.8));
      });

      if (abortControllerRef.current.signal.aborted) {
        throw new Error('Upload cancelled');
      }

      // Success
      setStatus('success');
      setProgress(100);
      toast.success('Качването завърши успешно!');

      // Call completion callback
      onUploadComplete('url-placeholder', {
        originalSize: optimized.originalSize,
        compressedSize: optimized.compressedSize,
        width: optimized.width,
        height: optimized.height,
      });

    } catch (err: any) {
      console.error('Upload error:', err);

      if (err.message === 'Upload cancelled') {
        setStatus('idle');
        toast.info('Качването е отменено');
      } else {
        setStatus('error');
        setError(err.message || 'Грешка при качване');
        toast.error('Грешка при качване', { description: err.message });
        onUploadError?.(err);
      }
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setUploading(false);
    setStatus('idle');
    setProgress(0);
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setStatus('idle');
    setError(null);
    setProgress(0);
  };

  // Simulate upload to storage (replace with actual Supabase upload)
  async function uploadToStorage(
    file: File,
    onProgress: (progress: number) => void
  ): Promise<string> {
    // Simulate chunked upload with progress
    const chunks = 10;
    for (let i = 0; i <= chunks; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Upload cancelled');
      }

      await new Promise(resolve => setTimeout(resolve, 200));
      onProgress(i / chunks);
    }

    return 'https://example.com/receipt.jpg';
  }

  return (
    <Card className="p-6">
      {!file ? (
        // Upload Button
        <label className="block cursor-pointer">
          <input
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-700 mb-2">
              Качете снимка на касов бон
            </p>
            <p className="text-sm text-gray-500">
              Кликнете за да изберете файл или го плъзнете тук
            </p>
            <p className="text-xs text-gray-400 mt-2">
              JPG, PNG, HEIC - Максимум {maxSizeMB} MB след компресия
            </p>
          </div>
        </label>
      ) : (
        // File Preview and Upload
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative">
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-lg"
              />
            )}

            {!uploading && status !== 'success' && (
              <button
                onClick={handleRemove}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                aria-label="Премахни"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* File Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-700">{file.name}</span>
            </div>
            <span className="text-gray-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>

          {/* Progress Bar */}
          {(uploading || status === 'success') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">
                  {status === 'optimizing' && 'Оптимизиране...'}
                  {status === 'uploading' && 'Качване...'}
                  {status === 'success' && 'Завършено!'}
                </span>
                <span className="text-gray-500">{Math.round(progress)}%</span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    status === 'success' ? 'bg-green-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {status === 'success' && (
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Качването завърши успешно!</span>
            </div>
          )}

          {status === 'error' && error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!uploading && status !== 'success' && (
              <Button
                onClick={handleUpload}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Upload className="w-5 h-5 mr-2" />
                Качи снимката
              </Button>
            )}

            {uploading && (
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <X className="w-5 h-5 mr-2" />
                Откажи
              </Button>
            )}

            {status === 'success' && (
              <Button
                onClick={handleRemove}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                Качи друга снимка
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
