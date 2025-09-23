# Google Cloud Vision API Setup Guide

## Quick Setup (API Key Method - Easiest)

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your Project ID

### Step 2: Enable Vision API
1. Go to [API Library](https://console.cloud.google.com/apis/library)
2. Search for "Vision API"
3. Click "Enable"

### Step 3: Create API Key
1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "API Key"
3. Copy the API key

### Step 4: Update Environment Variables
Edit your `.env.local` file:

```env
# Google Cloud Vision API
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_API_KEY=your-api-key-here
```

### Step 5: Test Integration
1. Restart your development server: `npm run dev`
2. Upload a receipt via "сканирай бележка"
3. Look for message: "🤖 Касовата бележка е прочетена с Google Vision OCR"

## Alternative Setup (Service Account)

If you prefer service account authentication:

1. Create service account in Google Cloud Console
2. Download JSON key file
3. Set environment variable: `GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json`
4. Only set `GOOGLE_CLOUD_PROJECT_ID` in `.env.local`

## Pricing

Google Cloud Vision API pricing:
- **First 1,000 requests/month**: FREE
- **Next 1,000,000 requests**: $1.50 per 1,000 requests
- **Perfect for development and small apps**

## Troubleshooting

### "Google Cloud Vision not configured"
- Check that both `GOOGLE_CLOUD_PROJECT_ID` and `GOOGLE_CLOUD_API_KEY` are set
- Restart development server after changes

### "Authentication failed"
- Verify API key is correct
- Check that Vision API is enabled in your project
- Make sure billing is enabled on your Google Cloud project

### "No text detected"
- Image might be too blurry or low quality
- Try with a clearer receipt image
- Check image file format (PNG, JPG supported)

## What Happens Now

With Google Vision configured:

1. **Real OCR**: Your receipt images are processed by Google's AI
2. **Bulgarian Support**: Handles Bulgarian text and receipts
3. **Smart Parsing**: Extracts retailer, items, prices, and totals
4. **High Accuracy**: Much better than mock data
5. **Fallback Chain**: Google Vision → TabScanner → Mock OCR

The app will automatically use the best available OCR method!