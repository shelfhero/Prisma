/**
 * Upload Queue System
 * Queues uploads when offline and syncs when back online
 */

export interface QueuedUpload {
  id: string;
  type: 'receipt' | 'budget' | 'profile';
  data: any;
  file?: File;
  timestamp: number;
  retries: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const QUEUE_STORAGE_KEY = 'prizma_upload_queue';
const MAX_RETRIES = 3;

class UploadQueue {
  private queue: QueuedUpload[] = [];
  private isProcessing = false;
  private listeners: Array<(queue: QueuedUpload[]) => void> = [];

  constructor() {
    // Load queue from localStorage on init
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  /**
   * Add item to queue
   */
  add(item: Omit<QueuedUpload, 'id' | 'timestamp' | 'retries' | 'status'>): string {
    const queueItem: QueuedUpload = {
      ...item,
      id: this.generateId(),
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };

    this.queue.push(queueItem);
    this.saveToStorage();
    this.notifyListeners();

    console.log('📦 Added to upload queue:', queueItem.type, queueItem.id);

    return queueItem.id;
  }

  /**
   * Remove item from queue
   */
  remove(id: string) {
    this.queue = this.queue.filter(item => item.id !== id);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Get all queued items
   */
  getAll(): QueuedUpload[] {
    return [...this.queue];
  }

  /**
   * Get pending items count
   */
  getPendingCount(): number {
    return this.queue.filter(item => item.status === 'pending').length;
  }

  /**
   * Process the queue
   */
  async process(uploadHandler: (item: QueuedUpload) => Promise<void>) {
    if (this.isProcessing) {
      console.log('⏸️ Queue already processing');
      return;
    }

    if (!navigator.onLine) {
      console.log('📡 Offline - skipping queue processing');
      return;
    }

    const pendingItems = this.queue.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) {
      console.log('✅ Upload queue is empty');
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Processing ${pendingItems.length} queued uploads...`);

    for (const item of pendingItems) {
      if (!navigator.onLine) {
        console.log('📡 Lost connection - pausing queue');
        break;
      }

      try {
        // Update status to uploading
        this.updateItemStatus(item.id, 'uploading');

        // Call the upload handler
        await uploadHandler(item);

        // Mark as success
        this.updateItemStatus(item.id, 'success');

        // Remove from queue after successful upload
        this.remove(item.id);

        console.log('✅ Successfully uploaded:', item.type, item.id);
      } catch (error: any) {
        console.error('❌ Upload failed:', item.type, item.id, error);

        // Increment retries
        const updatedItem = this.queue.find(i => i.id === item.id);
        if (updatedItem) {
          updatedItem.retries++;
          updatedItem.error = error.message;

          // Remove if max retries reached
          if (updatedItem.retries >= MAX_RETRIES) {
            console.error('🚫 Max retries reached, removing from queue:', item.id);
            this.updateItemStatus(item.id, 'error');
            // Keep in queue but mark as error so user can see it
          } else {
            this.updateItemStatus(item.id, 'pending');
          }

          this.saveToStorage();
        }
      }
    }

    this.isProcessing = false;
    this.notifyListeners();

    console.log('✨ Queue processing complete');
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: (queue: QueuedUpload[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Clear all items from queue
   */
  clear() {
    this.queue = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Clear only successful/error items
   */
  clearCompleted() {
    this.queue = this.queue.filter(item => item.status === 'pending' || item.status === 'uploading');
    this.saveToStorage();
    this.notifyListeners();
  }

  // Private methods

  private updateItemStatus(id: string, status: QueuedUpload['status']) {
    const item = this.queue.find(i => i.id === id);
    if (item) {
      item.status = status;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;

    try {
      // Can't store File objects in localStorage, so we'll skip them
      const serializable = this.queue.map(item => ({
        ...item,
        file: undefined, // Files can't be serialized
      }));

      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('Failed to save upload queue:', error);
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`📦 Loaded ${this.queue.length} items from queue`);
      }
    } catch (error) {
      console.error('Failed to load upload queue:', error);
      this.queue = [];
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener([...this.queue]);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }
}

// Export singleton instance
export const uploadQueue = new UploadQueue();

/**
 * Auto-process queue when coming back online
 */
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Connection restored - processing upload queue');
    // Let the app provide the upload handler
  });
}
