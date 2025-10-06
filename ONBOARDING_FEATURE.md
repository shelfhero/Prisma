# Onboarding Feature - Призма

## Overview

A comprehensive onboarding flow for new users that guides them through initial setup in under 2 minutes.

## Features

### 3-Step Onboarding Flow

1. **Welcome Step** (`/onboarding` - step: welcome)
   - Friendly welcome message with user's name
   - Overview of app benefits (scanning, budgeting, analytics)
   - Key features highlighted with icons
   - Single CTA: "Започнете сега 🚀"

2. **Profile Setup** (`/onboarding` - step: profile)
   - Collect user's full name
   - Optional skip button
   - Progress indicator (Step 1 of 2)
   - Stores name in both profile and user metadata

3. **First Receipt Upload** (`/onboarding` - step: first_receipt)
   - Encourage first receipt upload
   - Visual guide showing the upload process
   - Two options:
     - Upload receipt (redirects to `/upload-receipt`)
     - Skip for now (goes to `/dashboard`)

### Database Schema

New fields added to `profiles` table:
- `onboarding_completed` (boolean) - Whether user completed onboarding
- `onboarding_step` (varchar) - Current step: 'welcome', 'profile', 'first_receipt', 'completed'
- `onboarding_completed_at` (timestamp) - When onboarding was completed
- `first_receipt_uploaded` (boolean) - Track if user uploaded first receipt
- `budget_created` (boolean) - Track if user created first budget

### Empty States

Created reusable empty state components:

1. **NoReceiptsEmpty** - Shows when user has no receipts
   - Friendly message with camera icon
   - CTA to upload first receipt
   - Step-by-step guide

2. **NoBudgetEmpty** - Shows when user has no budget
   - Piggy bank icon
   - Benefits of creating a budget
   - CTA to create budget

3. **NoDataEmpty** - Generic empty state component
   - Customizable icon, title, description
   - Optional CTA button
   - Reusable across the app

## File Structure

```
components/
├── onboarding/
│   ├── WelcomeStep.tsx          # Step 1: Welcome screen
│   ├── ProfileSetupStep.tsx     # Step 2: Profile setup
│   ├── FirstReceiptStep.tsx     # Step 3: First receipt
│   └── OnboardingFlow.tsx       # Main flow controller
└── empty-states/
    ├── NoReceiptsEmpty.tsx      # No receipts empty state
    ├── NoBudgetEmpty.tsx        # No budget empty state
    └── NoDataEmpty.tsx          # Generic empty state

app/
└── onboarding/
    └── page.tsx                 # Onboarding page route

supabase/
└── migrations/
    └── 009_onboarding.sql       # Database schema changes
```

## User Flow

### New User Registration
1. User registers at `/auth/register`
2. After successful registration → redirect to `/onboarding`
3. User goes through 3-step onboarding
4. After completion → redirect to `/dashboard`

### Returning Users
- If `onboarding_completed = true` → direct access to dashboard
- If `onboarding_completed = false` → redirect to `/onboarding` (resume from last step)

### Onboarding State Management
- State persisted in database
- Can resume onboarding if interrupted
- Progress tracked per step

## Migration Instructions

### Apply Database Migration

Run the following SQL in Supabase SQL Editor (https://supabase.com/dashboard/project/eisfwocfkejsxipmbyzp/sql):

```sql
-- Copy contents from supabase/migrations/009_onboarding.sql
-- Or run:
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(50) DEFAULT 'welcome',
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS first_receipt_uploaded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS budget_created BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed
    ON public.profiles(onboarding_completed)
    WHERE onboarding_completed = FALSE;
```

## UI/UX Highlights

### Design Principles
- **Quick**: Under 2 minutes to complete
- **Friendly**: Bulgarian language, warm tone
- **Visual**: Icons and illustrations throughout
- **Skippable**: Users can skip optional steps
- **Progressive**: Save progress at each step

### Accessibility
- Proper form labels
- Keyboard navigation support
- Screen reader friendly
- Clear focus states
- Responsive design (mobile-first)

### Bulgarian Localization
- All text in Bulgarian
- BGN currency references
- Local store examples (Lidl, Billa, Kaufland)
- Bulgarian cultural context

## Testing Checklist

- [ ] New user can complete onboarding flow
- [ ] Profile name is saved correctly
- [ ] Onboarding can be resumed after interruption
- [ ] Skip buttons work correctly
- [ ] Users are redirected to appropriate pages
- [ ] Empty states appear correctly when there's no data
- [ ] Mobile responsive design works
- [ ] Database fields are updated correctly
- [ ] Existing users bypass onboarding

## Future Enhancements

1. **Tutorial tooltips** - Interactive guide on dashboard
2. **Achievement system** - Gamify first actions
3. **Budget wizard** - AI-suggested budget based on past receipts
4. **Store preferences** - Ask about favorite stores
5. **Category customization** - Let users customize categories during onboarding
6. **Progress celebration** - Celebrate milestones (first receipt, first budget, etc.)

## Notes

- Onboarding is automatically shown to new users after registration
- Existing users will NOT see onboarding (onboarding_completed defaults to FALSE for new rows only)
- To reset onboarding for testing, set `onboarding_completed = FALSE` in database
