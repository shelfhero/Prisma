# Railway Deployment Guide

## Upload Receipt Fix - Environment Variables Configuration

### Problems Fixed
1. ✅ **Google Cloud Vision credentials** - File path doesn't work in containerized deployments
2. ✅ **File API not available** - `File` class doesn't exist in Node.js runtime

### Solutions Applied
1. Use `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable (JSON string instead of file path)
2. Updated code to use `FileWithMetadata` interface compatible with Node.js runtime

---

## Required Environment Variables for Railway

### 1. Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://eisfwocfkejsxipmbyzp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpc2Z3b2Nma2Vqc3hpcG1ieXpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyOTg0MjQsImV4cCI6MjA3Mzg3NDQyNH0.-Vh7Gxm45PU6pGajd5QSINgtKK1fqIvX9LXJx9pRK_c
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpc2Z3b2Nma2Vqc3hpcG1ieXpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODI5ODQyNCwiZXhwIjoyMDczODc0NDI0fQ.Gkxd_S6__EgftarRLenFpkA-QRR1BmJI1OHaU_U0MNQ
```

### 2. OpenAI API Configuration
```
OPENAI_API_KEY=your-openai-api-key-here
```
(Get from .env.local file)

### 3. Google Cloud Vision API Configuration (CRITICAL FIX)

**Option A: Using JSON String (Recommended for Railway)**
```
GOOGLE_CLOUD_PROJECT_ID=prisma-receipt-parser
GOOGLE_APPLICATION_CREDENTIALS_JSON=<paste-the-entire-json-from-google-vision-api-json-file>
```

**To get the JSON value:**
1. Open `google vision api json/prisma-receipt-parser-615e2aca0427.json`
2. Copy the ENTIRE contents (it's one long JSON object)
3. Paste it as the value for `GOOGLE_APPLICATION_CREDENTIALS_JSON` in Railway
4. Make sure it's all on one line (Railway will handle it correctly)

**Option B: Using API Key (Simpler but less recommended)**
```
GOOGLE_CLOUD_PROJECT_ID=prisma-receipt-parser
GOOGLE_CLOUD_API_KEY=your-api-key-here
```

### 4. Sentry Configuration (Optional)
```
NEXT_PUBLIC_SENTRY_DSN=https://0c95e3ef9015ceba2ea78c510bb9dd0c@o4510135878418432.ingest.de.sentry.io/4510135893229648
SENTRY_ORG=shelfhero
SENTRY_PROJECT=prisma-grocery-app
```

### 5. Other Settings
```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app-name.railway.app
```

---

## Step-by-Step Instructions for Railway

### 1. Go to your Railway project dashboard

### 2. Navigate to Variables tab

### 3. Add all the environment variables listed above

**Important notes:**
- For `GOOGLE_APPLICATION_CREDENTIALS_JSON`, copy the entire JSON content from the file and paste it as a single-line string (the newlines in the private_key are preserved with `\n`)
- Make sure to remove `GOOGLE_APPLICATION_CREDENTIALS` if it exists (the file path version won't work)
- Double-check that all values are correct (no extra spaces, quotes, etc.)

### 4. Redeploy your application

After setting the environment variables, Railway should automatically redeploy. If not, trigger a manual deployment.

### 5. Test the upload receipt function

Try uploading a receipt through your app. Check the Railway logs to confirm:
- ✅ "Using Google Cloud credentials from JSON environment variable"
- ✅ Receipt processing completes successfully

---

## Troubleshooting

### Issue: "Google Cloud Vision not configured"
- Make sure `GOOGLE_APPLICATION_CREDENTIALS_JSON` is set correctly
- Verify the JSON is valid (you can test by parsing it locally)
- Check Railway logs for detailed error messages

### Issue: "Invalid Google Cloud credentials JSON"
- Ensure the JSON is properly formatted
- Make sure there are no extra quotes or escaping issues
- The private_key should have `\n` for newlines, not actual line breaks

### Issue: Receipt upload still fails
- Check Supabase storage bucket configuration
- Verify the `receipt-images` storage bucket exists in Supabase
- Check Railway logs for specific error messages
- Ensure all Supabase environment variables are correct

---

## Local Development

For local development, you can continue using the file-based approach in `.env.local`:

```
GOOGLE_APPLICATION_CREDENTIALS=C:\Projects\01. Receipt app\google vision api json\prisma-receipt-parser-615e2aca0427.json
```

The code now supports both methods:
- **File path** (`GOOGLE_APPLICATION_CREDENTIALS`) - for local development
- **JSON string** (`GOOGLE_APPLICATION_CREDENTIALS_JSON`) - for Railway/cloud deployments
