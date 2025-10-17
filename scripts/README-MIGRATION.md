# Database Migration Scripts

## Fix Uncategorized Items

This script automatically categorizes all items in your database that don't have a `category_id`.

### What It Does

1. **Finds uncategorized items** - Queries all items where `category_id` is `NULL`
2. **Auto-categorizes** - Uses the enhanced categorization engine with:
   - **Cache lookups** - Instant results for known products
   - **Rule-based matching** - 200+ Bulgarian product keywords
   - **Store patterns** - LIDL, Kaufland, Billa-specific rules
   - **AI fallback** - GPT-4o-mini for unknown items
3. **Updates database** - Sets proper `category_id` for each item
4. **Reports statistics** - Shows category breakdown and method usage

### Prerequisites

Make sure you have:
- `.env.local` file with Supabase credentials:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```
- OpenAI API key (for AI fallback):
  ```
  OPENAI_API_KEY=your_openai_key
  ```

### How to Run

**Method 1: Using npm script (recommended)**
```bash
npm run migrate:fix-categories
```

**Method 2: Direct execution**
```bash
npx dotenv-cli -e .env.local -- npx tsx scripts/fix-uncategorized-items.ts
```

**Method 3: Manual**
```bash
# Load environment variables first
set NEXT_PUBLIC_SUPABASE_URL=your_url
set SUPABASE_SERVICE_ROLE_KEY=your_key
set OPENAI_API_KEY=your_key

# Run the script
npx tsx scripts/fix-uncategorized-items.ts
```

### Example Output

```
🔧 Starting Uncategorized Items Migration

================================================================================

📡 Verifying database connection...
✅ Database connection successful

🏷️  Checking categories in database...
✅ Found 7 categories in database
   - Основни храни (basic_foods)
   - Готови храни (ready_meals)
   - Снакове (snacks)
   - Напитки (drinks)
   - Домакински (household)
   - Лична хигиена (personal_care)
   - Други (other)

🔍 Fetching uncategorized items...
📦 Found 1,234 uncategorized items to process

⚙️  Starting categorization process...

   Progress: 10/1234 (0.8%) | Fixed: 10 | Failed: 0 | Time: 2.3s
   Progress: 20/1234 (1.6%) | Fixed: 20 | Failed: 0 | Time: 4.1s
   ...
   Progress: 1234/1234 (100.0%) | Fixed: 1230 | Failed: 4 | Time: 156.2s

================================================================================

📊 MIGRATION STATISTICS

Total Items Processed: 1234
Successfully Fixed: 1230 (99.7%)
Failed: 4 (0.3%)
Total Time: 156.23s
Average Time per Item: 0.127s

📂 Category Breakdown:

🍎 Основни храни: 654 (53.2%)
   Methods: rule: 620, cache: 34

🥤 Напитки: 245 (19.9%)
   Methods: rule: 230, cache: 15

🍿 Снакове: 156 (12.7%)
   Methods: rule: 145, ai: 11

🧹 Домакински: 89 (7.2%)
   Methods: rule: 85, ai: 4

🧴 Лична хигиена: 67 (5.4%)
   Methods: rule: 60, ai: 7

🍕 Готови храни: 14 (1.1%)
   Methods: rule: 10, ai: 4

📦 Други: 5 (0.4%)
   Methods: ai: 5

🎯 Categorization Methods:

   rule: 1150 (93.5%)
   cache: 49 (4.0%)
   ai: 31 (2.5%)

🔍 Verifying results...
✅ Remaining uncategorized items: 4

================================================================================

✅ MIGRATION COMPLETE!

⚠️  Warning: 4 items failed to update. Please review the logs above.

👋 Migration script finished
```

### Performance

- **Processing speed**: ~0.1-0.2s per item (with cache)
- **Batch size**: 10 items per batch (configurable)
- **Rate limiting**: 100ms delay between batches
- **Memory usage**: ~50MB for 10,000 items

### Categories

The script maps items to these categories:

| Icon | Category | Bulgarian Name | ID |
|------|----------|----------------|-----|
| 🍎 | Basic Foods | Основни храни | `basic_foods` |
| 🍕 | Ready Meals | Готови храни | `ready_meals` |
| 🍿 | Snacks | Снакове | `snacks` |
| 🥤 | Drinks | Напитки | `drinks` |
| 🧹 | Household | Домакински | `household` |
| 🧴 | Personal Care | Лична хигиена | `personal_care` |
| 📦 | Other | Други | `other` |

### Troubleshooting

**Error: "Missing credentials"**
- Make sure `.env.local` exists and has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Use the npm script: `npm run migrate:fix-categories`

**Error: "Database connection failed"**
- Check your Supabase URL and service role key
- Verify your Supabase project is running
- Check if the `items` table exists

**High AI usage (expensive)**
- Most items should use rule-based matching (free)
- AI is only used as fallback for unknown items
- If AI usage is >10%, consider adding more keywords to `KEYWORD_RULES`

**Items still uncategorized after migration**
- Check the error messages in the output
- Common causes: network errors, rate limiting, invalid data
- Re-run the script to retry failed items

### Safety

✅ **Safe to run multiple times** - Only processes items where `category_id IS NULL`
✅ **No data loss** - Only updates the `category_id` field
✅ **Batch processing** - Prevents overwhelming the database
✅ **Progress tracking** - Shows real-time progress
✅ **Error handling** - Continues processing even if some items fail

### Advanced Usage

**Dry run mode** (just report, don't update):
```typescript
// In the script, comment out the update line:
// const { error: updateError } = await supabase...
```

**Process specific receipts only**:
```typescript
// Add filter:
.in('receipt_id', ['receipt-id-1', 'receipt-id-2'])
```

**Custom batch size** (for slower connections):
```typescript
const batchSize = 5; // Instead of 10
```

### Support

If you encounter issues:
1. Check the output logs for specific error messages
2. Verify your environment variables
3. Test with a small batch first (modify the limit in the script)
4. Check Supabase dashboard for any database issues

---

**Last Updated**: 2025-01-09
**Script Version**: 1.0.0
**Compatible with**: Receipt Processing App v1.0+
