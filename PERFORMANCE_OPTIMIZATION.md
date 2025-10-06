# Performance Optimization - Призма

## Target: Load in <2 seconds on 3G

Complete mobile performance optimization system for fast experience on slow networks.

## 1. Image Optimization

### Compression Before Upload

**File:** `lib/image-optimization.ts`

```typescript
import { optimizeImage } from '@/lib/image-optimization';

// Compress image before upload
const result = await optimizeImage(file, {
  maxSizeMB: 1,              // Max 1MB after compression
  maxWidthOrHeight: 1920,    // Max dimension
  quality: 0.85,             // JPEG quality
});

console.log('Saved:', result.compressionRatio, '%');
```

**Features:**
- ✅ Automatic compression (target 1MB)
- ✅ Resize to optimal dimensions
- ✅ Maintains aspect ratio
- ✅ Progressive quality reduction if needed
- ✅ Converts to JPEG for smaller size

### Progressive Upload

**File:** `components/upload/ProgressiveUpload.tsx`

```typescript
<ProgressiveUpload
  onUploadComplete={(url, metadata) => {
    console.log('Uploaded:', url);
  }}
  maxSizeMB={1}
/>
```

**Features:**
- ✅ Real-time progress bar (0-100%)
- ✅ Cancel upload option
- ✅ Shows compression savings
- ✅ Optimistic UI updates
- ✅ Error handling with retry

### Validation

```typescript
import { validateImageFile } from '@/lib/image-optimization';

const result = validateImageFile(file);
if (!result.valid) {
  toast.error(result.error); // Bulgarian error message
}
```

## 2. Loading States

### Skeleton Screens

**File:** `components/loading/SkeletonLoader.tsx`

Beautiful loading placeholders instead of spinners:

```typescript
import {
  ReceiptListSkeleton,
  BudgetDashboardSkeleton,
  PageSkeleton
} from '@/components/loading/SkeletonLoader';

// Show skeleton while loading
{loading ? <ReceiptListSkeleton count={5} /> : <ReceiptList data={data} />}
```

**Available Skeletons:**
- `ReceiptCardSkeleton` - Single receipt card
- `ReceiptListSkeleton` - List of receipts
- `BudgetCategorySkeleton` - Budget category card
- `BudgetDashboardSkeleton` - Full budget dashboard
- `DashboardStatsSkeleton` - Stats grid
- `TableSkeleton` - Data table
- `PageSkeleton` - Full page
- `ImageSkeleton` - Lazy loaded images

**Benefits:**
- Better perceived performance
- Users know content is loading
- No jarring spinner animations
- Smooth shimmer effect

### Optimistic UI Updates

**File:** `hooks/useOptimisticUpdate.tsx`

Update UI immediately, confirm with server later:

```typescript
import { useOptimisticList } from '@/hooks/useOptimisticUpdate';

const { list, addItem, updateItem, deleteItem } = useOptimisticList(receipts);

// Add receipt - UI updates immediately
await addItem(
  newReceipt,
  () => uploadReceiptToServer(newReceipt),
  { successMessage: 'Касовата бележка е добавена' }
);

// Update receipt - UI updates immediately
await updateItem(
  receiptId,
  { status: 'confirmed' },
  () => updateReceiptOnServer(receiptId),
  { successMessage: 'Обновено успешно' }
);

// Delete receipt - UI updates immediately
await deleteItem(
  receiptId,
  () => deleteReceiptFromServer(receiptId),
  { successMessage: 'Изтрито успешно' }
);
```

**Features:**
- ✅ Instant UI feedback
- ✅ Automatic rollback on error
- ✅ Error toast notifications
- ✅ Success confirmations

### Lazy Loading & Pagination

**File:** `hooks/usePagination.tsx`

Load data in chunks, not all at once:

```typescript
import { usePagination, useInfiniteScroll } from '@/hooks/usePagination';

// Standard pagination
const pagination = usePagination({
  pageSize: 20,
  totalCount: receiptsCount
});

// Infinite scroll
const { items, loading, hasMore, loadMore } = useInfiniteScroll(
  async (page) => {
    const data = await fetchReceipts(page);
    return {
      items: data.receipts,
      hasMore: data.hasMore
    };
  },
  { pageSize: 20 }
);
```

**Features:**
- ✅ Load 20 items per page
- ✅ Infinite scroll support
- ✅ Intersection observer for auto-load
- ✅ Loading states
- ✅ Error handling

