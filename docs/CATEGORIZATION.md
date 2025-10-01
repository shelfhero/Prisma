# Intelligent Auto-Categorization System

An intelligent, continuously-improving categorization engine for Bulgarian grocery products.

## Overview

The categorization system automatically classifies receipt items into meaningful categories using a multi-tiered approach:

1. **User Corrections** (100% confidence) - Learns from user's manual corrections
2. **Rule-Based Matching** (95% confidence) - Extensive Bulgarian keyword database
3. **Store-Specific Patterns** (85% confidence) - Brand recognition for LIDL, Kaufland, Billa
4. **AI Fallback** (70-90% confidence) - OpenAI GPT-4o-mini for unknown products
5. **Default Categorization** (0% confidence) - "Other" category when nothing matches

## Categories

- 🍎 **Основни храни** (Basic Foods) - Meat, dairy, bread, vegetables, fruits, staples
- 🍕 **Готови храни** (Ready Meals) - Pizza, sandwiches, prepared foods
- 🍿 **Снакове** (Snacks) - Chips, cookies, chocolate, dried fruits
- 🥤 **Напитки** (Drinks) - Water, juice, coffee, tea, alcohol
- 🧹 **Домакински** (Household) - Cleaning products, detergents, paper products
- 🧴 **Лична хигиена** (Personal Care) - Shampoo, soap, cosmetics
- 📦 **Други** (Other) - Uncategorized items

## Features

### 1. Rule-Based Categorization

Uses extensive Bulgarian keyword matching:

```typescript
// Example: Automatically categorizes "сирене" as "Основни храни"
const result = await categorizeProduct('сирене бяло');
// Returns: { category_id: 'basic_foods', confidence: 0.95, method: 'rule' }
```

### 2. Store-Specific Patterns

Recognizes store brands:

```typescript
// LIDL brands: MILBONA (dairy), PIRATO (snacks), SOLEVITA (drinks)
// Kaufland brands: K-CLASSIC, K-BIO
// Billa brands: CLEVER, BILLA BIO
```

### 3. AI Fallback

For unknown products, uses OpenAI to intelligently categorize:

```typescript
// Example: Unknown Bulgarian product
const result = await categorizeProduct('киселини вкисо');
// AI analyzes and returns best-fit category
```

### 4. Learning System

Improves over time from user corrections:

```typescript
// User corrects a product category
await saveUserCorrection('хрупкави пурички', 'snacks', userId);

// Next time, system remembers:
const result = await categorizeProduct('хрупкави пурички', storeName, userId);
// Returns: { category_id: 'snacks', confidence: 1.0, method: 'user_correction' }
```

## Database Schema

### Items Table (Enhanced)

```sql
ALTER TABLE items ADD COLUMN category_id TEXT;
ALTER TABLE items ADD COLUMN category_name TEXT;
ALTER TABLE items ADD COLUMN category_confidence NUMERIC(3,2);
ALTER TABLE items ADD COLUMN category_method TEXT;
```

### Categorization Corrections Table

```sql
CREATE TABLE categorization_corrections (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  product_name TEXT NOT NULL,
  product_name_normalized TEXT NOT NULL,
  category_id TEXT NOT NULL,
  created_at TIMESTAMP
);
```

## API Endpoints

### 1. Manual Correction

```bash
POST /api/categorize/correct
{
  "itemId": "uuid",
  "productName": "продукт",
  "categoryId": "basic_foods"
}
```

### 2. Get Available Categories

```bash
GET /api/categorize/correct
```

Returns all available categories with icons and colors.

### 3. Categorization Statistics

```bash
GET /api/categorize/stats
```

Returns user's categorization breakdown, accuracy metrics, and method distribution.

## Usage in Receipt Processing

Automatically integrated into the receipt processing pipeline:

```typescript
// In ultimate-receipt-processor.ts
async processReceipt(imageBuffer: Buffer) {
  // ... OCR and extraction ...

  // STEP 5: Auto-categorize all items
  const categorizedReceipt = await this.categorizeItems(receipt);

  return categorizedReceipt; // Items now include category data
}
```

## Setup Instructions

### 1. Run Database Migrations

```bash
# Add category fields to items table
psql -f scripts/add-item-category-fields.sql

# Create corrections table
psql -f scripts/create-categorization-corrections-table.sql
```

Or run in Supabase SQL Editor.

### 2. Environment Variables

Ensure OpenAI API key is configured:

```env
OPENAI_API_KEY=sk-...
```

### 3. Test the System

Upload a receipt and check the categorization:

```bash
# Items will automatically have category data
{
  "name": "Мляко прясно",
  "category_id": "basic_foods",
  "category_name": "Основни храни",
  "category_confidence": 0.95,
  "category_method": "rule"
}
```

## Performance

- **Rule matching**: <1ms per item
- **Store patterns**: <1ms per item
- **AI categorization**: ~200ms per item (cached after first use)
- **User corrections**: <5ms database lookup

## Accuracy Metrics

Expected accuracy rates:

- Known products (rules): 95%+
- Store brands: 85%+
- AI-categorized: 70-90%
- Overall: 85%+

Improves over time as users make corrections.

## Future Improvements

1. **Batch AI Processing** - Categorize multiple items in one API call
2. **Community Learning** - Share anonymized corrections across users
3. **Multi-language Support** - Add English product names
4. **Receipt-Level Context** - Use store type to improve accuracy
5. **Price-Based Hints** - Use price ranges as categorization signals

## Monitoring

Check categorization performance:

```typescript
import { getCategorizationStats } from '@/lib/categorization-engine';

const stats = getCategorizationStats();
console.log('Cache size:', stats.cacheSize);
console.log('Categories:', stats.categories.length);
```

## Troubleshooting

**Items not categorizing:**
- Check OpenAI API key is valid
- Verify database migrations ran successfully
- Check console logs for categorization attempts

**Low accuracy:**
- More user corrections improve the system
- Check if product names are in Bulgarian
- Review AI categorization confidence scores

**Performance issues:**
- AI calls are cached - first categorization is slower
- Consider batch processing for multiple items
- Check database indexes are created

## Contributing

To add new keywords or categories:

1. Edit `lib/categorization-engine.ts`
2. Add keywords to `KEYWORD_RULES` object
3. Test with sample products
4. Submit PR with examples

Example:

```typescript
const KEYWORD_RULES = {
  basic_foods: [
    'месо', 'пилешко', 'свинско', // existing
    'новпродукт', 'ново', // your additions
  ],
};
```
