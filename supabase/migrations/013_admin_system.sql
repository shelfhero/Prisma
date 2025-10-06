-- Admin roles and permissions
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator', 'analyst')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  UNIQUE(user_id)
);

-- Admin activity audit log
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

-- Admin sessions (for enhanced security)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  two_factor_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- System metrics snapshot (for historical tracking)
CREATE TABLE IF NOT EXISTS system_metrics_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total_users INTEGER,
  active_users_7d INTEGER,
  new_users_today INTEGER,
  total_receipts INTEGER,
  receipts_today INTEGER,
  success_rate DECIMAL(5,2),
  avg_receipts_per_user DECIMAL(10,2),
  avg_receipt_value DECIMAL(10,2),
  top_stores JSONB,
  category_spending JSONB,
  error_summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX idx_admin_roles_active ON admin_roles(is_active);
CREATE INDEX idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_active ON admin_sessions(is_active);
CREATE INDEX idx_system_metrics_created_at ON system_metrics_snapshots(created_at DESC);

-- Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_roles
CREATE POLICY "Super admins can view all roles"
  ON admin_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role = 'super_admin'
      AND ar.is_active = true
    )
  );

CREATE POLICY "Users can view their own role"
  ON admin_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage roles"
  ON admin_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role = 'super_admin'
      AND ar.is_active = true
    )
  );

-- RLS Policies for admin_audit_log
CREATE POLICY "Admins can view audit logs"
  ON admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.is_active = true
    )
  );

CREATE POLICY "System can insert audit logs"
  ON admin_audit_log FOR INSERT
  WITH CHECK (true);

-- RLS Policies for admin_sessions
CREATE POLICY "Admins can view their own sessions"
  ON admin_sessions FOR SELECT
  USING (admin_id = auth.uid());

CREATE POLICY "Admins can manage their own sessions"
  ON admin_sessions FOR ALL
  USING (admin_id = auth.uid());

-- RLS Policies for system_metrics_snapshots
CREATE POLICY "Admins can view metrics snapshots"
  ON system_metrics_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.is_active = true
    )
  );

-- Function to check if user is admin
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

-- Function to check specific admin role
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

-- Function to log admin activity
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

-- Function to get real-time system metrics
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
        (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL /
        NULLIF(COUNT(*), 0) * 100)::NUMERIC,
        2
      )
      FROM receipts
      WHERE created_at >= NOW() - INTERVAL '30 days'
    ),
    'avg_receipts_per_user', (
      SELECT ROUND(
        (COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM auth.users), 0))::NUMERIC,
        2
      )
      FROM receipts
    ),
    'avg_receipt_value', (
      SELECT ROUND(AVG(total_amount)::NUMERIC, 2)
      FROM receipts
      WHERE total_amount IS NOT NULL
    )
  ) INTO v_metrics;

  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top stores
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
    ROUND(SUM(r.total_amount)::NUMERIC, 2) as total_amount
  FROM receipts r
  WHERE r.merchant_name IS NOT NULL
  GROUP BY r.merchant_name
  ORDER BY receipt_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get category spending
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
    r.category,
    COUNT(*)::BIGINT as receipt_count,
    ROUND(SUM(r.total_amount)::NUMERIC, 2) as total_amount,
    ROUND(AVG(r.total_amount)::NUMERIC, 2) as avg_amount
  FROM receipts r
  WHERE r.category IS NOT NULL
  GROUP BY r.category
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to snapshot current metrics
CREATE OR REPLACE FUNCTION snapshot_system_metrics()
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_metrics JSONB;
  v_top_stores JSONB;
  v_category_spending JSONB;
BEGIN
  -- Get current metrics
  v_metrics := get_system_metrics();

  -- Get top stores
  SELECT jsonb_agg(row_to_json(s))
  INTO v_top_stores
  FROM get_top_stores(10) s;

  -- Get category spending
  SELECT jsonb_agg(row_to_json(c))
  INTO v_category_spending
  FROM get_category_spending() c;

  -- Insert snapshot
  INSERT INTO system_metrics_snapshots (
    total_users,
    active_users_7d,
    new_users_today,
    total_receipts,
    receipts_today,
    success_rate,
    avg_receipts_per_user,
    avg_receipt_value,
    top_stores,
    category_spending
  ) VALUES (
    (v_metrics->>'total_users')::INTEGER,
    (v_metrics->>'active_users_7d')::INTEGER,
    (v_metrics->>'new_users_today')::INTEGER,
    (v_metrics->>'total_receipts')::INTEGER,
    (v_metrics->>'receipts_today')::INTEGER,
    (v_metrics->>'success_rate')::DECIMAL,
    (v_metrics->>'avg_receipts_per_user')::DECIMAL,
    (v_metrics->>'avg_receipt_value')::DECIMAL,
    v_top_stores,
    v_category_spending
  ) RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE admin_roles IS 'Admin user roles and permissions';
COMMENT ON TABLE admin_audit_log IS 'Audit trail of all admin actions';
COMMENT ON TABLE admin_sessions IS 'Admin session management with 2FA support';
COMMENT ON TABLE system_metrics_snapshots IS 'Historical snapshots of system metrics';

COMMENT ON FUNCTION is_admin IS 'Check if user has any active admin role';
COMMENT ON FUNCTION has_admin_role IS 'Check if user has specific admin role';
COMMENT ON FUNCTION log_admin_activity IS 'Log admin activity for audit trail';
COMMENT ON FUNCTION get_system_metrics IS 'Get real-time system metrics';
COMMENT ON FUNCTION snapshot_system_metrics IS 'Create snapshot of current system metrics';
