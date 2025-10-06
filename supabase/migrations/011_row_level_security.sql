/**
 * Row Level Security (RLS) Policies
 * Ensures users can only access their own data
 * GDPR Compliance - Data Isolation
 */

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can insert their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can update their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON public.receipts;

DROP POLICY IF EXISTS "Users can view their own items" ON public.items;
DROP POLICY IF EXISTS "Users can insert their own items" ON public.items;
DROP POLICY IF EXISTS "Users can update their own items" ON public.items;
DROP POLICY IF EXISTS "Users can delete their own items" ON public.items;

DROP POLICY IF EXISTS "Users can view their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can insert their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can update their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can delete their own budgets" ON public.budgets;

DROP POLICY IF EXISTS "Users can view their own budget lines" ON public.budget_lines;
DROP POLICY IF EXISTS "Users can insert their own budget lines" ON public.budget_lines;
DROP POLICY IF EXISTS "Users can update their own budget lines" ON public.budget_lines;
DROP POLICY IF EXISTS "Users can delete their own budget lines" ON public.budget_lines;

DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_preferences;

-- Profiles table policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Receipts table policies
CREATE POLICY "Users can view their own receipts"
  ON public.receipts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own receipts"
  ON public.receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipts"
  ON public.receipts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receipts"
  ON public.receipts FOR DELETE
  USING (auth.uid() = user_id);

-- Items table policies (items belong to receipts, which belong to users)
CREATE POLICY "Users can view their own items"
  ON public.items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts
      WHERE receipts.id = items.receipt_id
      AND receipts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own items"
  ON public.items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.receipts
      WHERE receipts.id = items.receipt_id
      AND receipts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own items"
  ON public.items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts
      WHERE receipts.id = items.receipt_id
      AND receipts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own items"
  ON public.items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts
      WHERE receipts.id = items.receipt_id
      AND receipts.user_id = auth.uid()
    )
  );

-- Budgets table policies
CREATE POLICY "Users can view their own budgets"
  ON public.budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets"
  ON public.budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
  ON public.budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
  ON public.budgets FOR DELETE
  USING (auth.uid() = user_id);

-- Budget lines table policies (budget lines belong to budgets, which belong to users)
CREATE POLICY "Users can view their own budget lines"
  ON public.budget_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.budgets
      WHERE budgets.id = budget_lines.budget_id
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own budget lines"
  ON public.budget_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budgets
      WHERE budgets.id = budget_lines.budget_id
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own budget lines"
  ON public.budget_lines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.budgets
      WHERE budgets.id = budget_lines.budget_id
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own budget lines"
  ON public.budget_lines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.budgets
      WHERE budgets.id = budget_lines.budget_id
      AND budgets.user_id = auth.uid()
    )
  );

-- User preferences table policies
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON public.user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;

-- Public tables (read-only for all authenticated users)
GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT ON public.retailers TO authenticated;
GRANT SELECT ON public.product_categorizations TO authenticated;

COMMENT ON POLICY "Users can view their own profile" ON public.profiles IS 'GDPR: Users can only view their own profile data';
COMMENT ON POLICY "Users can view their own receipts" ON public.receipts IS 'GDPR: Users can only view their own receipt data';
COMMENT ON POLICY "Users can view their own items" ON public.items IS 'GDPR: Users can only view items from their own receipts';
COMMENT ON POLICY "Users can view their own budgets" ON public.budgets IS 'GDPR: Users can only view their own budget data';
COMMENT ON POLICY "Users can view their own budget lines" ON public.budget_lines IS 'GDPR: Users can only view budget lines from their own budgets';
COMMENT ON POLICY "Users can view their own preferences" ON public.user_preferences IS 'GDPR: Users can only view their own preferences';
