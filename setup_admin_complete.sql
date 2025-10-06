-- ============================================
-- COMPLETE ADMIN SYSTEM SETUP
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- PART 1: Create admin_audit_log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can insert audit logs" ON admin_audit_log;
CREATE POLICY "System can insert audit logs"
  ON admin_audit_log FOR INSERT
  WITH CHECK (true);

-- PART 2: Create helper functions

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = user_uuid
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check specific admin role
CREATE OR REPLACE FUNCTION has_admin_role(user_uuid UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = user_uuid
    AND role = required_role
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log admin activity
CREATE OR REPLACE FUNCTION log_admin_activity(
  p_admin_id UUID,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_audit_log (
    admin_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get system metrics
CREATE OR REPLACE FUNCTION get_system_metrics()
RETURNS JSONB AS $$
DECLARE
  v_metrics JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'active_users_7d', (
      SELECT COUNT(DISTINCT user_id)
      FROM receipts
      WHERE created_at >= NOW() - INTERVAL '7 days'
    ),
    'new_users_today', (
      SELECT COUNT(*)
      FROM auth.users
      WHERE created_at >= CURRENT_DATE
    ),
    'total_receipts', (SELECT COUNT(*) FROM receipts),
    'receipts_today', (
      SELECT COUNT(*)
      FROM receipts
      WHERE created_at >= CURRENT_DATE
    ),
    'success_rate', (
      SELECT ROUND(
        COALESCE(
          (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL /
          NULLIF(COUNT(*), 0) * 100),
          0
        )::NUMERIC,
        2
      )
      FROM receipts
      WHERE created_at >= NOW() - INTERVAL '30 days'
    ),
    'avg_receipts_per_user', (
      SELECT ROUND(
        COALESCE(
          (COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM auth.users), 0)),
          0
        )::NUMERIC,
        2
      )
      FROM receipts
    ),
    'avg_receipt_value', (
      SELECT ROUND(COALESCE(AVG(total_amount), 0)::NUMERIC, 2)
      FROM receipts
      WHERE total_amount IS NOT NULL
    )
  ) INTO v_metrics;

  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get top stores
CREATE OR REPLACE FUNCTION get_top_stores(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  merchant_name TEXT,
  receipt_count BIGINT,
  total_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.merchant_name,
    COUNT(*)::BIGINT as receipt_count,
    ROUND(COALESCE(SUM(r.total_amount), 0)::NUMERIC, 2) as total_amount
  FROM receipts r
  WHERE r.merchant_name IS NOT NULL
  GROUP BY r.merchant_name
  ORDER BY receipt_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get category spending
CREATE OR REPLACE FUNCTION get_category_spending()
RETURNS TABLE (
  category TEXT,
  receipt_count BIGINT,
  total_amount DECIMAL,
  avg_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(r.category, 'Uncategorized') as category,
    COUNT(*)::BIGINT as receipt_count,
    ROUND(COALESCE(SUM(r.total_amount), 0)::NUMERIC, 2) as total_amount,
    ROUND(COALESCE(AVG(r.total_amount), 0)::NUMERIC, 2) as avg_amount
  FROM receipts r
  GROUP BY r.category
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PART 3: Grant admin access to office@myshelfhero.com
INSERT INTO admin_roles (user_id, role, is_active)
SELECT id, 'super_admin', true
FROM auth.users
WHERE email = 'office@myshelfhero.com'
ON CONFLICT (user_id)
DO UPDATE SET role = 'super_admin', is_active = true;

-- PART 4: Verification queries
SELECT 'SUCCESS: Admin role created' as message, ar.role, ar.is_active, u.email
FROM admin_roles ar
JOIN auth.users u ON u.id = ar.user_id
WHERE u.email = 'office@myshelfhero.com';
