# Testing Infrastructure Setup Guide

## 📋 Overview

Comprehensive testing infrastructure for **Призма** receipt management app including:

1. ✅ **Playwright E2E Tests** - Automated browser testing
2. ✅ **Lighthouse CI** - Performance monitoring in GitHub Actions
3. ✅ **Manual Testing Checklist** - Comprehensive QA checklist
4. ✅ **Sentry Integration** - Error logging and monitoring (free tier)
5. ✅ **Beta Feedback System** - In-app feedback collection
6. ✅ **Bug Reporting** - Detailed bug report tool with screenshots
7. ✅ **Privacy-First Analytics** - Self-hosted analytics and error tracking

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run E2E Tests

```bash
# Run all tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### 3. Run Lighthouse Performance Tests

```bash
# Build the app first
npm run build

# Run Lighthouse manually
npx lighthouse http://localhost:3000 --view

# Or use the CI configuration
npx @lhci/cli autorun
```

---

## 🧪 Playwright E2E Testing

### Test Files Location
- `e2e/auth.spec.ts` - Authentication tests
- `e2e/receipts.spec.ts` - Receipt management tests
- `e2e/admin.spec.ts` - Admin dashboard tests

### Configuration
File: `playwright.config.ts`

Key settings:
- **Base URL**: http://localhost:3000
- **Browsers**: Chromium, Mobile Chrome
- **Screenshots**: On failure
- **Video**: Retain on failure
- **Trace**: On first retry

### Running Specific Tests

```bash
# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run specific test
npx playwright test -g "should display login page"

# Run in headed mode (see browser)
npx playwright test --headed

# Run in specific browser
npx playwright test --project=chromium
```

### Writing New Tests

Example:
```typescript
import { test, expect } from '@playwright/test'

test('should do something', async ({ page }) => {
  await page.goto('/receipts')
  await expect(page.getByRole('heading')).toBeVisible()
})
```

### Best Practices
1. Use `data-testid` attributes for reliable selectors
2. Wait for network requests to complete
3. Use `page.waitForLoadState('networkidle')` for dynamic content
4. Clean up test data after tests
5. Use fixtures for authentication state

---

## 📊 Lighthouse CI

### GitHub Actions Workflow
File: `.github/workflows/lighthouse-ci.yml`

Runs on:
- Push to `main` branch
- Pull requests to `main`

### Performance Budgets
File: `.lighthouserc.json`

Current thresholds:
- **Performance**: ≥70
- **Accessibility**: ≥90
- **Best Practices**: ≥85
- **SEO**: ≥85
- **FCP**: ≤2000ms
- **LCP**: ≤2500ms
- **CLS**: ≤0.1
- **TBT**: ≤300ms

### Viewing Results
- Reports uploaded to temporary public storage
- Links available in GitHub Actions logs
- Artifacts stored for 30 days

### Local Testing

```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run assertions
lhci autorun

# Collect only
lhci collect --url=http://localhost:3000

# View results
lhci open
```

---

## 🐛 Sentry Error Tracking

### Setup

1. **Create Sentry Account** (Free Tier)
   - Go to https://sentry.io
   - Create new project (Next.js)
   - Copy DSN

2. **Add Environment Variables**
   ```bash
   # .env.local
   NEXT_PUBLIC_SENTRY_DSN=your_dsn_here
   SENTRY_ORG=your_org
   SENTRY_PROJECT=your_project
   SENTRY_AUTH_TOKEN=your_auth_token
   ```

3. **Configuration Files**
   - `sentry.client.config.ts` - Client-side config
   - `sentry.server.config.ts` - Server-side config
   - `sentry.edge.config.ts` - Edge runtime config

### Features Enabled
- **Error Tracking** - Automatic error capture
- **Performance Monitoring** - 10% sample rate (free tier)
- **Session Replay** - 10% sample rate + 100% on errors
- **Source Maps** - Uploaded automatically on build
- **Release Tracking** - Automatic versioning

### Free Tier Limits
- 5,000 errors/month
- 10,000 performance units/month
- 500 replays/month
- 1 GB attachments

### Testing Sentry

```javascript
// Trigger test error
throw new Error('Test Sentry Error')