## 3. Caching System

### Smart Caching

**File:** `lib/cache.ts`

Cache frequently accessed data to reduce server requests:

```typescript
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';

// Manual caching
cache.set('user:123:profile', userData, {
  ttl: CacheTTL.medium,      // 5 minutes
  storage: 'localStorage'     // Persist across sessions
});

const cached = cache.get('user:123:profile');

// Auto-fetch with cache
const categories = await cache.getOrFetch(
  CacheKeys.categories(),
  async () => fetchCategories(),
  { ttl: CacheTTL.long }  // 30 minutes
);
```

**Cache Levels:**
1. **Memory** - Fastest, cleared on refresh
2. **localStorage** - Persists across sessions

**TTL Configs:**
- `short`: 2 minutes
- `medium`: 5 minutes
- `long`: 30 minutes
- `veryLong`: 24 hours

**What to Cache:**
- ✅ User profile (5 min)
- ✅ User budget (5 min, localStorage)
- ✅ Categories (30 min, localStorage)
- ✅ Retailers (30 min, localStorage)
- ✅ Recent receipts (2 min)
- ✅ Common products (24 hours, localStorage)

**Invalidation:**
```typescript
import { invalidateUserCache, invalidateBudgetCache } from '@/lib/optimized-queries';

// After creating receipt
invalidateReceiptsCache(userId);

// After updating budget
invalidateBudgetCache(userId);

// Clear all user data
invalidateUserCache(userId);
```

## 4. Database Optimization

### Indexes for Speed

**File:** `supabase/migrations/010_performance_indexes.sql`

Added indexes for common queries:

```sql
-- Recent receipts (most common query)
CREATE INDEX idx_receipts_user_recent
ON receipts(user_id, purchased_at DESC);

-- Items by receipt (prevent N+1)
CREATE INDEX idx_items_receipt_id
ON items(receipt_id);

-- Current budget lookup
CREATE INDEX idx_budgets_current_period
ON budgets(user_id, period_type, start_date DESC)
WHERE period_type = 'monthly';

-- Product autocomplete
CREATE INDEX idx_product_categorizations_name_trgm
ON product_categorizations
USING gin(normalized_product_name gin_trgm_ops);
```

**Apply Migration:**
```bash
# Open Supabase SQL editor
# Paste contents of 010_performance_indexes.sql
# Run migration
```

### Optimized Queries

**File:** `lib/optimized-queries.ts`

Prevent N+1 queries with batch fetching:

```typescript
import {
  fetchRecentReceipts,
  fetchReceiptsPaginated,
  fetchCurrentBudget,
  fetchCategories,
  fetchRetailers
} from '@/lib/optimized-queries';

// ❌ Bad - N+1 query
for (const receipt of receipts) {
  const retailer = await fetchRetailer(receipt.retailer_id);
}

// ✅ Good - Single query
const receipts = await fetchRecentReceipts(supabase, userId, 20);
// Retailers are already included!
```

**Query Patterns:**
1. Fetch main data
2. Extract all foreign key IDs
3. Batch fetch related data in single query
4. Create lookup Map for O(1) access
5. Combine data

## 5. Bundle Size Optimization

### Next.js Configuration

**File:** `next.config.js`

```javascript
experimental: {
  // Tree-shake unused exports from packages
  optimizePackageImports: [
    'lucide-react',
    '@radix-ui/react-select',
    // ... other heavy packages
  ],
},

compiler: {
  // Remove console logs in production
  removeConsole: {
    exclude: ['error', 'warn'],
  },
},

// Image optimization
images: {
  formats: ['image/avif', 'image/webp'],
  minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
},
```

### Code Splitting

Dynamic imports for heavy components:

```typescript
import dynamic from 'next/dynamic';

// Lazy load heavy chart component
const SpendingChart = dynamic(
  () => import('@/components/analytics/SpendingChart'),
  {
    loading: () => <SkeletonLoader />,
    ssr: false  // Don't include in initial bundle
  }
);
```

### Icon Optimization

**Before:**
```typescript
import * as Icons from 'lucide-react'; // Imports all 1000+ icons!
```

**After:**
```typescript
import { Camera, Upload, Trash } from 'lucide-react'; // Only these 3
```

### Analyze Bundle

```bash
npm run build

# Look for:
# - Route sizes (should be < 200kB)
# - Shared chunks (vendors, commons)
# - Unused dependencies
```

