-- Create support requests table
CREATE TABLE IF NOT EXISTS support_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  notes TEXT
);

-- Create index for faster queries
CREATE INDEX idx_support_requests_user_id ON support_requests(user_id);
CREATE INDEX idx_support_requests_status ON support_requests(status);
CREATE INDEX idx_support_requests_created_at ON support_requests(created_at DESC);

-- Enable RLS
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own support requests
CREATE POLICY "Users can view own support requests"
  ON support_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can create a support request (even non-authenticated users)
CREATE POLICY "Anyone can create support requests"
  ON support_requests
  FOR INSERT
  WITH CHECK (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_support_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_request_updated
  BEFORE UPDATE ON support_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_support_request_timestamp();

-- Add comments
COMMENT ON TABLE support_requests IS 'Stores user support requests and inquiries';
COMMENT ON COLUMN support_requests.status IS 'pending: new request, in_progress: being handled, resolved: solved, closed: archived';
