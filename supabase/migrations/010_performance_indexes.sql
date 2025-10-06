-- ========================================
-- ПРИЗМА - PERFORMANCE OPTIMIZATION
-- ========================================
-- Migration 010: Additional indexes for mobile performance
-- Date: 2025-10-02
-- Description: Optimize queries for fast mobile performance

-- ========================================
-- RECEIPTS TABLE INDEXES
-- ========================================

-- Index for user's recent receipts (most common query)
CREATE INDEX IF NOT EXISTS idx_receipts_user_recent
ON public.receipts(user_id, purchased_at DESC);

-- Index for user's receipts by date range (budget queries)
CREATE INDEX IF NOT EXISTS idx_receipts_user_date_range
ON public.receipts(user_id, purchased_at)
WHERE purchased_at IS NOT NULL;

-- Index for receipt status queries
CREATE INDEX IF NOT EXISTS idx_receipts_user_status
ON public.receipts(user_id, status)
WHERE status IS NOT NULL;

-- Partial index for pending receipts (smaller, faster)
CREATE INDEX IF NOT EXISTS idx_receipts_pending
ON public.receipts(user_id, created_at DESC)
WHERE status = 'pending';

-- ========================================
-- ITEMS TABLE INDEXES
-- ========================================

-- Index for items by receipt (N+1 query prevention)
CREATE INDEX IF NOT EXISTS idx_items_receipt_id
ON public.items(receipt_id);

-- Index for items by category (budget calculations)
CREATE INDEX IF NOT EXISTS idx_items_category_id
ON public.items(category_id)
WHERE category_id IS NOT NULL;

-- Covering index for receipt item queries (includes commonly selected columns)
CREATE INDEX IF NOT EXISTS idx_items_receipt_covering
ON public.items(receipt_id, category_id, total_price, qty);

-- ========================================
-- BUDGETS TABLE INDEXES
-- ========================================

-- Index for active user budgets
CREATE INDEX IF NOT EXISTS idx_budgets_user_active
ON public.budgets(user_id, start_date, end_date)
WHERE period_type = 'monthly';

-- Index for current period budget (most common)
CREATE INDEX IF NOT EXISTS idx_budgets_current_period
ON public.budgets(user_id, period_type, start_date DESC)
WHERE period_type = 'monthly';

-- ========================================
-- BUDGET_LINES TABLE INDEXES
-- ========================================

-- Index for budget lines by budget_id
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget_id
ON public.budget_lines(budget_id);

-- Index for budget lines by category
CREATE INDEX IF NOT EXISTS idx_budget_lines_category
ON public.budget_lines(budget_id, category_id);

-- ========================================
-- PROFILES TABLE INDEXES
-- ========================================

-- Index for email lookups (already exists but ensuring)
CREATE INDEX IF NOT EXISTS idx_profiles_email
ON public.profiles(email);

-- Index for onboarding status (for filtering incomplete onboarding)
-- Already created in migration 009

-- ========================================
-- PRODUCT_CATEGORIZATIONS TABLE INDEXES
-- ========================================

-- Index for product name lookups (autocomplete, suggestions)
CREATE INDEX IF NOT EXISTS idx_product_categorizations_name
ON public.product_categorizations(normalized_product_name);

-- Trigram index for fuzzy product name search
CREATE INDEX IF NOT EXISTS idx_product_categorizations_name_trgm
ON public.product_categorizations
USING gin(normalized_product_name gin_trgm_ops);

-- Index for category-based lookups
CREATE INDEX IF NOT EXISTS idx_product_categorizations_category
ON public.product_categorizations(category_id, confidence_score DESC);

-- ========================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ========================================

-- Receipt items with category for budget calculation
CREATE INDEX IF NOT EXISTS idx_items_budget_calc
ON public.items(category_id, total_price)
WHERE category_id IS NOT NULL;

-- User receipts with retailer for recent activity
CREATE INDEX IF NOT EXISTS idx_receipts_user_retailer
ON public.receipts(user_id, retailer_id, purchased_at DESC);

-- ========================================
-- ANALYZE TABLES FOR BETTER QUERY PLANNING
-- ========================================

ANALYZE public.receipts;
ANALYZE public.items;
ANALYZE public.budgets;
ANALYZE public.budget_lines;
ANALYZE public.profiles;
ANALYZE public.product_categorizations;
ANALYZE public.retailers;
ANALYZE public.categories;

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON INDEX idx_receipts_user_recent IS 'Optimizes user recent receipts query - most common';
COMMENT ON INDEX idx_items_receipt_covering IS 'Covering index prevents table lookups for common queries';
COMMENT ON INDEX idx_budgets_current_period IS 'Fast lookup for current month budget';
COMMENT ON INDEX idx_product_categorizations_name_trgm IS 'Enables fuzzy product name search for autocomplete';
