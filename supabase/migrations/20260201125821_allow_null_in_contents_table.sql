-- Migration: Allow NULL format values since content files are no longer required
-- This allows content records without uploaded files

-- Drop the existing check constraint
ALTER TABLE public.content 
DROP CONSTRAINT IF EXISTS content_format_check;

-- Add new constraint that allows NULL or the specified formats
ALTER TABLE public.content 
ADD CONSTRAINT content_format_check 
CHECK (format IS NULL OR format IN ('pdf','epub','mobi','docx','txt'));

-- Optionally, update existing records with 'unknown' format to NULL
-- UPDATE public.content SET format = NULL WHERE format = 'unknown';