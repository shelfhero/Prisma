-- Add auto-processing fields to receipt_items table
ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS auto_categorized BOOLEAN DEFAULT false;
ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);
ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Add auto-processing field to receipts table
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS auto_processed BOOLEAN DEFAULT true;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT false;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS auto_categorized_count INTEGER DEFAULT 0;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS manual_review_count INTEGER DEFAULT 0;

-- Create index for finding receipts requiring review
CREATE INDEX IF NOT EXISTS idx_receipts_requires_review ON receipts(requires_review) WHERE requires_review = true;

-- Create index for confidence scores
CREATE INDEX IF NOT EXISTS idx_receipt_items_confidence ON receipt_items(confidence_score) WHERE confidence_score < 0.7;

-- Add user preferences table for auto-processing settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_process_receipts BOOLEAN DEFAULT true,
  confidence_threshold DECIMAL(3,2) DEFAULT 0.70,
  always_review BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add RLS policies for user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Create statistics view for trust building
CREATE OR REPLACE VIEW user_processing_stats AS
SELECT
  r.user_id,
  COUNT(*) as total_receipts,
  SUM(CASE WHEN auto_processed = true THEN 1 ELSE 0 END) as auto_processed_count,
  SUM(auto_categorized_count) as total_auto_categorized_items,
  SUM(manual_review_count) as total_manual_review_items,
  ROUND(
    CASE
      WHEN SUM(auto_categorized_count + manual_review_count) > 0
      THEN (SUM(auto_categorized_count)::decimal / SUM(auto_categorized_count + manual_review_count)) * 100
      ELSE 0
    END,
    0
  ) as auto_categorization_rate
FROM receipts r
WHERE r.status = 'completed'
GROUP BY r.user_id;

COMMENT ON VIEW user_processing_stats IS 'Statistics for showing users how well auto-processing is working';
