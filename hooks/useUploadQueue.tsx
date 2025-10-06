'use client';

/**
 * Upload Queue Hook
 * React hook for managing upload queue
 */

import { useState, useEffect } from 'react';
import { uploadQueue, QueuedUpload } from '@/lib/upload-queue';
import { useOffline } from './useOffline';

export function useUploadQueue() {
  const [queue, setQueue] = useState<QueuedUpload[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isOnline, wasOffline } = useOffline();

  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = uploadQueue.subscribe(setQueue);

    // Load initial queue
    setQueue(uploadQueue.getAll());

    return unsubscribe;
  }, []);

  // Auto-process when coming back online
  useEffect(() => {
    if (wasOffline && isOnline) {
      console.log('🔄 Auto-processing queue after reconnection');
      // The app should provide the upload handler
    }
  }, [wasOffline, isOnline]);

  return {
    queue,
    pendingCount: uploadQueue.getPendingCount(),
    isProcessing,
    add: (item: Omit<QueuedUpload, 'id' | 'timestamp' | 'retries' | 'status'>) => {
      return uploadQueue.add(item);
    },
    remove: (id: string) => {
      uploadQueue.remove(id);
    },
    process: async (handler: (item: QueuedUpload) => Promise<void>) => {
      setIsProcessing(true);
      try {
        await uploadQueue.process(handler);
      } finally {
        setIsProcessing(false);
      }
    },
    clear: () => {
      uploadQueue.clear();
    },
    clearCompleted: () => {
      uploadQueue.clearCompleted();
    },
  };
}
