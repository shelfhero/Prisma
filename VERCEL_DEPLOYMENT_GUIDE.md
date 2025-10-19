# Vercel Deployment Guide for Prizma

Complete guide to deploy your Bulgarian receipt scanning app to Vercel with full optimization.

## Quick Start (TL;DR)

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables (see below)
4. Deploy
5. **Important:** Switch from Google Cloud Vision SDK to REST API or use OpenAI only

## Changes Made for Vercel Compatibility

### 1. Next.js Configuration (`next.config.js`)

**Before**: Webpack was configured for local development with severe performance penalties:
- Cache disabled completely
- Single-threaded builds
- Worker plugins removed

**After**: Environment-aware configuration:
- Local dev optimizations only apply when `VERCEL !== '1'`
- Vercel builds use full parallelism and caching
- Source maps disabled on Vercel to reduce build time

### 2. Vercel Configuration (`vercel.json`)

**Before**:
```json
{
  "env": { "NODE_OPTIONS": "--max-old-space-size=8192" },
  "build": {
    "env": {
      "NODE_OPTIONS": "--max-old-space-size=8192",
      "VERCEL_FORCE_NO_BUILD_CACHE": "1"
    }
  }
}
```

**After**:
```json
{
  "build": {
    "env": {
      "NODE_OPTIONS": "--max-old-space-size=4096",
      "NODE_ENV": "production"
    }
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60,
      "memory": 3008
    }
  },
  "headers": [...],
  "rewrites": [...]
}
```

**Key Changes**:
- Memory optimized to 4GB for build process
- Build cache enabled (removed `VERCEL_FORCE_NO_BUILD_CACHE`)
- Function memory explicitly set to 3008MB (Vercel Pro max)
- Added security headers (XSS protection, frame options, etc.)
- Added optimal caching headers for static assets
- Webpack configured to use full parallelism on Vercel

## Critical Issue: Google Cloud Vision

### The Problem

`@google-cloud/vision` **CANNOT** work on Vercel because:

1. **Credential Files**: Requires `GOOGLE_APPLICATION_CREDENTIALS` pointing to a JSON file
   - Vercel serverless functions have no persistent filesystem
   - Cannot store credential files

2. **Node.js APIs**: Uses Node.js APIs (`fs`, `child_process`) not available in Edge Runtime

3. **Bundle Size**: Large library increases cold start times

### Current Usage

Your app uses Google Cloud Vision in:
- `lib/google-vision-ocr.ts` - Main implementation
- `lib/dual-ocr-processor.ts` - Dual OCR pipeline (Google Vision + GPT-4o)
- `lib/ultimate-receipt-processor.ts` - Legacy processor

### Recommended Solutions

#### Option 1: Use Only OpenAI GPT-4o Vision (Easiest)

You already have GPT-4o Vision working! Simply remove Google Cloud Vision dependency.

**Pros**:
- Already implemented and working
- No additional setup required
- Works perfectly on Vercel
- High accuracy for Bulgarian receipts

**Cons**:
- OpenAI API costs per request
- No free tier

**Implementation**:
```bash
npm uninstall @google-cloud/vision
```

Update your OCR routes to use only `processWithGPTVision()` from `dual-ocr-processor.ts`.

#### Option 2: Google Cloud Vision API via REST (Medium Complexity)

Instead of the Node.js SDK, call Google Vision REST API directly.

**Pros**:
- No credential file needed (use API key)
- Works on Vercel Edge Runtime
- Pay-per-use pricing

**Cons**:
- Need to rewrite API calls
- Still have Google Cloud costs

**Environment Variables**:
```env
GOOGLE_CLOUD_API_KEY=your_api_key_here
```

**Example**:
```typescript
async function googleVisionREST(imageBase64: string) {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: 'TEXT_DETECTION' }]
        }]
      })
    }
  );
  return response.json();
}
```

#### Option 3: Hybrid Architecture (Advanced)

Keep Google Cloud Vision for local development, use GPT-4o on Vercel.

**Implementation**:
```typescript
const isVercel = process.env.VERCEL === '1';

if (isVercel) {
  return await processWithGPTVision(imageBuffer);
} else {
  return await processWithGoogleVision(imageBuffer);
}
```

## Deployment Checklist

### Before Deploying

- [ ] Set environment variables in Vercel dashboard:
  - `OPENAI_API_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - Optional: `GOOGLE_CLOUD_API_KEY` (if using Option 2)
  - Optional: `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` (if using Sentry)

- [ ] Remove or migrate Google Cloud Vision:
  - Choose Option 1, 2, or 3 above
  - Update code accordingly
  - Test locally first

- [ ] Verify build locally:
  ```bash
  VERCEL=1 npm run build
  ```

### During Deployment

1. Push to your Git repository
2. Vercel will auto-deploy if connected
3. Monitor build logs for errors
4. Check function size limits (50MB max per function)

### After Deployment

- [ ] Test OCR functionality with real receipts
- [ ] Monitor function execution times (should be < 10s)
- [ ] Check function logs for errors
- [ ] Verify database connections work
- [ ] Test image uploads to Supabase Storage

## Vercel Limits to Know

### Free Tier
- Build time: 45 minutes
- Function memory: 1GB
- Function duration: 10s
- Bandwidth: 100GB/month

### Pro Tier ($20/month)
- Build time: 60 minutes
- Function memory: 3GB (configured in `vercel.json`)
- Function duration: 60s (configured in `vercel.json`)
- Bandwidth: 1TB/month

### Your Current Settings (Pro Tier)
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60,      // 60 seconds max
      "memory": 3008          // 3008MB (max for Pro)
    }
  }
}
```

## Troubleshooting

### Build Fails with "Out of Memory"

1. Reduce memory in `vercel.json`:
   ```json
   "NODE_OPTIONS": "--max-old-space-size=2048"
   ```

2. Check bundle size:
   ```bash
   npm run build:analyze
   ```

3. Remove unused dependencies

### Build Timeout

1. Enable build cache (already done)
2. Remove `VERCEL_FORCE_NO_BUILD_CACHE`
3. Use `output: 'standalone'` in `next.config.js` for smaller builds

### Functions Timeout

1. Optimize OCR processing
2. Use smaller images before processing
3. Consider background jobs for heavy processing
4. Increase `maxDuration` (up to 60s on Pro, 300s on Enterprise)

### Google Cloud Vision Errors

This means you haven't migrated away from the SDK. Follow Option 1, 2, or 3 above.

## Next Steps

1. **Choose OCR Solution**: Decide on Option 1, 2, or 3
2. **Update Code**: Implement the chosen solution
3. **Test Locally**: Run `VERCEL=1 npm run build` and test
4. **Deploy**: Push to Git and let Vercel build
5. **Monitor**: Watch logs and test thoroughly

## Performance Tips

1. **Image Compression**: Compress images before OCR
   - Already implemented with `browser-image-compression`
   - Consider server-side compression too

2. **Caching**: Cache OCR results in database
   - Avoid re-processing same receipt

3. **Edge Functions**: Consider Vercel Edge Functions for faster cold starts
   - Lower memory limit (128MB)
   - Much faster startup

4. **Serverless Function Size**: Keep functions small
   - Current limit: 50MB
   - Use dynamic imports for heavy libraries

## Questions?

If deployment still fails:

1. Check Vercel build logs (dashboard)
2. Look for specific error messages
3. Verify all environment variables are set
4. Test the build command locally: `VERCEL=1 npm run build`
5. Check function bundle sizes
