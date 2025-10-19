# Railway Deployment Guide for Prizma

Railway is an excellent alternative to Vercel with more generous resource limits and better support for Node.js server features.

## Why Railway?

### Advantages over Vercel:
- **No serverless limitations** - Full Node.js server, not serverless functions
- **Google Cloud Vision SDK works** - Can use credential files (no need to migrate to REST API)
- **More generous free tier** - 500 hours/month ($5 credit)
- **Better for memory-intensive tasks** - Up to 8GB RAM on paid plans
- **Persistent storage** - Can store files if needed
- **PostgreSQL included** - Free PostgreSQL database in the same project
- **WebSocket support** - Full WebSocket support (useful for future features)

### Railway Pricing:
- **Free Tier**: $5/month credit (≈500 execution hours)
- **Developer Plan**: $5/month subscription + usage
- **Pay-as-you-go** after credits

## Prerequisites

- Railway account (sign up at https://railway.app)
- Your GitHub repository (already pushed)
- All required API keys ready

## Quick Start (Recommended)

### Option 1: Deploy via Railway Dashboard (Easiest)

1. **Go to Railway Dashboard**: https://railway.app/dashboard

2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository: `shelfhero/Prisma`
   - Railway will auto-detect Next.js

3. **Configure Environment Variables**:
   Click on your service → "Variables" tab → Add the following:

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
   ```

4. **Deploy**:
   - Railway will automatically build and deploy
   - You'll get a public URL like `https://your-app.up.railway.app`

5. **Custom Domain (Optional)**:
   - Go to "Settings" → "Domains"
   - Add your custom domain or use Railway's subdomain

### Option 2: Deploy via Railway CLI

1. **Install Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```

2. **Login**:
   ```bash
   railway login
   ```

3. **Initialize Project**:
   ```bash
   railway init
   ```

4. **Link to GitHub** (optional but recommended):
   ```bash
   railway link
   ```

5. **Add Environment Variables**:
   ```bash
   railway variables set NEXT_PUBLIC_SUPABASE_URL=your_url
   railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   railway variables set SUPABASE_SERVICE_ROLE_KEY=your_key
   railway variables set GOOGLE_CLOUD_VISION_API_KEY=your_key
   railway variables set OPENAI_API_KEY=your_key
   railway variables set NODE_ENV=production
   ```

6. **Deploy**:
   ```bash
   railway up
   ```

## Configuration Files

Your repository now includes Railway-specific configuration:

### 1. `railway.json`
Configures Railway deployment settings:
- Uses Nixpacks builder (Railway's default)
- Build command: `npm run build`
- Start command: `npm run start`
- Auto-restart on failure (up to 10 retries)

### 2. `nixpacks.toml`
Configures build process:
- Node.js 20
- Production environment
- Optimized build pipeline

## Google Cloud Vision Setup on Railway

Unlike Vercel, Railway supports the Google Cloud Vision SDK with credential files!

### Option 1: Use API Key (Easiest - Already Configured)
Your app is already set up to use `GOOGLE_CLOUD_VISION_API_KEY`. Just add it as an environment variable in Railway.

### Option 2: Use Service Account JSON (More Features)
If you need advanced features:

1. **Create Service Account** in Google Cloud Console
2. **Download JSON key file**
3. **Base64 encode** the JSON:
   ```bash
   cat google-vision-key.json | base64 -w 0
   ```
4. **Add to Railway** as environment variable:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS_JSON=<base64_encoded_json>
   ```
5. **Update your code** to decode and use it:
   ```typescript
   // In your OCR file
   if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
     const credentials = JSON.parse(
       Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 'base64').toString()
     );
     // Use credentials with Google Vision client
   }
   ```

## After Deployment

### 1. Update Supabase Settings
Add your Railway URL to Supabase:
- Go to Supabase Dashboard → Authentication → URL Configuration
- **Site URL**: `https://your-app.up.railway.app`
- **Redirect URLs**:
  - `https://your-app.up.railway.app/**`
  - `https://your-app.up.railway.app/auth/callback`

### 2. Test Your Deployment
- Visit your Railway URL
- Test authentication (sign up/login)
- Test receipt scanning
- Test dashboard and budget features

### 3. Monitor Your App
Railway Dashboard provides:
- **Deployments**: View build logs and deployment history
- **Metrics**: CPU, memory, and network usage
- **Logs**: Real-time application logs
- **Observability**: Built-in monitoring

## Resource Limits & Optimization

### Free Tier Limits:
- **CPU**: Shared
- **Memory**: 512MB - 8GB (auto-scales based on usage)
- **Execution Time**: 500 hours/month with $5 credit
- **Build Time**: Up to 30 minutes

### Developer Plan ($5/month + usage):
- **CPU**: Shared
- **Memory**: Up to 8GB
- **Unlimited execution hours** (pay for what you use)
- **Priority builds**

### Optimizing Costs:
1. **Use sleep mode** for development projects (auto-sleeps after inactivity)
2. **Monitor usage** in Railway dashboard
3. **Set usage limits** to avoid surprises
4. **Use caching** to reduce build times

## Comparison: Railway vs Vercel

| Feature | Railway | Vercel |
|---------|---------|--------|
| **Architecture** | Traditional Node.js server | Serverless functions |
| **Google Vision SDK** | ✅ Works perfectly | ❌ Requires REST API migration |
| **Memory Limit** | Up to 8GB | 1GB (Free), 3GB (Pro) |
| **Function Timeout** | No limit (server) | 10s (Free), 60s (Pro) |
| **WebSockets** | ✅ Full support | ⚠️ Limited |
| **Persistent Storage** | ✅ Available | ❌ No (ephemeral) |
| **Database** | ✅ Included PostgreSQL | ❌ Separate service |
| **Free Tier** | $5 credit/month | 100GB bandwidth |
| **Build Time** | Up to 30 minutes | 45 minutes |
| **Cold Starts** | ❌ No (always running) | ✅ Yes (serverless) |
| **Cost** | Pay for uptime | Pay for invocations |

## Environment Variable Management

### Setting Variables in Railway Dashboard:
1. Click on your service
2. Go to "Variables" tab
3. Click "New Variable"
4. Add key and value
5. Railway auto-redeploys on variable changes

### Using Railway CLI:
```bash
# Set a single variable
railway variables set KEY=value

# Set multiple variables from .env file
railway variables set -f .env.local

# List all variables
railway variables

# Delete a variable
railway variables delete KEY
```

## Continuous Deployment

Railway automatically deploys when you push to your connected GitHub branch:

1. **Push to GitHub**:
   ```bash
   git push origin main
   ```

2. **Automatic Build & Deploy**:
   - Railway detects the push
   - Runs `npm run build`
   - Deploys the new version
   - Zero-downtime deployment

### Configure Auto-Deploy:
- Go to your service settings
- "Service" → "Source"
- Choose branch to deploy from
- Enable/disable auto-deploys

## Custom Domains

### Add Custom Domain:
1. Go to service "Settings" → "Domains"
2. Click "Custom Domain"
3. Enter your domain name
4. Add DNS records to your domain provider:
   ```
   Type: CNAME
   Name: @ or subdomain
   Value: <your-project>.up.railway.app
   ```
5. Wait for DNS propagation (can take up to 48 hours)

### SSL Certificates:
- Railway automatically provisions SSL certificates
- HTTPS enabled by default
- Auto-renewal

## Troubleshooting

### Build Fails

**Check Build Logs**:
1. Go to "Deployments"
2. Click on failed deployment
3. View logs to see error

**Common Issues**:
- Missing environment variables
- Insufficient memory (upgrade plan)
- Build timeout (optimize build process)

### App Not Starting

**Check Application Logs**:
1. Go to "Observability" → "Logs"
2. Look for error messages

**Common Issues**:
- Port configuration (Railway sets PORT env variable)
- Missing dependencies
- Database connection errors

### High Memory Usage

Railway auto-scales memory, but you can optimize:
1. **Reduce bundle size**: Run `npm run build:analyze`
2. **Enable compression**: Already configured in `next.config.js`
3. **Optimize images**: Use Next.js Image component
4. **Cache responses**: Implement caching strategies

### Memory Limit Exceeded

If you hit memory limits:
1. **Upgrade plan** for higher limits
2. **Optimize code** to use less memory
3. **Use external services** for heavy tasks (e.g., image processing)

## Advanced Configuration

### Health Checks:
Railway automatically pings your app. To customize:
```json
{
  "healthcheck": {
    "path": "/api/health",
    "interval": 30
  }
}
```

### Build Cache:
Railway caches dependencies between builds:
- Faster subsequent deployments
- Automatic cache invalidation when needed

### Horizontal Scaling:
For high traffic (paid plans):
1. Go to "Settings" → "Scaling"
2. Enable horizontal scaling
3. Set min/max replicas

## Database Integration (Optional)

Railway includes PostgreSQL. If you want to add it:

1. **Add PostgreSQL Service**:
   - In your project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway provisions a database

2. **Get Connection String**:
   - Click on PostgreSQL service
   - Copy connection URL

3. **Update Your App**:
   - Add `DATABASE_URL` environment variable
   - Configure your ORM (if using)

## Migration from Vercel

If you're currently on Vercel:

1. **Deploy to Railway** (follow steps above)
2. **Test thoroughly** on Railway URL
3. **Update DNS** to point to Railway
4. **Monitor** for 24-48 hours
5. **Delete Vercel deployment** (optional)

## CLI Commands Reference

```bash
# Login to Railway
railway login

# Initialize new project
railway init

# Link to existing project
railway link

# Deploy current directory
railway up

# View logs
railway logs

# Open project in browser
railway open

# Run commands in Railway environment
railway run npm run migrate

# Connect to PostgreSQL (if using)
railway connect postgres

# View service status
railway status

# Environment variables
railway variables              # List all
railway variables set KEY=val  # Set variable
railway variables delete KEY   # Delete variable
```

## Best Practices

1. **Use Environment Variables**: Never commit secrets to git
2. **Enable GitHub Integration**: For automatic deployments
3. **Monitor Usage**: Check Railway dashboard regularly
4. **Set Up Logging**: Use Railway's logging or integrate Sentry
5. **Use Staging Environment**: Create a staging service for testing
6. **Database Backups**: If using Railway PostgreSQL, enable backups
7. **Health Checks**: Implement `/api/health` endpoint
8. **Rate Limiting**: Implement rate limiting for API routes

## Support & Resources

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Railway Status**: https://status.railway.app
- **Community Templates**: https://railway.app/templates

## Quick Comparison: When to Use What?

### Use Railway if:
- You need Google Cloud Vision SDK
- You need long-running processes
- You want WebSocket support
- You prefer traditional server architecture
- You need more than 3GB memory
- You want included PostgreSQL database

### Use Vercel if:
- You want edge deployment globally
- You prefer serverless architecture
- Your app fits within serverless limits
- You want the fastest possible cold starts
- You're using Vercel's ecosystem (Analytics, etc.)

---

## Ready to Deploy?

1. ✅ Push your code to GitHub (already done!)
2. ✅ Sign up for Railway
3. ✅ Connect your GitHub repo
4. ✅ Add environment variables
5. ✅ Deploy!

Your app is already configured and ready for Railway deployment!
