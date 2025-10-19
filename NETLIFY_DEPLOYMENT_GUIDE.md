# Netlify Deployment Guide for Prizma

Netlify is another excellent option for deploying your Next.js app with built-in CI/CD and serverless functions.

## Why Netlify?

### Advantages:
- **Instant rollbacks** - One-click rollback to any previous deployment
- **Deploy previews** - Every PR gets a preview URL
- **Edge Functions** - Low-latency serverless functions
- **Built-in forms** - Easy form handling (if needed in future)
- **Free tier** - 300 build minutes/month, 100GB bandwidth
- **Great DX** - Excellent developer experience and documentation

### Netlify Pricing:
- **Free Tier**: 300 build minutes/month, 100GB bandwidth
- **Pro Plan**: $19/month - 25,000 build minutes, 1TB bandwidth
- **Background functions** available on Pro+

## Prerequisites

- Netlify account (sign up at https://www.netlify.com)
- Your GitHub repository (already pushed)
- All required API keys ready

## Important: Google Cloud Vision Limitation

⚠️ **Note**: Like Vercel, Netlify uses serverless functions, so the Google Cloud Vision SDK won't work without modifications. You have the same options as Vercel:

1. **Use OpenAI GPT-4o Vision only** (easiest, already works)
2. **Switch to Google Vision REST API** (requires code changes)
3. **Hybrid approach** (OpenAI on Netlify, Google locally)

See `VERCEL_DEPLOYMENT_GUIDE.md` for detailed migration steps.

## Quick Start

### Option 1: Deploy via Netlify Dashboard (Recommended)

1. **Go to Netlify Dashboard**: https://app.netlify.com

2. **Create New Site**:
   - Click "Add new site" → "Import an existing project"
   - Choose "GitHub"
   - Select your repository: `shelfhero/Prisma`

3. **Configure Build Settings**:
   Netlify should auto-detect Next.js. Verify these settings:

   - **Base directory**: (leave empty)
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Functions directory**: `netlify/functions` (auto-created)

4. **Add Environment Variables**:
   Click "Site settings" → "Environment variables" → "Add a variable"

   ```env
   # Supabase (Required)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Google Cloud Vision API (Required)
   GOOGLE_CLOUD_VISION_API_KEY=your_google_vision_api_key

   # OpenAI API (Required)
   OPENAI_API_KEY=your_openai_api_key

   # Optional: Sentry
   NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
   SENTRY_ORG=your_sentry_org
   SENTRY_PROJECT=prizma
   SENTRY_AUTH_TOKEN=your_sentry_auth_token

   # Production settings
   NODE_ENV=production
   NODE_VERSION=20
   ```

5. **Deploy**:
   - Click "Deploy site"
   - Wait for build to complete
   - Your site will be live at `https://random-name.netlify.app`

6. **Custom Domain** (Optional):
   - Go to "Domain settings"
   - Add your custom domain
   - Netlify handles SSL automatically

### Option 2: Deploy via Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login**:
   ```bash
   netlify login
   ```

3. **Initialize Site**:
   ```bash
   netlify init
   ```

4. **Add Environment Variables**:
   ```bash
   netlify env:set NEXT_PUBLIC_SUPABASE_URL your_url
   netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY your_key
   netlify env:set SUPABASE_SERVICE_ROLE_KEY your_key
   netlify env:set GOOGLE_CLOUD_VISION_API_KEY your_key
   netlify env:set OPENAI_API_KEY your_key
   netlify env:set NODE_ENV production
   netlify env:set NODE_VERSION 20
   ```

5. **Deploy**:
   ```bash
   # Deploy to draft URL
   netlify deploy

   # Deploy to production
   netlify deploy --prod
   ```

## Netlify Configuration File

Create `netlify.toml` in your project root for advanced configuration:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[functions]
  node_bundler = "esbuild"
  external_node_modules = ["@google-cloud/vision", "sharp"]

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "origin-when-cross-origin"

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "no-store, must-revalidate"

[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

## After Deployment

### 1. Update Supabase Settings
Add your Netlify URL to Supabase:
- Go to Supabase Dashboard → Authentication → URL Configuration
- **Site URL**: `https://your-app.netlify.app`
- **Redirect URLs**:
  - `https://your-app.netlify.app/**`
  - `https://your-app.netlify.app/auth/callback`

### 2. Test Your Deployment
- Visit your Netlify URL
- Test authentication (sign up/login)
- Test receipt scanning
- Test dashboard and budget features

### 3. Monitor Your App
Netlify Dashboard provides:
- **Functions**: Serverless function logs and metrics
- **Analytics**: Site analytics (Pro plan)
- **Logs**: Build and function logs
- **Bandwidth**: Usage tracking

## Netlify Features

### Deploy Previews
Every pull request gets a unique preview URL:
- Automatic preview builds
- Comment on PR with preview link
- Test before merging

### Instant Rollbacks
Made a mistake? Rollback instantly:
1. Go to "Deploys"
2. Find the working deployment
3. Click "Publish deploy"
- Zero downtime
- Instant switch

### Branch Deploys
Deploy different branches:
- `main` → Production
- `staging` → Staging URL
- `develop` → Dev URL

Configure in Site settings → Build & deploy → Deploy contexts

### Forms (Bonus Feature)
If you want to add contact forms in the future:
```html
<form name="contact" netlify>
  <input type="text" name="name" />
  <input type="email" name="email" />
  <textarea name="message"></textarea>
  <button type="submit">Send</button>
</form>
```

Netlify handles form submissions automatically!

## Resource Limits

### Free Tier:
- **Build minutes**: 300/month
- **Bandwidth**: 100GB/month
- **Function invocations**: 125k/month
- **Function runtime**: 10 seconds max
- **Concurrent builds**: 1

### Pro Tier ($19/month):
- **Build minutes**: 25,000/month
- **Bandwidth**: 1TB/month
- **Function invocations**: 2M/month
- **Function runtime**: 10 seconds (26 seconds with background functions)
- **Concurrent builds**: 3
- **Analytics included**

## Netlify vs Vercel vs Railway

| Feature | Netlify | Vercel | Railway |
|---------|---------|--------|---------|
| **Architecture** | Serverless | Serverless | Node.js server |
| **Google Vision SDK** | ⚠️ Needs migration | ⚠️ Needs migration | ✅ Works |
| **Function timeout** | 10s (26s Pro) | 10s (60s Pro) | No limit |
| **Deploy previews** | ✅ Excellent | ✅ Excellent | ⚠️ Manual |
| **Instant rollback** | ✅ One-click | ⚠️ Manual | ⚠️ Manual |
| **Forms** | ✅ Built-in | ❌ No | ❌ No |
| **Analytics** | ✅ Built-in (Pro) | ✅ Built-in | ⚠️ Basic |
| **Free tier** | 300 min, 100GB | 100GB bandwidth | $5 credit |
| **Edge network** | ✅ Global | ✅ Global | ⚠️ Regional |
| **Cost** | $19/month Pro | $20/month Pro | Pay for uptime |

## Continuous Deployment

Netlify automatically deploys when you push to GitHub:

1. **Push to GitHub**:
   ```bash
   git push origin main
   ```

2. **Automatic Build & Deploy**:
   - Netlify detects the push
   - Runs build command
   - Deploys to production
   - Comments on commit with deploy URL

### Configure Auto-Deploy:
- Go to Site settings → Build & deploy → Continuous deployment
- Choose which branches to deploy
- Enable/disable auto-publishing

## Troubleshooting

### Build Fails with Type Errors

**Check TypeScript**:
```bash
npm run typecheck
```

**Fix errors locally**, then push:
```bash
git add .
git commit -m "Fix type errors"
git push
```

### Function Timeout

If OCR processing takes too long:

1. **Optimize image processing**:
   - Compress images before OCR
   - Reduce image resolution

2. **Use background functions** (Pro plan):
   - Longer timeout (26 seconds)
   - Better for heavy processing

3. **Consider Railway** for unlimited timeouts

### Out of Build Minutes

**Check usage**:
- Go to Team settings → Usage
- See build minutes consumed

**Optimize builds**:
- Use caching (already configured)
- Reduce dependencies
- Skip unnecessary builds

**Upgrade to Pro** for 25,000 minutes/month

### Environment Variables Not Working

**Check variable scope**:
- Variables must be set for the right context (production/preview/dev)
- Variables starting with `NEXT_PUBLIC_` are exposed to browser
- Secret variables should NOT have `NEXT_PUBLIC_` prefix

**Redeploy** after changing variables:
```bash
netlify deploy --prod
```

## Advanced Features

### Edge Functions

For ultra-low latency (beta):
```javascript
// netlify/edge-functions/hello.js
export default async (request, context) => {
  return new Response("Hello from the edge!")
}
```

### Split Testing

Test different versions (Pro+):
1. Deploy multiple branches
2. Configure split testing in dashboard
3. Split traffic between versions

### Serverless Functions

Create API endpoints in `netlify/functions/`:

```javascript
// netlify/functions/hello.js
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello!" })
  }
}
```

Access at: `https://your-app.netlify.app/.netlify/functions/hello`

## CLI Commands Reference

```bash
# Login to Netlify
netlify login

# Initialize new site
netlify init

# Link to existing site
netlify link

# Deploy to draft URL
netlify deploy

# Deploy to production
netlify deploy --prod

# View site in browser
netlify open

# View site admin
netlify open:admin

# View logs
netlify logs:function function-name

# Environment variables
netlify env:list                    # List all
netlify env:set KEY value          # Set variable
netlify env:unset KEY              # Delete variable
netlify env:import .env.production # Import from file

# Watch logs in real-time
netlify watch

# Run functions locally
netlify dev
```

## Best Practices

1. **Use Deploy Previews**: Test changes before merging
2. **Enable Build Notifications**: Get alerts on build failures
3. **Set Up Monitoring**: Use Netlify Analytics or Sentry
4. **Optimize Images**: Use Next.js Image component
5. **Cache Aggressively**: Configure cache headers
6. **Use Environment Variables**: Never commit secrets
7. **Enable Branch Deploys**: For staging/dev environments
8. **Test Rollbacks**: Practice rolling back before emergencies

## Support & Resources

- **Netlify Docs**: https://docs.netlify.com
- **Netlify Community**: https://answers.netlify.com
- **Netlify Status**: https://www.netlifystatus.com
- **Next.js on Netlify**: https://docs.netlify.com/integrations/frameworks/next-js

## Migration from Vercel/Railway

Already deployed elsewhere? Netlify makes migration easy:

1. **Import from GitHub** (same repo)
2. **Copy environment variables**
3. **Deploy to preview URL first**
4. **Test thoroughly**
5. **Update DNS** to Netlify
6. **Deactivate old deployment**

## When to Use Netlify?

### Choose Netlify if:
- You want excellent deploy preview workflow
- You need instant rollbacks frequently
- You prefer built-in forms handling
- You're building a mostly static site with API routes
- You want great DX with minimal config

### Choose Railway if:
- You need Google Cloud Vision SDK
- You need long-running processes (>26s)
- You want a traditional Node.js server
- You need more than 8GB memory

### Choose Vercel if:
- You're heavily using Vercel ecosystem
- You want the absolute fastest edge network
- You prefer Vercel's opinionated approach

---

## Ready to Deploy on Netlify?

1. ✅ TypeScript errors fixed
2. ✅ Code pushed to GitHub
3. ✅ Environment variables ready
4. ✅ Supabase configured

**Go to**: https://app.netlify.com and import your project!

The build should work now after the TypeScript fix.
