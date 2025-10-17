# Product Normalization System for Призма

## Overview

A comprehensive system that enables price comparison across retailers by normalizing product names and tracking prices over time.

## Database Schema

### Tables Created

1. **master_products** - Normalized product reference database
   - Unique normalized product names
   - Brand, size, unit extraction
   - Category linking
   - Keyword indexing for fast search

2. **product_aliases** - Retailer-specific product variations
   - Maps retailer product names to master products
   - Example: "VEREIA MLEKO 3.6% 1L" (Kaufland) → Master Product ID #42

3. **price_history** - Complete price tracking
   - Every price observation with timestamp
   - Linked to receipts for auditing
   - Location tracking for regional pricing

4. **current_prices** - Materialized view for fast lookups
   - Latest price per product per retailer
   - Automatically updated

5. **price_comparison** - View for instant comparisons
   - Calculates rankings, averages, min/max
   - Shows savings percentages

## Features

### 1. Automatic Product Normalization

When a receipt is processed:
```
Raw OCR: "VEREIA MLEKO 3,6% 1л"
↓
Normalized: "Мляко Прясно Верея 3.6л"
↓
Master Product ID: 42
```

**Extraction:**
- **Brand**: Верея, Милковия, Бор Чвор, etc.
- **Size & Unit**: 1л, 500мл, 2кг, 100г
- **Fat Content**: 3.6% (for dairy)
- **Keywords**: ["мляко", "прясно", "верея"]

### 2. Fuzzy Matching

Uses Jaccard similarity to match variations:
- Confidence scores (0-1)
- Handles OCR errors
- Case-insensitive
- Cyrillic-aware

### 3. Price Tracking

Automatically records:
- Unit price
- Total price
- Quantity
- Date/time
- Location
- Source receipt

### 4. Price Comparison API

**Endpoints:**

```javascript
// Compare prices across retailers
GET /api/products/compare?product_id=42

Response:
{
  "product": { "normalized_name": "Мляко Прясно Верея 3.6л" },
  "prices": [
    { "retailer": "Lidl", "price": 3.29, "rank": 1, "savings": 8.4% },
    { "retailer": "Kaufland", "price": 3.49, "rank": 2 },
    { "retailer": "BILLA", "price": 3.59, "rank": 3 }
  ],
  "statistics": {
    "min_price": 3.29,
    "avg_price": 3.46,
    "max_price": 3.59,
    "price_range": 0.30
  }
}
```

```javascript
// Search for products
GET /api/products/search?q=мляко

// Get price trends
GET /api/products/trends?product_id=42&days=30

// Optimize shopping list
POST /api/products/optimize-shopping
Body: { "shopping_list": [...] }
```

### 5. UI Components

- **Price Comparison View** - Beautiful comparison interface
- **Savings Insights** - Shows potential savings
- **Retailer Rankings** - Visual price rankings
- **Historical Trends** - Price changes over time

## Integration

### Receipt Processing

Automatically integrated into the receipt upload flow:

```typescript
// When a receipt is processed:
1. OCR extracts items
2. Each item is normalized
3. Master product is created/found
4. Price is recorded in history
5. Materialized view refreshes
```

### Example Flow

```
User uploads receipt from Kaufland
↓
Item: "VEREIA MLEKO 3.6% 1L" - 3.49 лв
↓
Normalization Service:
  - Extract: brand=Верея, size=1, unit=л
  - Normalize: "Мляко Прясно Верея 1л"
  - Find/Create Master Product #42
  - Create alias: Kaufland → "VEREIA MLEKO 3.6% 1L"
↓
Record Price:
  - master_product_id: 42
  - retailer_id: "kaufland-uuid"
  - price: 3.49 лв
  - date: 2025-10-08
↓
User can now compare prices across all retailers
```

## Database Functions

### Normalization Functions

```sql
-- Extract brand from product name
extract_brand(product_name TEXT) → TEXT

-- Extract size and unit
extract_size_unit(product_name TEXT) → (size NUMERIC, unit TEXT)

-- Normalize product name
normalize_product_name(raw_name TEXT) → TEXT

-- Get or create master product
get_or_create_master_product(
  p_raw_name TEXT,
  p_category_id UUID,
  p_retailer_id UUID
) → INTEGER

-- Record price
record_price(
  p_master_product_id INTEGER,
  p_retailer_id UUID,
  p_unit_price NUMERIC,
  ...
) → INTEGER
```

### View Refresh

```sql
-- Refresh current prices
SELECT refresh_current_prices();
```

## Usage Examples

### 1. Find Cheapest Price

```sql
SELECT
  mp.normalized_name,
  r.name as retailer,
  cp.unit_price
FROM master_products mp
JOIN current_prices cp ON mp.id = cp.master_product_id
JOIN retailers r ON cp.retailer_id = r.id
WHERE mp.normalized_name ILIKE '%мляко%'
ORDER BY cp.unit_price ASC
LIMIT 1;
```

### 2. Price Trends

```sql
SELECT
  seen_at,
  unit_price,
  r.name as retailer
FROM price_history ph
JOIN retailers r ON ph.retailer_id = r.id
WHERE master_product_id = 42
ORDER BY seen_at DESC;
```

### 3. Shopping List Optimization

```typescript
const response = await fetch('/api/products/optimize-shopping', {
  method: 'POST',
  body: JSON.stringify({
    shopping_list: [
      { master_product_id: 42, quantity: 2 },
      { master_product_id: 43, quantity: 1 }
    ]
  })
});

// Returns optimal retailers and potential savings
```

## Configuration

### Known Brands

Add to `lib/services/product-normalization.ts`:

```typescript
const KNOWN_BRANDS = [
  'Верея', 'Милковия', 'Бор Чвор', 'Валио',
  // Add more...
];
```

### Retailers

Pre-loaded in migration:
- Kaufland
- BILLA
- Lidl
- Fantastico
- T-Market
- Piccadilly
- CBA

Add more via:
```sql
INSERT INTO retailers (name) VALUES ('New Retailer');
```

## Performance

- **Indexes** on all foreign keys and search fields
- **Materialized view** for instant price lookups
- **GIN index** on keywords array for fast text search
- **Concurrent refresh** to avoid locking

## Future Enhancements

1. **Barcode matching** - More accurate product linking
2. **Regional pricing** - Track prices by city/region
3. **Price alerts** - Notify users of price drops
4. **Shopping route optimization** - Best stores to visit
5. **Product substitutions** - Suggest cheaper alternatives
6. **Historical charts** - Visualize price trends
7. **Bulk price updates** - Weekly price scraping
8. **Machine learning** - Better product matching

## Deployment

### Run Migration

1. Open Supabase SQL Editor
2. Copy contents of `supabase/migrations/020_product_normalization.sql`
3. Execute
4. Verify tables created

### Test

1. Upload a receipt
2. Check console for normalization logs
3. Visit `/price-comparison` to test UI
4. Search for products and compare prices

## API Documentation

Full API docs available at `/api/products/*/route.ts`

## Support

Issues? Check:
1. Migration ran successfully
2. Retailers table has data
3. Items have `master_product_id` set
4. Price history is being populated

---

**Status**: ✅ Production Ready

**Version**: 1.0.0

**Last Updated**: 2025-10-08
