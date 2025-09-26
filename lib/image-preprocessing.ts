/**
 * Image Preprocessing for Receipt OCR Enhancement
 * Improves OCR accuracy through image optimization techniques
 */

// Dynamic import for sharp to avoid process conflicts

export interface PreprocessingOptions {
  enhanceContrast?: boolean;
  straightenImage?: boolean;
  optimizeResolution?: boolean;
  cropToContent?: boolean;
  targetDPI?: number;
  contrastLevel?: number;
  brightnessLevel?: number;
}

export interface PreprocessedImage {
  buffer: Buffer;
  metadata: {
    width: number;
    height: number;
    format: string;
    preprocessing: string[];
  };
}

export class ReceiptImagePreprocessor {
  private static readonly OPTIMAL_DPI = 300;
  private static readonly MIN_WIDTH = 800;
  private static readonly MAX_WIDTH = 2400;

  /**
   * Preprocess receipt image for optimal OCR results
   */
  static async preprocessReceipt(
    imageBuffer: Buffer,
    options: PreprocessingOptions = {}
  ): Promise<PreprocessedImage[]> {
    const results: PreprocessedImage[] = [];
    const appliedPreprocessing: string[] = [];

    try {
      // Dynamic import for sharp
      const sharp = (await import('sharp')).default;

      let sharpImage = sharp(imageBuffer);
      const originalMetadata = await sharpImage.metadata();

      // 1. Original image (baseline)
      const originalProcessed = await this.processImage(sharpImage, [], options);
      results.push({
        buffer: originalProcessed,
        metadata: {
          width: originalMetadata.width || 0,
          height: originalMetadata.height || 0,
          format: originalMetadata.format || 'unknown',
          preprocessing: ['original']
        }
      });

      // 2. Enhanced version with multiple optimizations
      sharpImage = sharp(imageBuffer);

      // Apply resolution optimization
      if (options.optimizeResolution !== false) {
        sharpImage = await this.optimizeResolution(sharpImage, options.targetDPI);
        appliedPreprocessing.push('resolution-optimized');
      }

      // Apply contrast and brightness enhancement
      if (options.enhanceContrast !== false) {
        sharpImage = this.enhanceContrastAndBrightness(
          sharpImage,
          options.contrastLevel || 1.2,
          options.brightnessLevel || 1.1
        );
        appliedPreprocessing.push('contrast-enhanced');
      }

      // Apply sharpening for better text clarity
      sharpImage = sharpImage.sharpen({ sigma: 1.0, m1: 1.0, m2: 2.0 });
      appliedPreprocessing.push('sharpened');

      // Convert to grayscale for better OCR
      sharpImage = sharpImage.grayscale();
      appliedPreprocessing.push('grayscale');

      const enhancedBuffer = await sharpImage.jpeg({ quality: 95 }).toBuffer();
      const enhancedMetadata = await sharp(enhancedBuffer).metadata();

      results.push({
        buffer: enhancedBuffer,
        metadata: {
          width: enhancedMetadata.width || 0,
          height: enhancedMetadata.height || 0,
          format: 'jpeg',
          preprocessing: appliedPreprocessing
        }
      });

      // 3. High contrast version for faded receipts
      const highContrastBuffer = await this.createHighContrastVersion(imageBuffer, options);
      const highContrastMetadata = await sharp(highContrastBuffer).metadata();

      results.push({
        buffer: highContrastBuffer,
        metadata: {
          width: highContrastMetadata.width || 0,
          height: highContrastMetadata.height || 0,
          format: 'jpeg',
          preprocessing: ['high-contrast', 'grayscale', 'sharpened']
        }
      });

      return results;

    } catch (error) {
      console.error('Image preprocessing failed:', error);
      // Return original image as fallback
      return [{
        buffer: imageBuffer,
        metadata: {
          width: 0,
          height: 0,
          format: 'unknown',
          preprocessing: ['original-fallback']
        }
      }];
    }
  }

