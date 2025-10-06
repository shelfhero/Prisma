-- First, let's see what columns actually exist in the items table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'items'
ORDER BY ordinal_position;

-- Second, let's see what columns exist in categories table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

-- Get all parsed items with their categorizations (using only known columns)
SELECT
  i.id,
  i.product_name,
  i.total_price,
  i.qty,
  i.unit_price,
  cat.name as category_name,
  cat.id as category_id,
  r.total_amount as receipt_total,
  ret.name as store_name,
  i.created_at
FROM items i
LEFT JOIN categories cat ON i.category_id = cat.id
LEFT JOIN receipts r ON i.receipt_id = r.id
LEFT JOIN retailers ret ON r.retailer_id = ret.id
ORDER BY i.created_at DESC
LIMIT 500;

-- Summary by category
SELECT
  COALESCE(cat.name, 'Uncategorized') as category,
  COUNT(*) as item_count,
  ROUND(SUM(i.total_price), 2) as total_spent
FROM items i
LEFT JOIN categories cat ON i.category_id = cat.id
GROUP BY cat.name
ORDER BY item_count DESC;

-- List all available categories (just id and name)
SELECT
  id,
  name
FROM categories
ORDER BY name;
