# IMPORTANT: Run This SQL Migration

The price comparison page needs these database functions to work properly.

## Steps:

1. **Open Supabase SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/eisfwocfkejsxipmbyzp/sql
   - Click "New Query"

2. **Copy the SQL below** and paste it into the editor

3. **Click "Run"** to execute

---

## SQL to Run:

```sql
-- Function to get user's top products
CREATE OR REPLACE FUNCTION get_user_top_products(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 15
)
RETURNS TABLE (
  master_product_id INTEGER,
  normalized_name TEXT,
  brand TEXT,
  size NUMERIC,
  unit TEXT,
  category_name TEXT,
  purchase_count BIGINT,
  last_purchased TIMESTAMPTZ,
  avg_user_paid NUMERIC,
  cheapest_price NUMERIC,
  most_expensive_price NUMERIC,
  potential_savings NUMERIC,
  cheapest_store TEXT,
  prices JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH user_purchases AS (
    SELECT
      i.master_product_id,
      COUNT(*) as purchase_count,
      MAX(r.purchased_at) as last_purchased,
      AVG(i.unit_price) as avg_user_paid
    FROM items i
    JOIN receipts r ON i.receipt_id = r.id
    WHERE r.user_id = p_user_id
      AND i.master_product_id IS NOT NULL
      AND r.purchased_at >= NOW() - INTERVAL '60 days'
    GROUP BY i.master_product_id
    HAVING COUNT(*) >= 2
  ),
  current_prices_agg AS (
    SELECT
      cp.master_product_id,
      MIN(cp.unit_price) as cheapest_price,
      MAX(cp.unit_price) as most_expensive_price,
      (
        SELECT ret.name
        FROM current_prices cp2
        JOIN retailers ret ON cp2.retailer_id = ret.id
        WHERE cp2.master_product_id = cp.master_product_id
        ORDER BY cp2.unit_price ASC
        LIMIT 1
      ) as cheapest_store
    FROM current_prices cp
    WHERE cp.master_product_id IN (SELECT master_product_id FROM user_purchases)
    GROUP BY cp.master_product_id
  )
  SELECT
    mp.id as master_product_id,
    mp.normalized_name,
    mp.brand,
    mp.size,
    mp.unit,
    c.name as category_name,
    up.purchase_count,
    up.last_purchased,
    ROUND(up.avg_user_paid::numeric, 2) as avg_user_paid,
    ROUND(cpa.cheapest_price::numeric, 2) as cheapest_price,
    ROUND(cpa.most_expensive_price::numeric, 2) as most_expensive_price,
    ROUND((up.avg_user_paid - cpa.cheapest_price)::numeric, 2) as potential_savings,
    cpa.cheapest_store,
    (
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'store', ret.name,
          'price', ROUND(cp.unit_price::numeric, 2),
          'last_seen', cp.seen_at
        ) ORDER BY cp.unit_price ASC
      )
      FROM current_prices cp
      JOIN retailers ret ON cp.retailer_id = ret.id
      WHERE cp.master_product_id = mp.id
    ) as prices
  FROM user_purchases up
  JOIN master_products mp ON up.master_product_id = mp.id
  JOIN categories c ON mp.category_id = c.id
  JOIN current_prices_agg cpa ON mp.id = cpa.master_product_id
  WHERE cpa.cheapest_price IS NOT NULL
  ORDER BY
    up.purchase_count DESC,
    (up.avg_user_paid - cpa.cheapest_price) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get popular products
CREATE OR REPLACE FUNCTION get_popular_products(
  p_limit INTEGER DEFAULT 15
)
RETURNS TABLE (
  master_product_id INTEGER,
  normalized_name TEXT,
  brand TEXT,
  size NUMERIC,
  unit TEXT,
  category_name TEXT,
  unique_buyers BIGINT,
  total_purchases BIGINT,
  avg_price NUMERIC,
  cheapest_price NUMERIC,
  most_expensive_price NUMERIC,
  cheapest_store TEXT,
  prices JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH popular_products AS (
    SELECT
      i.master_product_id,
      COUNT(DISTINCT r.user_id) as unique_buyers,
      COUNT(*) as total_purchases,
      AVG(i.unit_price) as avg_price
    FROM items i
    JOIN receipts r ON i.receipt_id = r.id
    WHERE i.master_product_id IS NOT NULL
      AND r.purchased_at >= NOW() - INTERVAL '30 days'
    GROUP BY i.master_product_id
    HAVING COUNT(DISTINCT r.user_id) >= 2
    ORDER BY unique_buyers DESC, total_purchases DESC
    LIMIT p_limit * 2
  )
  SELECT
    mp.id as master_product_id,
    mp.normalized_name,
    mp.brand,
    mp.size,
    mp.unit,
    c.name as category_name,
    pp.unique_buyers,
    pp.total_purchases,
    ROUND(pp.avg_price::numeric, 2) as avg_price,
    ROUND(MIN(cp.unit_price)::numeric, 2) as cheapest_price,
    ROUND(MAX(cp.unit_price)::numeric, 2) as most_expensive_price,
    (
      SELECT ret.name
      FROM current_prices cp2
      JOIN retailers ret ON cp2.retailer_id = ret.id
      WHERE cp2.master_product_id = mp.id
      ORDER BY cp2.unit_price ASC
      LIMIT 1
    ) as cheapest_store,
    (
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'store', ret.name,
          'price', ROUND(cp.unit_price::numeric, 2),
          'last_seen', cp.seen_at
        ) ORDER BY cp.unit_price ASC
      )
      FROM current_prices cp
      JOIN retailers ret ON cp.retailer_id = ret.id
      WHERE cp.master_product_id = mp.id
    ) as prices
  FROM popular_products pp
  JOIN master_products mp ON pp.master_product_id = mp.id
  JOIN categories c ON mp.category_id = c.id
  JOIN current_prices cp ON mp.id = cp.master_product_id
  GROUP BY mp.id, mp.normalized_name, mp.brand, mp.size, mp.unit,
           c.name, pp.unique_buyers, pp.total_purchases, pp.avg_price
  ORDER BY pp.unique_buyers DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_top_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_products TO anon;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_user_product
  ON items(receipt_id, master_product_id)
  WHERE master_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_receipts_user_date
  ON receipts(user_id, purchased_at DESC);

CREATE INDEX IF NOT EXISTS idx_current_prices_product_price
  ON current_prices(master_product_id, unit_price);
```

---

## After Running:

1. Refresh the price comparison page
2. You should see your personalized top products with savings!
3. Check the browser console - errors should be gone

## Troubleshooting:

If you get an error about tables not existing:
- Check if you have `current_prices` table
- If not, you may need to run price normalization first