  /**
   * Optimize image resolution for OCR
   */
  private static async optimizeResolution(
    sharpImage: any,
    targetDPI: number = this.OPTIMAL_DPI
  ): Promise<any> {
    const metadata = await sharpImage.metadata();
    const currentWidth = metadata.width || 0;

    // Calculate optimal width based on DPI
    let targetWidth = currentWidth;

    if (currentWidth < this.MIN_WIDTH) {
      // Upscale small images
      targetWidth = this.MIN_WIDTH;
    } else if (currentWidth > this.MAX_WIDTH) {
      // Downscale very large images
      targetWidth = this.MAX_WIDTH;
    }

    if (targetWidth !== currentWidth) {
      const sharp = (await import('sharp')).default;
      return sharpImage.resize(targetWidth, null, {
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: false
      });
    }

    return sharpImage;
  }

  /**
   * Enhance contrast and brightness for faded receipts
   */
  private static enhanceContrastAndBrightness(
    sharpImage: any,
    contrast: number = 1.2,
    brightness: number = 1.1
  ): any {
    return sharpImage.modulate({
      brightness: brightness,
      saturation: 0.9 // Slightly reduce saturation for better text clarity
    }).linear(contrast, -(128 * contrast) + 128);
  }

  /**
   * Create high contrast version for very faded receipts
   */
  private static async createHighContrastVersion(
    imageBuffer: Buffer,
    options: PreprocessingOptions
  ): Promise<Buffer> {
    const sharp = (await import('sharp')).default;
    return await sharp(imageBuffer)
      .grayscale()
      .normalize() // Auto-adjust levels
      .modulate({
        brightness: 1.3,
        saturation: 1.0
      })
      .linear(1.8, -90) // Strong contrast boost
      .sharpen({ sigma: 1.5, m1: 1.0, m2: 3.0 })
      .jpeg({ quality: 95 })
      .toBuffer();
  }

  /**
   * Detect and straighten skewed receipt images
   */
  private static async straightenImage(sharpImage: any): Promise<any> {
    // Note: Sharp doesn't have built-in skew detection
    // This would require additional libraries like OpenCV.js or custom implementation
    // For now, we'll implement basic rotation correction

    // TODO: Implement skew detection and correction
    // This could be done by:
    // 1. Edge detection to find receipt borders
    // 2. Calculate angle of skew
    // 3. Rotate image to correct angle

    return sharpImage;
  }

  /**
   * Automatically crop image to focus on receipt content
   */
  private static async cropToContent(sharpImage: any): Promise<any> {
    // Use Sharp's trim functionality to remove excess whitespace/background
    return sharpImage.trim({
      background: { r: 255, g: 255, b: 255 }, // Assume white background
      threshold: 30 // Tolerance for "white" detection
    });
  }

  /**
   * Process image with specified operations
   */
  private static async processImage(
    sharpImage: any,
    operations: string[],
    options: PreprocessingOptions
  ): Promise<Buffer> {
    let processedImage = sharpImage;

    for (const operation of operations) {
      switch (operation) {
        case 'crop':
          if (options.cropToContent) {
            processedImage = await this.cropToContent(processedImage);
          }
          break;
        case 'straighten':
          if (options.straightenImage) {
            processedImage = await this.straightenImage(processedImage);
          }
          break;
        case 'enhance':
          if (options.enhanceContrast) {
            processedImage = this.enhanceContrastAndBrightness(
              processedImage,
              options.contrastLevel,
              options.brightnessLevel
            );
          }
          break;
      }
    }

    return await processedImage.jpeg({ quality: 95 }).toBuffer();
  }

