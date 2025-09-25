-- Create product_categorizations table for GPT-4o Mini learning system
CREATE TABLE IF NOT EXISTS product_categorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Основни храни',
        'Готови храни',
        'Напитки',
        'Хигиена и козметика',
        'Други'
    )),
    user_confirmed BOOLEAN DEFAULT FALSE,
    confidence NUMERIC(3,2) DEFAULT 0.8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_categorizations_user_id
    ON product_categorizations(user_id);

CREATE INDEX IF NOT EXISTS idx_product_categorizations_product_name
    ON product_categorizations(product_name);

CREATE INDEX IF NOT EXISTS idx_product_categorizations_user_confirmed
    ON product_categorizations(user_id, user_confirmed);

-- Create unique constraint to prevent duplicates per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categorizations_unique
    ON product_categorizations(user_id, lower(trim(product_name)));

-- Add RLS (Row Level Security)
ALTER TABLE product_categorizations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own categorizations
CREATE POLICY "Users can view own categorizations"
    ON product_categorizations FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own categorizations
CREATE POLICY "Users can insert own categorizations"
    ON product_categorizations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own categorizations
CREATE POLICY "Users can update own categorizations"
    ON product_categorizations FOR UPDATE
    USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_product_categorizations_updated_at
    BEFORE UPDATE ON product_categorizations
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Grant permissions
GRANT ALL ON product_categorizations TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;