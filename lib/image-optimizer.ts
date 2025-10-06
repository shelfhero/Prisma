/**
 * Client-Side Image Optimization for Призма
 * Compresses images before upload to speed up processing
 * Target: Save 1-2 seconds on upload
 */

import imageCompression from 'browser-image-compression';

export interface OptimizationOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
  initialQuality?: number;
}

export interface OptimizationResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  timeTaken: number;
}

/**
 * Optimize image for fast upload and processing
 * - Compress to max 1MB
 * - Resize to optimal 1600px width
 * - Convert to WebP for smaller size
 * - Use web workers for non-blocking compression
 */
export async function optimizeReceiptImage(
  file: File,
  options?: OptimizationOptions
): Promise<OptimizationResult> {
  const startTime = performance.now();
  const originalSize = file.size;

  console.log(`📸 Optimizing image: ${file.name} (${(originalSize / 1024 / 1024).toFixed(2)} MB)`);

  const defaultOptions: imageCompression.Options = {
    maxSizeMB: options?.maxSizeMB || 1,
    maxWidthOrHeight: options?.maxWidthOrHeight || 1600,
    useWebWorker: options?.useWebWorker !== false, // Default true
    fileType: options?.fileType || 'image/webp', // WebP is smaller and faster
    initialQuality: options?.initialQuality || 0.8, // Good balance
  };

  try {
    const compressedFile = await imageCompression(file, defaultOptions);
    const compressedSize = compressedFile.size;
    const timeTaken = performance.now() - startTime;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100);

    console.log(`✅ Image optimized in ${timeTaken.toFixed(0)}ms`);
    console.log(`📉 Size reduced: ${(originalSize / 1024 / 1024).toFixed(2)} MB → ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${compressionRatio.toFixed(1)}% smaller)`);

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      compressionRatio,
      timeTaken,
    };
  } catch (error) {
    console.error('❌ Image optimization failed:', error);
    // Fallback to original file if compression fails
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
      timeTaken: performance.now() - startTime,
    };
  }
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'Не е избран файл' };
  }

  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  if (!validTypes.includes(file.type.toLowerCase())) {
    return { valid: false, error: 'Невалиден формат. Използвайте JPG, PNG или WebP' };
  }

  // Check file size (max 10MB before compression)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Файлът е твърде голям (макс 10MB)' };
  }

  return { valid: true };
}

/**
 * Get data URL from file for preview
 */
export function getImagePreviewUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Estimate processing time based on image size
 */
export function estimateProcessingTime(fileSize: number): {
  upload: number;
  ocr: number;
  categorization: number;
  total: number;
} {
  // Base times in milliseconds
  const uploadTime = Math.min(2000, (fileSize / 1024 / 1024) * 1000); // ~1s per MB, max 2s
  const ocrTime = 4000; // OCR is fairly constant ~4s
  const categorizationTime = 2000; // Categorization ~2s

  return {
    upload: uploadTime,
    ocr: ocrTime,
    categorization: categorizationTime,
    total: uploadTime + ocrTime + categorizationTime,
  };
}
