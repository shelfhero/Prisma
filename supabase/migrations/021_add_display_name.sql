-- Add display_name column to master_products table
-- This will store human-readable product names (e.g., "Мляко прясно Верея 3.6% 1л")
-- while normalized_name remains for matching (e.g., "мляко прясно верея 3.6% 1л")

ALTER TABLE master_products
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Create index for searching by display name (using default text search config)
CREATE INDEX IF NOT EXISTS idx_master_products_display_name
ON master_products USING gin(to_tsvector('simple', display_name));

-- Add comment
COMMENT ON COLUMN master_products.display_name IS 'Human-readable product name for display purposes';
