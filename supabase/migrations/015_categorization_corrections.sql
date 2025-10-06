-- Create table for storing user categorization corrections
CREATE TABLE IF NOT EXISTS categorization_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_name_normalized TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  original_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_categorization_corrections_user_id ON categorization_corrections(user_id);
CREATE INDEX idx_categorization_corrections_normalized ON categorization_corrections(product_name_normalized);
CREATE INDEX idx_categorization_corrections_category ON categorization_corrections(category_id);

-- Enable RLS
ALTER TABLE categorization_corrections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own corrections"
  ON categorization_corrections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own corrections"
  ON categorization_corrections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own corrections"
  ON categorization_corrections FOR UPDATE
  USING (user_id = auth.uid());

-- Function to get similar corrections for learning
CREATE OR REPLACE FUNCTION get_categorization_suggestions(
  p_product_name TEXT,
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  correction_count BIGINT,
  avg_confidence DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.category_id,
    c.name as category_name,
    COUNT(*)::BIGINT as correction_count,
    ROUND(AVG(cc.confidence_score)::NUMERIC, 2) as avg_confidence
  FROM categorization_corrections cc
  JOIN categories c ON cc.category_id = c.id
  WHERE
    cc.product_name_normalized = LOWER(TRIM(REGEXP_REPLACE(p_product_name, '[^\w\s]', '', 'g')))
    AND (p_user_id IS NULL OR cc.user_id = p_user_id)
  GROUP BY cc.category_id, c.name
  ORDER BY correction_count DESC, avg_confidence DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE categorization_corrections IS 'User corrections for product categorizations - used for ML improvement';
COMMENT ON FUNCTION get_categorization_suggestions IS 'Get categorization suggestions based on past user corrections';
