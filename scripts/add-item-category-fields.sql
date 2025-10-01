-- Add categorization fields to items table

-- Add category_id column (stores the category identifier)
ALTER TABLE items ADD COLUMN IF NOT EXISTS category_id TEXT;

-- Add category_name column (stores the category display name in Bulgarian)
ALTER TABLE items ADD COLUMN IF NOT EXISTS category_name TEXT;

-- Add category_confidence column (stores confidence score 0-1)
ALTER TABLE items ADD COLUMN IF NOT EXISTS category_confidence NUMERIC(3,2) DEFAULT 0;

-- Add category_method column (stores how the category was determined: rule, store_pattern, ai, user_correction, cache)
ALTER TABLE items ADD COLUMN IF NOT EXISTS category_method TEXT;

-- Create index on category_id for fast filtering by category
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);

-- Create index on category_method for analytics
CREATE INDEX IF NOT EXISTS idx_items_category_method ON items(category_method);

COMMENT ON COLUMN items.category_id IS 'Automatically assigned category identifier (e.g., basic_foods, snacks)';
COMMENT ON COLUMN items.category_name IS 'Category display name in Bulgarian (e.g., Основни храни, Снакове)';
COMMENT ON COLUMN items.category_confidence IS 'Confidence score for the categorization (0-1, where 1 is highest confidence)';
COMMENT ON COLUMN items.category_method IS 'Method used for categorization: rule, store_pattern, ai, user_correction, or cache';
