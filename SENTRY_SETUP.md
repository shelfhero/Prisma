# 🐛 Sentry Error Tracking Setup

## Quick Setup Guide

### Step 1: Create Sentry Account (Free)

1. Go to **https://sentry.io**
2. Sign up for free account
3. Create a new project:
   - Platform: **Next.js**
   - Project name: **prizma** (or your choice)
4. Copy your **DSN** (looks like: `https://xxx@xxx.ingest.sentry.io/xxx`)

### Step 2: Add DSN to Environment Variables

Add to `.env.local`:

```bash
# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn-here@xxx.ingest.sentry.io/xxx
```

### Step 3: Verify Configuration Files

Check that these files exist (already created):
- ✅ `sentry.client.config.ts` - Client-side error tracking
- ✅ `sentry.server.config.ts` - Server-side error tracking
- ✅ `sentry.edge.config.ts` - Edge runtime tracking
- ✅ `next.config.js` - Already configured with Sentry

### Step 4: Test Error Tracking

1. **Restart your dev server** (to load new env variables):
   ```bash
   # Kill existing server and restart
   npm run dev
   ```

2. **Visit test page**: http://localhost:3000/test-sentry

3. **Click "Throw Sync Error" button**

4. **Check Sentry Dashboard**:
   - Go to https://sentry.io
   - Navigate to your project
   - Click "Issues" tab
   - You should see the test error!

### Step 5: Production Configuration (Optional)

For production, add these environment variables:

```bash
# Production Sentry Config
SENTRY_ORG=your-org-name
SENTRY_PROJECT=prizma
SENTRY_AUTH_TOKEN=your-auth-token  # Get from Sentry settings
```

This enables:
- Source map uploads (better stack traces)
- Release tracking
- Deploy notifications

---

## What Gets Tracked

### ✅ Automatic Error Capture:
- JavaScript errors
- Unhandled promise rejections
- API failures
- Component errors (via ErrorBoundary)
- Network errors

### ✅ Captured Context:
- User info (if authenticated)
- Browser & device info
- Page URL & navigation history
- Custom tags & metadata
- Stack traces with source maps

### ✅ Privacy Settings:
- Only enabled in **production** (not dev)
- Sample rate: **10%** of transactions
- Session replay: **10%** normal, **100%** on errors
- All text masked in replays
- No sensitive data captured

---

## Configuration Details

### Client Config (`sentry.client.config.ts`)

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10% of transactions
  replaysSessionSampleRate: 0.1,  // 10% of sessions
  replaysOnErrorSampleRate: 1.0,  // 100% on errors
  enabled: process.env.NODE_ENV === 'production',
})
```

### Server Config (`sentry.server.config.ts`)

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === 'production',
})
```

---

## Integration with Existing Error Handler

Your error handler (`lib/error-handler.ts`) already integrates with Sentry:

```typescript
import { logError } from '@/lib/error-handler'

try {
  // Your code
} catch (error) {
  const appError = translateError(error)
  logError(appError, error)  // Automatically sends to Sentry in production
}
```

---

## Testing in Development

By default, Sentry is **disabled in development**. To test locally:

**Option 1: Temporarily enable for testing**

Edit `sentry.client.config.ts`:
```typescript
enabled: true,  // Always on (temporarily)
```

**Option 2: Use test page**

Visit http://localhost:3000/test-sentry and click error buttons.

**Option 3: Deploy to production/staging**

Sentry will automatically activate in production environment.

---

## Free Tier Limits

Sentry Free Plan includes:
- ✅ **5,000 errors/month**
- ✅ **10,000 performance units/month**
- ✅ **500 replays/month**
- ✅ **1 GB attachments**
- ✅ **30 days data retention**
- ✅ **Unlimited projects**

Perfect for beta testing and small apps!

---

## Dashboard Overview

### Issues Tab
- All errors and exceptions
- Error frequency & trends
- User impact
- Stack traces

### Performance Tab
- Transaction speeds
- Slow API calls
- Database queries
- Web Vitals

### Replays Tab
- Session recordings
- User interactions before error
- Console logs
- Network requests

---

## Best Practices

### ✅ DO:
- Set appropriate sample rates (10% for free tier)
- Add custom context to errors
- Use error boundaries in React
- Tag errors by severity
- Monitor error trends

### ❌ DON'T:
- Capture sensitive data (passwords, tokens)
- Set sample rate to 100% (quota limits)
- Ignore privacy settings
- Skip error filtering

---

## Troubleshooting

### Problem: No errors in Sentry

**Check:**
1. ✅ DSN is correct in `.env.local`
2. ✅ `NODE_ENV=production` (or enabled in config)
3. ✅ Dev server restarted after adding DSN
4. ✅ Error actually thrown (check browser console)
5. ✅ Not blocked by ad blocker

**Solution:**
```bash
# Verify DSN
echo $NEXT_PUBLIC_SENTRY_DSN

# Restart server
npm run dev

# Test on /test-sentry page
```

### Problem: Too many events (quota exceeded)

**Solution:**
Reduce sample rates in `sentry.client.config.ts`:
```typescript
tracesSampleRate: 0.05,  // 5% instead of 10%
replaysSessionSampleRate: 0.05,
```

### Problem: Source maps not working

**Solution:**
Add auth token and enable uploads:
```bash
SENTRY_AUTH_TOKEN=your-token
```

Run build with source maps:
```bash
npm run build
```

---

## Next Steps

1. ✅ Create Sentry account
2. ✅ Add DSN to `.env.local`
3. ✅ Restart dev server
4. ✅ Test on http://localhost:3000/test-sentry
5. ✅ Check Sentry dashboard for errors
6. ✅ Configure alerts (optional)
7. ✅ Set up Slack/email notifications (optional)

---

## Support

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Test Page**: http://localhost:3000/test-sentry
- **Dashboard**: https://sentry.io

Happy error tracking! 🐛