// Or use button
<button onClick={() => { throw new Error('Test') }}>
  Test Error
</button>
```

---

## 💬 Beta Feedback System

### Component
File: `components/help/FeedbackForm.tsx`

### Features
- **Feedback Types**: General, Bug, Feature, Improvement
- **Auto-capture**: Browser info, page URL, screen resolution
- **User Context**: Links to user account if authenticated
- **Floating Button**: Bottom-right corner (blue)

### Database
Migration: `supabase/migrations/017_beta_feedback.sql`

Table: `beta_feedback`
- Stores all user feedback
- Admin can update status and priority
- RLS policies for privacy

### Usage in App

```tsx
import FeedbackForm from '@/components/help/FeedbackForm'

export default function Layout({ children }) {
  return (
    <>
      {children}
      <FeedbackForm />
    </>
  )
}
```

---

## 🪲 Bug Reporting

### Component
File: `components/help/BugReporter.tsx`

### Features
- **Keyboard Shortcut**: Ctrl+Shift+B
- **Screenshot Capture**: Browser screen capture API
- **File Upload**: Manual screenshot upload
- **Structured Form**:
  - Title
  - Description
  - Steps to reproduce
  - Expected vs Actual behavior
  - Screenshot attachment
- **Auto-capture**: System info, browser details
- **Floating Button**: Bottom-right corner (red)

### Database
Reuses `beta_feedback` table with type='bug'

### Usage

```tsx
import BugReporter from '@/components/help/BugReporter'

export default function Layout({ children }) {
  return (
    <>
      {children}
      <BugReporter />
    </>
  )
}
```

### Screenshot Storage
- Uploaded to Supabase Storage: `receipts` bucket
- Path: `bug-reports/{user_id}/{timestamp}-{filename}`
- Public URL stored in metadata

---

## 📈 Analytics & Error Tracking

### Privacy-First Analytics
File: `lib/analytics.ts`

**No external dependencies!** All data stored in your Supabase instance.

### Features
1. **Event Tracking**
   - User actions
   - Page views
   - Performance metrics
   - System events

2. **Error Tracking**
   - Automatic error capture
   - Severity levels (low/medium/high/critical)
   - Stack traces
   - User context
   - Integrates with Sentry

3. **Performance Monitoring**
   - Core Web Vitals (LCP, FID, CLS)
   - Page load times
   - Custom metrics

4. **Session Tracking**
   - Anonymous session IDs
   - Session-based analytics
   - No cookies (sessionStorage only)

### Database
Migration: `supabase/migrations/018_analytics_tracking.sql`

Tables:
- `analytics_events` - All tracked events
- `error_logs` - Error tracking and resolution

### Usage

```typescript
import {
  trackEvent,
  trackError,
  trackPageView,
  trackUserAction,
  initAnalytics
} from '@/lib/analytics'

// Initialize (in app layout)
useEffect(() => {
  initAnalytics()
}, [])

// Track events
trackUserAction('click', 'upload_button')
trackPageView('/receipts')
trackError(error, 'high', { context: 'payment' })

// Track receipt operations
import { trackReceiptUpload, trackOCRProcessing } from '@/lib/analytics'

trackReceiptUpload('success', {
  fileSize: 1024000,
  processingTime: 2500
})

trackOCRProcessing('success', {
  provider: 'google_vision',
  itemsDetected: 15,
  confidence: 0.95
})
```

### Admin Analytics Dashboard

```typescript
import { getAnalyticsSummary, getErrorTrends } from '@/lib/analytics'

// Get summary
const summary = await getAnalyticsSummary(
  '2024-01-01',
  '2024-12-31'
)

