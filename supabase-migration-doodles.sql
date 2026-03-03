-- Affirm App - Doodle Support Migration
-- Run this SQL in your Supabase SQL Editor AFTER the initial migration

-- ============================================
-- ADD DOODLE COLUMNS TO LISTENING_SESSIONS
-- ============================================
ALTER TABLE listening_sessions ADD COLUMN IF NOT EXISTS doodle_url TEXT;
ALTER TABLE listening_sessions ADD COLUMN IF NOT EXISTS doodle_data TEXT;

-- ============================================
-- DOODLES STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('doodles', 'doodles', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own doodles"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'doodles'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own doodles"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'doodles'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own doodles"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'doodles'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
