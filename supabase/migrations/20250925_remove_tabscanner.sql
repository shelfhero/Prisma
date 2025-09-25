-- Migration: Remove TabScanner references and rename to generic OCR
-- This migration updates the receipts table to use generic OCR field names

-- Rename tabscanner_raw column to ocr_raw
ALTER TABLE public.receipts RENAME COLUMN tabscanner_raw TO ocr_raw;

-- Update column comment
COMMENT ON COLUMN public.receipts.ocr_raw IS 'Пълен JSON отговор от OCR API';

-- Clean up any TabScanner-specific data that might be stored
-- (Optional: if you want to clean existing data, uncomment the lines below)
-- UPDATE public.receipts SET ocr_raw = NULL WHERE ocr_raw IS NOT NULL;