-- Create categorization_corrections table for learning from user corrections
CREATE TABLE IF NOT EXISTS categorization_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_name_normalized TEXT NOT NULL,
  category_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups by normalized product name
CREATE INDEX IF NOT EXISTS idx_categorization_corrections_normalized
  ON categorization_corrections(product_name_normalized);

-- Create index for user-specific lookups
CREATE INDEX IF NOT EXISTS idx_categorization_corrections_user
  ON categorization_corrections(user_id);

-- Enable Row Level Security
ALTER TABLE categorization_corrections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own corrections
CREATE POLICY "Users can view their own corrections"
  ON categorization_corrections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own corrections
CREATE POLICY "Users can insert their own corrections"
  ON categorization_corrections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own corrections
CREATE POLICY "Users can update their own corrections"
  ON categorization_corrections
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own corrections
CREATE POLICY "Users can delete their own corrections"
  ON categorization_corrections
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE categorization_corrections IS 'Stores user corrections for product categorization to improve accuracy over time';
COMMENT ON COLUMN categorization_corrections.product_name IS 'Original product name as it appears on receipt';
COMMENT ON COLUMN categorization_corrections.product_name_normalized IS 'Normalized product name for matching (lowercase, no diacritics)';
COMMENT ON COLUMN categorization_corrections.category_id IS 'Corrected category ID chosen by user';
