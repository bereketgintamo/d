-- ============================================================
-- SUPABASE DATABASE SCHEMA FOR CHAT APPLICATION
-- Simple, clean schema matching requirements
-- ============================================================

-- If you need gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,              -- Firebase UID
    email TEXT,
    profile_image_url TEXT
);

-- ============================================================
-- TABLE: files
-- ============================================================
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS files_user_id_created_at_idx
    ON public.files (user_id, created_at DESC);

-- ============================================================
-- STORAGE BUCKET (Create via Supabase Dashboard)
-- ============================================================
-- Go to Supabase Dashboard > Storage > Create Bucket
-- Name: uploads
-- Public: true
-- File size limit: (leave empty for no limit)
-- Allowed MIME types: (leave empty for all types)

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - OPTIONAL
-- ============================================================
-- Note: The Node.js backend uses service role key which bypasses RLS
-- If you want RLS for direct client access, enable these:

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view own data" ON users
--     FOR SELECT USING (auth.uid()::text = id);

-- CREATE POLICY "Users can insert own files" ON files
--     FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- CREATE POLICY "Users can view own files" ON files
--     FOR SELECT USING (auth.uid()::text = user_id);