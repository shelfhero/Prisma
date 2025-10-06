-- ========================================
-- ПРИЗМА - RECEIPTS STORAGE BUCKET
-- ========================================
-- Миграция 016: Създаване на receipts bucket за тестване и general use
-- Дата: 2025-10-04

-- ========================================
-- СЪЗДАВАНЕ НА RECEIPTS BUCKET
-- ========================================

-- Create receipts bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    false, -- Not public, requires authentication
    10485760, -- 10MB limit
    ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif',
        'application/json' -- For test files
    ]
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ========================================
-- RLS POLICIES FOR RECEIPTS BUCKET
-- ========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "receipts_upload_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "receipts_select_own" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "receipts_update_own" ON storage.objects;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "receipts_upload_authenticated" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'receipts'
        AND (
            -- Allow uploads to user's own folder: user_id/...
            auth.uid()::text = (storage.foldername(name))[1]
            OR
            -- Allow uploads to test-uploads folder (for testing)
            (storage.foldername(name))[1] = 'test-uploads'
        )
    );

-- Allow authenticated users to read their own files
CREATE POLICY "receipts_select_own" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'receipts'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR
            (storage.foldername(name))[1] = 'test-uploads'
        )
    );

-- Allow authenticated users to delete their own files
CREATE POLICY "receipts_delete_own" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'receipts'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR
            (storage.foldername(name))[1] = 'test-uploads'
        )
    );

-- Allow authenticated users to update their own files
CREATE POLICY "receipts_update_own" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'receipts'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR
            (storage.foldername(name))[1] = 'test-uploads'
        )
    );

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON POLICY "receipts_upload_authenticated" ON storage.objects IS
'Authenticated users can upload files to their own folder or test-uploads folder';

COMMENT ON POLICY "receipts_select_own" ON storage.objects IS
'Users can read their own files and test files';

COMMENT ON POLICY "receipts_delete_own" ON storage.objects IS
'Users can delete their own files and test files';

COMMENT ON POLICY "receipts_update_own" ON storage.objects IS
'Users can update metadata of their own files';