// Get error trends
const errors = await getErrorTrends(7) // last 7 days
```

### Data Retention
- **Analytics events**: 90 days
- **Error logs**: 90 days (if resolved)
- **Automatic cleanup**: Run `cleanup_old_analytics()` function

---

## 🔍 Manual Testing

### Checklist
File: `TESTING_CHECKLIST.md`

### Categories
1. Authentication & Authorization
2. Receipt Upload & Processing
3. Receipt Management
4. Categorization
5. Budget & Analytics
6. User Settings
7. Admin Dashboard
8. Mobile Responsiveness
9. Browser Compatibility
10. Performance
11. Offline Support
12. Security
13. Error Handling
14. Accessibility
15. Internationalization

### Testing Workflow
1. Read checklist before each release
2. Mark items as you test
3. Document bugs found
4. Retest after fixes
5. Sign off when complete

---

## 🚢 Deployment Checklist

Before deploying to production:

### 1. Environment Variables
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Optional but recommended
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=

# Google Cloud Vision
GOOGLE_CLOUD_VISION_API_KEY=

# OpenAI
OPENAI_API_KEY=
```

### 2. Database Migrations
```bash
# Run all migrations
npx supabase db push

# Verify migrations
npx supabase db diff
```

### 3. Run Tests
```bash
# E2E tests
npm run test:e2e

# Build test
npm run build

# Type check
npm run typecheck
```

### 4. Performance Check
```bash
# Lighthouse
npm run build
npm start
npx lighthouse http://localhost:3000 --view
```

### 5. Security Check
- [ ] All secrets in environment variables (not hardcoded)
- [ ] RLS policies enabled on all tables
- [ ] API routes check authentication
- [ ] File upload validation active
- [ ] Rate limiting configured
- [ ] HTTPS enforced

### 6. Analytics Setup
- [ ] Sentry DSN configured
- [ ] Error tracking tested
- [ ] Analytics tables created
- [ ] Cleanup job scheduled

### 7. Beta Testing
- [ ] Feedback form accessible
- [ ] Bug reporter functional
- [ ] Test accounts created
- [ ] Beta testers invited

---

## 📚 Additional Resources

### Playwright Documentation
- [Playwright Docs](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

### Lighthouse
- [Lighthouse Docs](https://developer.chrome.com/docs/lighthouse/)
- [Web Vitals](https://web.dev/vitals/)
- [Performance Budget](https://web.dev/performance-budgets-101/)

### Sentry
- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Error Monitoring](https://docs.sentry.io/product/issues/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)

### Supabase
- [Supabase Docs](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage](https://supabase.com/docs/guides/storage)

---

## 🆘 Troubleshooting

### Playwright Tests Failing

**Issue**: Tests timing out
```bash
# Increase timeout
npx playwright test --timeout=60000
```

**Issue**: Element not found
```typescript
// Use waitFor
await page.waitForSelector('[data-testid="element"]', { timeout: 10000 })
```

**Issue**: Tests flaky
```typescript
// Add retry logic
test.describe.configure({ retries: 2 })
```

### Lighthouse CI Issues

**Issue**: Build fails in CI
```bash
# Check build locally first
npm run build
npm start
```

**Issue**: Scores too low
```bash
# Analyze bundle
npm run build:analyze
```

### Sentry Not Capturing Errors

**Issue**: No errors in Sentry
1. Check DSN is correct
2. Verify `NODE_ENV=production`
3. Test with manual error: `throw new Error('test')`
4. Check browser console for Sentry init logs

**Issue**: Too many events (rate limit)
```typescript
// Reduce sample rate
tracesSampleRate: 0.05 // 5% instead of 10%
```

### Analytics Not Tracking

**Issue**: Events not recorded
1. Check network tab for failed requests
2. Verify tables exist in Supabase
3. Check RLS policies
4. Ensure user is authenticated (for user_id events)

**Issue**: Too much data
```bash
# Run cleanup manually
SELECT cleanup_old_analytics();
```

---

## 🎯 Next Steps

1. **Run initial tests**: `npm run test:e2e`
2. **Set up Sentry account**: Free tier
3. **Configure Lighthouse CI**: Update budget thresholds
4. **Deploy beta feedback**: Add components to layout
5. **Monitor analytics**: Check Supabase tables
6. **Invite beta testers**: Share app link
7. **Review checklist**: Complete manual testing

---

## 📞 Support

For issues with testing infrastructure:
- Open issue on GitHub
- Check documentation links above
- Contact dev team: dev@prizma.bg

Happy Testing! 🎉
