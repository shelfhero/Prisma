/**
 * Performance Monitoring for Призма
 * Tracks receipt processing performance using Sentry
 * Identifies bottlenecks and optimization opportunities
 */

import * as Sentry from '@sentry/nextjs';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

/**
 * Receipt Processing Performance Tracker
 * Tracks each stage of receipt processing
 */
export class ReceiptProcessingTracker {
  private transaction: any;
  private stages: Map<string, any> = new Map();
  private startTime: number;

  constructor(receiptId: string) {
    this.startTime = performance.now();

    // Start Sentry transaction
    this.transaction = Sentry.startTransaction({
      name: 'Receipt Processing',
      op: 'receipt.upload',
      tags: {
        receiptId,
      },
    });

    console.log(`📊 Performance tracking started for receipt: ${receiptId}`);
  }

  /**
   * Start tracking a processing stage
   */
  startStage(stageName: string, metadata?: Record<string, any>) {
    const span = this.transaction.startChild({
      op: `receipt.${stageName}`,
      description: `Receipt ${stageName} stage`,
      tags: metadata,
    });

    this.stages.set(stageName, {
      span,
      startTime: performance.now(),
      metadata,
    });

    console.log(`⏱️  Started stage: ${stageName}`, metadata);
  }

  /**
   * Finish tracking a processing stage
   */
  finishStage(stageName: string, success: boolean = true, metadata?: Record<string, any>) {
    const stage = this.stages.get(stageName);
    if (!stage) {
      console.warn(`⚠️  Stage "${stageName}" was not started`);
      return;
    }

    const duration = performance.now() - stage.startTime;

    // Add success status and metadata
    if (metadata) {
      stage.span.setData('metadata', metadata);
    }
    stage.span.setStatus(success ? 'ok' : 'unknown_error');
    stage.span.finish();

    console.log(`✅ Finished stage: ${stageName} (${duration.toFixed(0)}ms)`, {
      success,
      ...metadata,
    });

    // Log slow stages (>3 seconds)
    if (duration > 3000) {
      console.warn(`🐌 Slow stage detected: ${stageName} took ${(duration / 1000).toFixed(2)}s`);
      Sentry.captureMessage(`Slow ${stageName} stage: ${(duration / 1000).toFixed(2)}s`, {
        level: 'warning',
        tags: {
          stage: stageName,
          duration: Math.round(duration),
        },
      });
    }
  }

  /**
   * Finish entire transaction
   */
  finish(success: boolean = true, metadata?: Record<string, any>) {
    const totalDuration = performance.now() - this.startTime;

    if (metadata) {
      this.transaction.setData('metadata', metadata);
    }

    this.transaction.setStatus(success ? 'ok' : 'unknown_error');
    this.transaction.finish();

    console.log(`📊 Total processing time: ${(totalDuration / 1000).toFixed(2)}s`, {
      success,
      ...metadata,
    });

    // Alert on very slow processing (>15 seconds total)
    if (totalDuration > 15000) {
      Sentry.captureMessage(`Very slow receipt processing: ${(totalDuration / 1000).toFixed(2)}s`, {
        level: 'error',
        tags: {
          totalDuration: Math.round(totalDuration),
        },
      });
    }

    // Send metrics to analytics
    this.logMetrics(totalDuration, success, metadata);
  }

  /**
   * Record error during processing
   */
  recordError(error: Error, stageName?: string) {
    console.error(`❌ Error during ${stageName || 'processing'}:`, error);

    Sentry.captureException(error, {
      tags: {
        stage: stageName || 'unknown',
      },
      contexts: {
        receipt: {
          stage: stageName,
        },
      },
    });

    this.finish(false, {
      error: error.message,
      failedStage: stageName,
    });
  }

  /**
   * Log metrics for analytics
   */
  private logMetrics(duration: number, success: boolean, metadata?: Record<string, any>) {
    // Log to console for now (can be extended to send to analytics service)
    const metrics: PerformanceMetrics = {
      operation: 'receipt_processing',
      duration,
      success,
      metadata,
    };

    console.log('📈 Performance Metrics:', metrics);

    // Could send to analytics API here
    // await fetch('/api/analytics/performance', { method: 'POST', body: JSON.stringify(metrics) });
  }
}

/**
 * Simple performance timer
 */
export class PerformanceTimer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = performance.now();
  }

  /**
   * Stop timer and return duration
   */
  stop(): number {
    const duration = performance.now() - this.startTime;
    console.log(`⏱️  ${this.label}: ${duration.toFixed(0)}ms`);
    return duration;
  }

  /**
   * Stop timer and log if slow
   */
  stopAndWarn(threshold: number = 1000): number {
    const duration = this.stop();
    if (duration > threshold) {
      console.warn(`🐌 ${this.label} is slow: ${(duration / 1000).toFixed(2)}s (threshold: ${threshold}ms)`);
    }
    return duration;
  }
}

/**
 * Track image optimization performance
 */
export function trackImageOptimization(
  originalSize: number,
  compressedSize: number,
  duration: number
) {
  const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

  Sentry.addBreadcrumb({
    category: 'image',
    message: 'Image optimized',
    level: 'info',
    data: {
      originalSize,
      compressedSize,
      compressionRatio: `${compressionRatio}%`,
      duration,
    },
  });

  console.log(`📸 Image optimization: ${compressionRatio}% reduction in ${duration.toFixed(0)}ms`);
}

/**
 * Track cache hit/miss
 */
export function trackCachePerformance(hit: boolean, productName: string) {
  Sentry.addBreadcrumb({
    category: 'cache',
    message: hit ? 'Cache hit' : 'Cache miss',
    level: 'info',
    data: {
      product: productName,
      hit,
    },
  });
}

/**
 * Track batch categorization performance
 */
export function trackBatchCategorization(
  itemCount: number,
  duration: number,
  cacheHits: number
) {
  const avgTimePerItem = duration / itemCount;
  const cacheHitRate = ((cacheHits / itemCount) * 100).toFixed(1);

  Sentry.addBreadcrumb({
    category: 'categorization',
    message: 'Batch categorization completed',
    level: 'info',
    data: {
      itemCount,
      duration,
      avgTimePerItem,
      cacheHits,
      cacheHitRate: `${cacheHitRate}%`,
    },
  });

  console.log(`🏷️  Categorized ${itemCount} items in ${duration.toFixed(0)}ms (${cacheHitRate}% cache hits)`);
}
