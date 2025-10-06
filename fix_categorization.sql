-- Step 1: See what categories exist in the database
SELECT * FROM categories ORDER BY name;

-- Step 2: See how many items are uncategorized
SELECT
  COUNT(*) as total_items,
  COUNT(category_id) as categorized,
  COUNT(*) - COUNT(category_id) as uncategorized
FROM items;

-- Step 3: Sample of uncategorized items
SELECT
  id,
  product_name,
  category_id,
  total_price
FROM items
WHERE category_id IS NULL
LIMIT 20;

-- Step 4: Sample of categorized items
SELECT
  i.id,
  i.product_name,
  c.name as category_name,
  i.total_price
FROM items i
JOIN categories c ON i.category_id = c.id
LIMIT 20;
