/**
 * Image Optimization Utilities
 * Compress and resize images before upload for mobile performance
 */

export interface ImageOptimizationOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  fileType?: string;
}

export interface ImageOptimizationResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  quality: 0.85,
  fileType: 'image/jpeg',
};

/**
 * Compress and resize image before upload
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<ImageOptimizationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  console.log('🖼️ Optimizing image:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);

  // Load image
  const image = await loadImage(file);

  // Calculate new dimensions
  const { width, height } = calculateDimensions(
    image.width,
    image.height,
    opts.maxWidthOrHeight!
  );

  // Create canvas and draw resized image
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Use better image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(image, 0, 0, width, height);

  // Convert to blob with compression
  let quality = opts.quality!;
  let blob = await canvasToBlob(canvas, opts.fileType!, quality);

  // If still too large, reduce quality iteratively
  const maxBytes = opts.maxSizeMB! * 1024 * 1024;
  let attempts = 0;
  const maxAttempts = 5;

  while (blob.size > maxBytes && attempts < maxAttempts && quality > 0.1) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, opts.fileType!, quality);
    attempts++;
    console.log(`🔄 Reducing quality to ${(quality * 100).toFixed(0)}% (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
  }

  // Convert blob to file
  const compressedFile = new File(
    [blob],
    file.name.replace(/\.[^/.]+$/, '') + '.jpg',
    { type: opts.fileType }
  );

  const result: ImageOptimizationResult = {
    file: compressedFile,
    originalSize: file.size,
    compressedSize: compressedFile.size,
    compressionRatio: ((1 - compressedFile.size / file.size) * 100),
    width,
    height,
  };

  console.log('✅ Image optimized:', {
    original: `${(result.originalSize / 1024 / 1024).toFixed(2)} MB`,
    compressed: `${(result.compressedSize / 1024 / 1024).toFixed(2)} MB`,
    saved: `${result.compressionRatio.toFixed(1)}%`,
    dimensions: `${width}x${height}`,
  });

  return result;
}

/**
 * Load image from file
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));

      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Calculate optimal dimensions maintaining aspect ratio
 */
function calculateDimensions(
  width: number,
  height: number,
  maxWidthOrHeight: number
): { width: number; height: number } {
  if (width <= maxWidthOrHeight && height <= maxWidthOrHeight) {
    return { width, height };
  }

  const aspectRatio = width / height;

  if (width > height) {
    return {
      width: maxWidthOrHeight,
      height: Math.round(maxWidthOrHeight / aspectRatio),
    };
  } else {
    return {
      width: Math.round(maxWidthOrHeight * aspectRatio),
      height: maxWidthOrHeight,
    };
  }
}

/**
 * Convert canvas to blob with quality
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Validate file before optimization
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'Моля, изберете файл с изображение (JPG, PNG, HEIC)',
    };
  }

  // Check file size (max 50MB before compression)
  const maxSizeBeforeCompression = 50 * 1024 * 1024;
  if (file.size > maxSizeBeforeCompression) {
    return {
      valid: false,
      error: `Файлът е твърде голям (${(file.size / 1024 / 1024).toFixed(1)} MB). Максимум: 50 MB`,
    };
  }

  return { valid: true };
}

/**
 * Get image dimensions without loading full image
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const img = await loadImage(file);
  return { width: img.width, height: img.height };
}

/**
 * Create image thumbnail
 */
export async function createThumbnail(
  file: File,
  size: number = 200
): Promise<string> {
  const image = await loadImage(file);

  const canvas = document.createElement('canvas');
  const aspectRatio = image.width / image.height;

  if (aspectRatio > 1) {
    canvas.width = size;
    canvas.height = size / aspectRatio;
  } else {
    canvas.width = size * aspectRatio;
    canvas.height = size;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.7);
}
