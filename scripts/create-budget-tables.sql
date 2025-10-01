-- Budget Management Tables for Призма Receipt App
-- Create budgets and budget_lines tables

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    period_type TEXT NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('weekly', 'monthly', 'yearly')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budget_lines table (category allocations)
CREATE TABLE IF NOT EXISTS budget_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    limit_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget_id ON budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_category_id ON budget_lines(category_id);

-- Enable RLS (Row Level Security)
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can insert own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can view own budget lines" ON budget_lines;
DROP POLICY IF EXISTS "Users can insert own budget lines" ON budget_lines;
DROP POLICY IF EXISTS "Users can update own budget lines" ON budget_lines;
DROP POLICY IF EXISTS "Users can delete own budget lines" ON budget_lines;

-- Create RLS policies for budgets
CREATE POLICY "Users can view own budgets" ON budgets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" ON budgets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON budgets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON budgets
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for budget_lines
CREATE POLICY "Users can view own budget lines" ON budget_lines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM budgets
            WHERE budgets.id = budget_lines.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own budget lines" ON budget_lines
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM budgets
            WHERE budgets.id = budget_lines.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own budget lines" ON budget_lines
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM budgets
            WHERE budgets.id = budget_lines.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own budget lines" ON budget_lines
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM budgets
            WHERE budgets.id = budget_lines.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
DROP TRIGGER IF EXISTS update_budget_lines_updated_at ON budget_lines;

-- Create triggers for updated_at
CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_lines_updated_at
    BEFORE UPDATE ON budget_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to handle budget table creation via RPC
CREATE OR REPLACE FUNCTION create_budget_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function is just a placeholder for the API call
    -- The actual table creation is handled by running this SQL script
    NULL;
END;
$$;