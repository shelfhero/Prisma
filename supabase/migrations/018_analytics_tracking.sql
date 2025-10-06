-- Analytics and Error Tracking Tables
-- Privacy-first analytics without external dependencies

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL CHECK (event_category IN ('user_action', 'error', 'performance', 'system')),
  event_data JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error Logs Table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  page_url TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);

CREATE INDEX idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_user ON error_logs(user_id);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);

-- RLS Policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own events
CREATE POLICY "Users can insert analytics events" ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert error logs" ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all analytics (if admin_users table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users') THEN
    EXECUTE 'CREATE POLICY "Admins can view all analytics" ON analytics_events
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admin_users
          WHERE admin_users.user_id = auth.uid()
          AND admin_users.is_active = true
        )
      )';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users') THEN
    EXECUTE 'CREATE POLICY "Admins can view all errors" ON error_logs
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admin_users
          WHERE admin_users.user_id = auth.uid()
          AND admin_users.is_active = true
        )
      )';
  END IF;
END $$;

-- Admins can update error resolution status (if admin_users table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users') THEN
    EXECUTE 'CREATE POLICY "Admins can update errors" ON error_logs
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admin_users
          WHERE admin_users.user_id = auth.uid()
          AND admin_users.is_active = true
        )
      )';
  END IF;
END $$;

-- Function to get analytics summary
CREATE OR REPLACE FUNCTION get_analytics_summary(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_events BIGINT,
  unique_users BIGINT,
  unique_sessions BIGINT,
  page_views BIGINT,
  user_actions BIGINT,
  errors BIGINT,
  performance_events BIGINT,
  top_pages JSONB,
  top_events JSONB,
  error_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_events,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    COUNT(DISTINCT session_id)::BIGINT as unique_sessions,
    COUNT(*) FILTER (WHERE event_name = 'page_view')::BIGINT as page_views,
    COUNT(*) FILTER (WHERE event_category = 'user_action')::BIGINT as user_actions,
    COUNT(*) FILTER (WHERE event_category = 'error')::BIGINT as errors,
    COUNT(*) FILTER (WHERE event_category = 'performance')::BIGINT as performance_events,

    -- Top pages
    (
      SELECT jsonb_agg(jsonb_build_object('page', page_url, 'count', count))
      FROM (
        SELECT page_url, COUNT(*) as count
        FROM analytics_events
        WHERE created_at BETWEEN start_date AND end_date
        AND page_url IS NOT NULL
        GROUP BY page_url
        ORDER BY count DESC
        LIMIT 10
      ) top_pages_sub
    ) as top_pages,

    -- Top events
    (
      SELECT jsonb_agg(jsonb_build_object('event', event_name, 'count', count))
      FROM (
        SELECT event_name, COUNT(*) as count
        FROM analytics_events
        WHERE created_at BETWEEN start_date AND end_date
        GROUP BY event_name
        ORDER BY count DESC
        LIMIT 10
      ) top_events_sub
    ) as top_events,

    -- Error breakdown
    (
      SELECT jsonb_agg(jsonb_build_object('type', error_type, 'severity', severity, 'count', count))
      FROM (
        SELECT error_type, severity, COUNT(*) as count
        FROM error_logs
        WHERE created_at BETWEEN start_date AND end_date
        GROUP BY error_type, severity
        ORDER BY count DESC
        LIMIT 20
      ) error_breakdown_sub
    ) as error_breakdown
  FROM analytics_events
  WHERE created_at BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old analytics (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_events
  WHERE created_at < NOW() - INTERVAL '90 days';

  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND resolved = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE analytics_events IS 'Privacy-first analytics events for Призма app';
COMMENT ON TABLE error_logs IS 'Error logs and tracking for debugging and monitoring';
COMMENT ON FUNCTION get_analytics_summary IS 'Get analytics summary for admin dashboard';
COMMENT ON FUNCTION cleanup_old_analytics IS 'Cleanup old analytics data (keep 90 days)';
