-- ============================================
-- FIX ADMIN METRICS FUNCTIONS
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: Add missing columns to receipts table if they don't exist
DO $$
BEGIN
  -- Add processing_status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'receipts' AND column_name = 'processing_status'
  ) THEN
    ALTER TABLE receipts ADD COLUMN processing_status VARCHAR(20) DEFAULT 'completed' CHECK (
      processing_status IN ('pending', 'processing', 'completed', 'failed', 'manual')
    );
  END IF;
END $$;

-- STEP 2: Drop existing functions if they exist (to recreate them fresh)
DROP FUNCTION IF EXISTS get_system_metrics();
DROP FUNCTION IF EXISTS get_top_stores(INTEGER);
DROP FUNCTION IF EXISTS get_category_spending();

-- STEP 3: Create get_system_metrics function
CREATE OR REPLACE FUNCTION get_system_metrics()
RETURNS JSONB AS $$
DECLARE
  v_total_users INTEGER;
  v_active_users_7d INTEGER;
  v_new_users_today INTEGER;
  v_total_receipts INTEGER;
  v_receipts_today INTEGER;
  v_success_rate NUMERIC;
  v_avg_receipts_per_user NUMERIC;
  v_avg_receipt_value NUMERIC;
BEGIN
  -- Total users
  SELECT COUNT(*) INTO v_total_users FROM auth.users;

  -- Active users in last 7 days
  SELECT COUNT(DISTINCT user_id) INTO v_active_users_7d
  FROM receipts
  WHERE created_at >= NOW() - INTERVAL '7 days';

  -- New users today
  SELECT COUNT(*) INTO v_new_users_today
  FROM auth.users
  WHERE created_at >= CURRENT_DATE;

  -- Total receipts
  SELECT COUNT(*) INTO v_total_receipts FROM receipts;

  -- Receipts today
  SELECT COUNT(*) INTO v_receipts_today
  FROM receipts
  WHERE created_at >= CURRENT_DATE;

  -- Success rate (last 30 days) - using processing_status
  SELECT ROUND(
    COALESCE(
      (COUNT(*) FILTER (WHERE processing_status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0) * 100),
      0
    )::NUMERIC,
    2
  ) INTO v_success_rate
  FROM receipts
  WHERE created_at >= NOW() - INTERVAL '30 days';

  -- Average receipts per user
  SELECT ROUND(
    COALESCE(
      (COUNT(*)::DECIMAL / NULLIF(v_total_users, 0)),
      0
    )::NUMERIC,
    2
  ) INTO v_avg_receipts_per_user
  FROM receipts;

  -- Average receipt value
  SELECT ROUND(COALESCE(AVG(total_amount), 0)::NUMERIC, 2) INTO v_avg_receipt_value
  FROM receipts
  WHERE total_amount IS NOT NULL;

  -- Return as JSONB
  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'active_users_7d', v_active_users_7d,
    'new_users_today', v_new_users_today,
    'total_receipts', v_total_receipts,
    'receipts_today', v_receipts_today,
    'success_rate', v_success_rate,
    'avg_receipts_per_user', v_avg_receipts_per_user,
    'avg_receipt_value', v_avg_receipt_value
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Create get_top_stores function
CREATE OR REPLACE FUNCTION get_top_stores(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  merchant_name TEXT,
  receipt_count BIGINT,
  total_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(ret.name, 'Unknown')::TEXT as merchant_name,
    COUNT(*)::BIGINT as receipt_count,
    ROUND(COALESCE(SUM(r.total_amount), 0)::NUMERIC, 2) as total_amount
  FROM receipts r
  LEFT JOIN retailers ret ON r.retailer_id = ret.id
  GROUP BY ret.name
  ORDER BY receipt_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Create get_category_spending function
CREATE OR REPLACE FUNCTION get_category_spending()
RETURNS TABLE (
  category TEXT,
  receipt_count BIGINT,
  total_amount NUMERIC,
  avg_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(cat.name, 'Uncategorized')::TEXT as category,
    COUNT(DISTINCT i.receipt_id)::BIGINT as receipt_count,
    ROUND(COALESCE(SUM(i.total_price), 0)::NUMERIC, 2) as total_amount,
    ROUND(COALESCE(AVG(i.total_price), 0)::NUMERIC, 2) as avg_amount
  FROM items i
  LEFT JOIN categories cat ON i.category_id = cat.id
  GROUP BY cat.name
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: Test the functions
SELECT 'Testing get_system_metrics...' as test;
SELECT get_system_metrics();

SELECT 'Testing get_top_stores...' as test;
SELECT * FROM get_top_stores(5);

SELECT 'Testing get_category_spending...' as test;
SELECT * FROM get_category_spending();

SELECT '✅ All functions created and tested successfully!' as result;
