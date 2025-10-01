-- Add missing columns to categories table for budget feature
-- This adds icon and color columns that are used by the budget system

-- Add icon column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='categories' AND column_name='icon') THEN
        ALTER TABLE categories ADD COLUMN icon TEXT DEFAULT '📦';
    END IF;
END $$;

-- Add color column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='categories' AND column_name='color') THEN
        ALTER TABLE categories ADD COLUMN color TEXT DEFAULT 'gray';
    END IF;
END $$;

-- Update existing categories with default icons and colors based on their names
UPDATE categories SET
    icon = CASE
        WHEN name LIKE '%храни%' OR name LIKE '%Храни%' THEN '🍎'
        WHEN name LIKE '%готов%' OR name LIKE '%Готов%' THEN '🍕'
        WHEN name LIKE '%напит%' OR name LIKE '%Напит%' THEN '🍺'
        WHEN name LIKE '%закус%' OR name LIKE '%Закус%' THEN '🍭'
        WHEN name LIKE '%нехранителн%' OR name LIKE '%Нехранителн%' THEN '🧴'
        ELSE '📦'
    END,
    color = CASE
        WHEN name LIKE '%храни%' OR name LIKE '%Храни%' THEN 'green'
        WHEN name LIKE '%готов%' OR name LIKE '%Готов%' THEN 'orange'
        WHEN name LIKE '%напит%' OR name LIKE '%Напит%' THEN 'blue'
        WHEN name LIKE '%закус%' OR name LIKE '%Закус%' THEN 'purple'
        WHEN name LIKE '%нехранителн%' OR name LIKE '%Нехранителн%' THEN 'gray'
        ELSE 'gray'
    END
WHERE icon IS NULL OR color IS NULL;
