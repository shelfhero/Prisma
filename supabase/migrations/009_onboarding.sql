-- ========================================
-- ПРИЗМА - ONBOARDING TRACKING
-- ========================================
-- Migration 009: Add onboarding tracking to profiles
-- Date: 2025-10-02
-- Description: Track user onboarding progress

-- Add onboarding fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(50) DEFAULT 'welcome',
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS first_receipt_uploaded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS budget_created BOOLEAN DEFAULT FALSE;

-- Create index for quick lookup of users in onboarding
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed
    ON public.profiles(onboarding_completed)
    WHERE onboarding_completed = FALSE;

-- Comments for documentation
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether user has completed the onboarding flow';
COMMENT ON COLUMN public.profiles.onboarding_step IS 'Current onboarding step: welcome, profile, first_receipt, completed';
COMMENT ON COLUMN public.profiles.onboarding_completed_at IS 'Timestamp when onboarding was completed';
COMMENT ON COLUMN public.profiles.first_receipt_uploaded IS 'Whether user has uploaded their first receipt';
COMMENT ON COLUMN public.profiles.budget_created IS 'Whether user has created their first budget';
