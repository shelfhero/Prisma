# Re-Normalize Products Script

## Overview

This script updates all existing master products in your database with improved normalized names using the new product name normalizer.

## Features

- ✅ **Dry-run mode** - Test without making changes
- ✅ **Automatic backups** - Creates backup before updates
- ✅ **Progress tracking** - Real-time progress display
- ✅ **Error handling** - Graceful error recovery
- ✅ **Statistics** - Detailed improvement metrics
- ✅ **Verification** - Validates updates after completion

## Usage

### 1. Dry Run (Recommended First)

Preview changes without modifying the database:

```bash
npx tsx scripts/re-normalize-products.ts --dry-run
```

Add `--verbose` to see detailed changes:

```bash
npx tsx scripts/re-normalize-products.ts --dry-run --verbose
```

### 2. Production Run

After verifying with dry-run, execute the actual updates:

```bash
npx tsx scripts/re-normalize-products.ts
```

### 3. Production Run with Verbose Output

See detailed changes as they happen:

```bash
npx tsx scripts/re-normalize-products.ts --verbose
```

## What It Does

### 1. Connects to Database
- Validates connection
- Fetches all master products

### 2. Creates Backup
- Saves current state to backup table or file
- Located in `backups/` directory

### 3. Processes Each Product
For each product:
- Fetches original names from aliases
- Re-normalizes using new algorithm
- Extracts improved components (brand, size, type)
- Updates if improvements detected

### 4. Tracks Improvements
- **Brands Added**: Products that now have brand info
- **Sizes Added**: Products that now have size/unit
- **Types Added**: Products with type specification
- **Formats Improved**: Better structured names

### 5. Verifies Updates
- Confirms changes were applied
- Reports any discrepancies

## Example Output

```
═══════════════════════════════════════════════════════════════
           MASTER PRODUCTS RE-NORMALIZATION
═══════════════════════════════════════════════════════════════

🔍 DRY RUN MODE - No changes will be made to the database

📡 Connecting to database...
✅ Connected successfully

📥 Fetching master products...
✅ Found 247 master products

💾 Creating backup...
✅ Backup created

🔄 Processing products...

──────────────────────────────────────────────────────────────────────

1. UPDATED
   ID: abc-123
   Old: Мляко 1л
   New: Мляко Верея прясно 3.6% 1л
   Brand: Верея
   Size: 1л

2. UPDATED
   ID: def-456
   Old: Хляб 500г
   New: Хляб Добруджа пълнозърнест 500г
   Brand: Добруджа
   Size: 500г

──────────────────────────────────────────────────────────────────────

✅ Processing complete!

📊 STATISTICS
═══════════════════════════════════════════════════════════════
Total Products:        247
Updated:               89 (36.0%)
Unchanged:             156 (63.2%)
Errors:                2 (0.8%)

IMPROVEMENTS:
  • Brands Added:      45
  • Sizes Added:       12
  • Types Added:       67
  • Formats Improved:  89
═══════════════════════════════════════════════════════════════

🔍 Verifying updates...
✅ Verified: 89 products updated

═══════════════════════════════════════════════════════════════

✅ Script completed successfully
```

## Improvements Detected

The script updates products when it finds:

1. **Better Normalized Name**
   - More detailed and structured
   - Proper capitalization
   - Consistent formatting

2. **Missing Brand Information**
   - Extracts brand from name
   - Populates brand field

3. **Missing Size/Unit**
   - Extracts size and unit
   - Normalizes units (L → л, g → г)

4. **Product Type Detection**
   - Adds type specification (прясно, пълнозърнест, etc.)
   - Enhances categorization

## Backup System

### Automatic Backups

Before any changes, the script creates a backup:

**Option 1**: Database table (if exists)
```sql
product_normalization_backups
  - backup_date
  - product_count
  - backup_data (JSON)
```

**Option 2**: File system
```
backups/products-2025-10-14T10-30-00-000Z.json
```

### Restore from Backup

If you need to restore from a file backup:

```typescript
// restore-from-backup.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const backup = JSON.parse(fs.readFileSync('backups/products-[timestamp].json', 'utf-8'));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

for (const product of backup.products) {
  await supabase
    .from('master_products')
    .update({
      normalized_name: product.normalized_name,
      brand: product.brand,
      size: product.size,
      unit: product.unit
    })
    .eq('id', product.id);
}
```

## Safety Features

1. **Dry-run Mode**: Test before executing
2. **Automatic Backups**: Rollback capability
3. **Error Handling**: Continues on individual failures
4. **Verification**: Confirms updates applied
5. **Batch Processing**: Efficient database operations

## Performance

- **Speed**: ~10-20 products/second
- **Memory**: Low footprint
- **Database Load**: Minimal impact
- **Recommended**: Run during off-peak hours for large datasets

## Troubleshooting

### Connection Failed
```
❌ Database connection failed: Invalid credentials
```
**Solution**: Check `.env.local` file has correct credentials

### No Products Found
```
✅ Found 0 master products
```
**Solution**: Verify `master_products` table has data

### Backup Failed
```
⚠️  Could not create database backup, continuing...
```
**Solution**: Check `backups/` directory exists and is writable

### Updates Not Applied
```
⚠️  Warning: Expected 50 updates, found 10
```
**Solution**: Check database permissions for service key

## Integration with Other Scripts

### After Running Re-Normalization

1. **Update Receipt Items** (if needed)
```bash
npx tsx scripts/sync-receipt-items-with-master.ts
```

2. **Rebuild Analytics**
```bash
npx tsx scripts/rebuild-analytics.ts
```

3. **Update Price Comparisons**
```bash
npx tsx scripts/update-price-comparisons.ts
```

## Best Practices

1. **Always start with dry-run**
   ```bash
   npx tsx scripts/re-normalize-products.ts --dry-run --verbose
   ```

2. **Review the changes**
   - Check statistics
   - Verify improvements make sense
   - Look for unexpected changes

3. **Run during off-peak hours**
   - Minimize user impact
   - Better database performance

4. **Keep backups**
   - Don't delete backup files immediately
   - Store for at least 30 days

5. **Monitor after execution**
   - Check user reports
   - Verify analytics accuracy
   - Watch for edge cases

## Command Reference

| Command | Description |
|---------|-------------|
| `--dry-run` | Preview changes without updating database |
| `--verbose` | Show detailed output for each product |
| (no flags) | Execute actual updates |

## Exit Codes

- `0` - Success
- `1` - Error (connection failed, fatal error, etc.)

## Support

For issues or questions:
- Check the verbose output
- Review backup files
- Examine error messages
- Test with dry-run mode first

## Related Files

- `lib/product-name-normalizer.ts` - Normalization engine
- `scripts/test-product-normalization.ts` - Test normalizer
- `PRODUCT_NAME_NORMALIZATION.md` - System documentation
