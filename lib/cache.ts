/**
 * Caching System
 * Cache frequently accessed data for better performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  storage?: 'memory' | 'localStorage';
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

class Cache {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private storagePrefix = 'prizma_cache_';

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && Date.now() < memoryEntry.expiresAt) {
      console.log('📦 Cache HIT (memory):', key);
      return memoryEntry.data as T;
    }

    // Try localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storagePrefix + key);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (Date.now() < entry.expiresAt) {
            console.log('📦 Cache HIT (storage):', key);
            // Promote to memory cache
            this.memoryCache.set(key, entry);
            return entry.data;
          } else {
            // Expired, remove it
            localStorage.removeItem(this.storagePrefix + key);
          }
        }
      } catch (error) {
        console.error('Cache read error:', error);
      }
    }

    console.log('❌ Cache MISS:', key);
    return null;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const { ttl = DEFAULT_TTL, storage = 'memory' } = options;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    // Always cache in memory
    this.memoryCache.set(key, entry);
    console.log('💾 Cached (memory):', key, `(TTL: ${ttl / 1000}s)`);

    // Also cache in localStorage if specified
    if (storage === 'localStorage' && typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          this.storagePrefix + key,
          JSON.stringify(entry)
        );
        console.log('💾 Cached (storage):', key);
      } catch (error) {
        console.error('Cache write error:', error);
      }
    }
  }

  /**
   * Remove item from cache
   */
  remove(key: string): void {
    this.memoryCache.delete(key);

    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storagePrefix + key);
    }

    console.log('🗑️ Cache removed:', key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();

    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          localStorage.removeItem(key);
        }
      });
    }

    console.log('🗑️ Cache cleared');
  }

  /**
   * Get or fetch (cache with fallback)
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    console.log('🔄 Fetching:', key);
    const data = await fetcher();
    this.set(key, data, options);

    return data;
  }

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern: string): void {
    // Invalidate memory cache
    const memoryKeys = Array.from(this.memoryCache.keys());
    memoryKeys.forEach(key => {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
        console.log('🗑️ Invalidated (memory):', key);
      }
    });

    // Invalidate localStorage
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix) && key.includes(pattern)) {
          localStorage.removeItem(key);
          console.log('🗑️ Invalidated (storage):', key);
        }
      });
    }
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): void {
    const now = Date.now();

    // Clean memory cache
    this.memoryCache.forEach((entry, key) => {
      if (now >= entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    });

    // Clean localStorage
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const entry = JSON.parse(stored);
              if (now >= entry.expiresAt) {
                localStorage.removeItem(key);
              }
            }
          } catch (error) {
            // Invalid entry, remove it
            localStorage.removeItem(key);
          }
        }
      });
    }

    console.log('🧹 Cleaned expired cache entries');
  }
}

// Export singleton instance
export const cache = new Cache();

// Clean expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanExpired();
  }, 5 * 60 * 1000);
}

/**
 * Cache keys for common data
 */
export const CacheKeys = {
  // User data
  userProfile: (userId: string) => `user:${userId}:profile`,
  userBudget: (userId: string) => `user:${userId}:budget`,

  // Categories
  categories: () => 'categories:all',
  categoryById: (id: string) => `category:${id}`,

  // Retailers/Stores
  retailers: () => 'retailers:all',
  retailerById: (id: string) => `retailer:${id}`,

  // Receipts
  receipts: (userId: string, page: number = 1) => `user:${userId}:receipts:page:${page}`,
  receiptById: (id: string) => `receipt:${id}`,
  recentReceipts: (userId: string) => `user:${userId}:receipts:recent`,

  // Common products
  commonProducts: () => 'products:common',
  productsByCategory: (categoryId: string) => `products:category:${categoryId}`,
};

/**
 * Cache TTL configurations
 */
export const CacheTTL = {
  short: 2 * 60 * 1000,      // 2 minutes
  medium: 5 * 60 * 1000,     // 5 minutes (default)
  long: 30 * 60 * 1000,      // 30 minutes
  veryLong: 24 * 60 * 60 * 1000,  // 24 hours
};