  /**
   * Validate image quality and suggest preprocessing options
   */
  static async analyzeImageQuality(imageBuffer: Buffer): Promise<{
    needsEnhancement: boolean;
    suggestedOptions: PreprocessingOptions;
    issues: string[];
  }> {
    const issues: string[] = [];
    const suggestedOptions: PreprocessingOptions = {};

    try {
      const sharp = (await import('sharp')).default;
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const stats = await image.stats();

      // Check resolution
      if (metadata.width && metadata.width < this.MIN_WIDTH) {
        issues.push('Low resolution image');
        suggestedOptions.optimizeResolution = true;
      }

      // Check if image is too dark (low brightness)
      if (stats.channels) {
        const avgBrightness = stats.channels.reduce((sum, channel) => sum + channel.mean, 0) / stats.channels.length;
        if (avgBrightness < 100) {
          issues.push('Image appears too dark');
          suggestedOptions.enhanceContrast = true;
          suggestedOptions.brightnessLevel = 1.3;
        }
      }

      // Check if image is very large (might need optimization)
      if (metadata.width && metadata.width > this.MAX_WIDTH) {
        issues.push('Very large image size');
        suggestedOptions.optimizeResolution = true;
      }

      return {
        needsEnhancement: issues.length > 0,
        suggestedOptions,
        issues
      };

    } catch (error) {
      console.error('Image quality analysis failed:', error);
      return {
        needsEnhancement: true,
        suggestedOptions: {
          enhanceContrast: true,
          optimizeResolution: true
        },
        issues: ['Unable to analyze image quality']
      };
    }
  }
}

/**
 * Receipt validation utilities
 */
export class ReceiptValidator {
  /**
   * Validate that line items add up to the total amount
   */
  static validateReceiptMath(items: Array<{ price: number; quantity: number }>, total: number): {
    isValid: boolean;
    calculatedTotal: number;
    discrepancy: number;
    confidence: 'high' | 'medium' | 'low';
    needsManualReview: boolean;
  } {
    const calculatedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discrepancy = Math.abs(calculatedTotal - total);
    const discrepancyPercentage = total > 0 ? (discrepancy / total) * 100 : 100;

    let confidence: 'high' | 'medium' | 'low' = 'high';
    let needsManualReview = false;

    if (discrepancyPercentage > 10) {
      confidence = 'low';
      needsManualReview = true;
    } else if (discrepancyPercentage > 5) {
      confidence = 'medium';
      needsManualReview = true;
    }

    return {
      isValid: discrepancyPercentage <= 2, // Allow 2% tolerance for rounding
      calculatedTotal,
      discrepancy,
      confidence,
      needsManualReview
    };
  }

  /**
   * Calculate overall OCR confidence based on multiple factors
   */
  static calculateOCRConfidence(
    googleVisionConfidence: number,
    mathValidation: ReturnType<typeof ReceiptValidator.validateReceiptMath>,
    itemCount: number,
    textQuality: { hasAllPrices: boolean; hasValidItems: boolean }
  ): {
    overallConfidence: number;
    needsManualReview: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let confidence = googleVisionConfidence;

    // Adjust based on math validation
    if (!mathValidation.isValid) {
      confidence -= 20;
      reasons.push('Математическо несъответствие между продукти и обща сума');
    } else if (mathValidation.confidence === 'medium') {
      confidence -= 10;
      reasons.push('Малко несъответствие в сумите');
    }

    // Adjust based on item count
    if (itemCount === 0) {
      confidence -= 30;
      reasons.push('Няма разпознати продукти');
    } else if (itemCount < 3) {
      confidence -= 15;
      reasons.push('Малко разпознати продукти');
    }

    // Adjust based on text quality
    if (!textQuality.hasAllPrices) {
      confidence -= 15;
      reasons.push('Липсват цени за някои продукти');
    }

    if (!textQuality.hasValidItems) {
      confidence -= 20;
      reasons.push('Съмнителни имена на продукти');
    }

    const needsManualReview = confidence < 70 || mathValidation.needsManualReview;

    return {
      overallConfidence: Math.max(0, Math.min(100, confidence)),
      needsManualReview,
      reasons
    };
  }
}