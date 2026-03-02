-- Affirm App - Supabase Migration
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- AFFIRMATIONS TABLE
-- ============================================
CREATE TABLE affirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  script TEXT NOT NULL,
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE affirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own affirmations"
  ON affirmations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- LISTENING SESSIONS TABLE
-- ============================================
CREATE TABLE listening_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  affirmation_id UUID NOT NULL REFERENCES affirmations(id) ON DELETE CASCADE,
  listened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE listening_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON listening_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PRE-WRITTEN SCRIPTS TABLE
-- ============================================
CREATE TABLE pre_written_scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  script TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE pre_written_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read scripts"
  ON pre_written_scripts FOR SELECT
  USING (auth.role() = 'authenticated');

-- Seed starter scripts
INSERT INTO pre_written_scripts (title, script, category, sort_order) VALUES
(
  'Creative Confidence',
  E'I am a creator.\nI am capable of building things that inspire others.\nI am constantly growing in my craft.\nI am worthy of the opportunities coming my way.\nI am resourceful, and I find solutions where others see obstacles.\nI am proud of the work I put into the world.',
  'Starter',
  1
),
(
  'Calm Confidence',
  E'I am grounded and steady, no matter what the day brings.\nI am enough exactly as I am right now.\nI am in control of my energy and where I direct it.\nI am releasing what no longer serves me.\nI am trusting the process, even when progress feels slow.\nI am becoming the person I''m meant to be.',
  'Starter',
  2
),
(
  'Builder''s Mindset',
  E'I am someone who follows through.\nI am disciplined, focused, and intentional with my time.\nI am making progress every single day, even in small ways.\nI am not defined by setbacks \u2014 I am defined by how I respond.\nI am building something meaningful, and I am patient with the journey.\nI am surrounded by possibility.',
  'Starter',
  3
);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_affirmations_updated_at
  BEFORE UPDATE ON affirmations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-recordings', 'audio-recordings', FALSE);

CREATE POLICY "Users can upload own audio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'audio-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own audio"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'audio-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own audio"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'audio-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own audio"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'audio-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