## Performance Checklist

### Before Upload
- [ ] Validate file type and size
- [ ] Compress image to max 1MB
- [ ] Resize to optimal dimensions
- [ ] Show compression savings to user

### During Upload
- [ ] Show progress bar (0-100%)
- [ ] Allow cancellation
- [ ] Update UI optimistically
- [ ] Handle errors gracefully

### Loading Data
- [ ] Show skeleton screens
- [ ] Use pagination (20 items per page)
- [ ] Cache frequently accessed data
- [ ] Lazy load images
- [ ] Prefetch next page on scroll

### Queries
- [ ] Use indexes for common queries
- [ ] Batch fetch related data (no N+1)
- [ ] Cache results (2-30 min depending on data)
- [ ] Invalidate cache on updates
- [ ] Use pagination for large lists

### Bundle
- [ ] Tree-shake unused code
- [ ] Dynamic import heavy components
- [ ] Remove console logs in production
- [ ] Optimize images (AVIF/WebP)
- [ ] Code split by route

## Performance Metrics

### Target Metrics (3G Network)

| Metric | Target | Current |
|--------|--------|---------|
| First Contentful Paint | < 1.5s | ? |
| Largest Contentful Paint | < 2.5s | ? |
| Time to Interactive | < 2.0s | ? |
| Cumulative Layout Shift | < 0.1 | ? |
| First Input Delay | < 100ms | ? |

### Measure Performance

```typescript
// In browser console
performance.getEntriesByType('navigation')[0];

// Or use Lighthouse
// - Open DevTools
// - Go to Lighthouse tab
// - Run audit on mobile 3G
```

### Key Files Sizes

| File | Size (Target) |
|------|---------------|
| Main bundle | < 200 KB |
| Vendor chunk | < 150 KB |
| UI components | < 50 KB |
| Each route | < 100 KB |

## Best Practices

### 1. Always Optimize Images

```typescript
// ❌ Don't upload raw image
await uploadImage(rawFile);

// ✅ Always optimize first
const optimized = await optimizeImage(rawFile);
await uploadImage(optimized.file);
```

### 2. Show Loading States

```typescript
// ❌ Just show spinner
{loading && <Spinner />}

// ✅ Show skeleton that matches content
{loading ? <ReceiptListSkeleton /> : <ReceiptList data={data} />}
```

### 3. Cache Aggressively

```typescript
// ❌ Fetch every time
const categories = await fetchCategories();

// ✅ Cache for 30 minutes
const categories = await cache.getOrFetch(
  CacheKeys.categories(),
  fetchCategories,
  { ttl: CacheTTL.long, storage: 'localStorage' }
);
```

### 4. Paginate Lists

```typescript
// ❌ Load all 1000 receipts
const receipts = await fetchAllReceipts();

// ✅ Load 20 at a time
const { receipts, total } = await fetchReceiptsPaginated(userId, page, 20);
```

### 5. Optimistic Updates

```typescript
// ❌ Wait for server
await deleteReceipt(id);
refreshList();

// ✅ Update UI immediately
await deleteItem(id, () => deleteReceipt(id));
```

## Monitoring

### Track Performance in Production

```typescript
// Send to analytics
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];

    // Log key metrics
    console.log('Load time:', perfData.loadEventEnd - perfData.fetchStart, 'ms');

    // Send to analytics service
    // analytics.track('page_load', { duration: ... });
  });
}
```

## Future Optimizations

1. **Service Worker** - Offline-first PWA
2. **Prefetching** - Prefetch likely next actions
3. **CDN** - Serve static assets from CDN
4. **HTTP/2** - Server push for critical resources
5. **Lazy Hydration** - Defer React hydration
6. **Image CDN** - Use Cloudinary/Imgix for images
7. **Database Replication** - Read replicas for queries

## Troubleshooting

### Slow Queries

1. Check if index exists
2. Use EXPLAIN ANALYZE in Supabase
3. Check if caching is working
4. Look for N+1 queries

### Large Bundle

1. Run `npm run build` and check sizes
2. Look for large dependencies
3. Use dynamic imports
4. Remove unused dependencies

### Slow Images

1. Check compression settings
2. Use WebP/AVIF format
3. Lazy load images
4. Use proper sizes attribute

## Resources

- [Web.dev Performance](https://web.dev/performance/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Supabase Performance](https://supabase.com/docs/guides/platform/performance)
