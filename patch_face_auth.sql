-- Supabase SQL Migration Patch for Face Verification
-- Copy and run this in your Supabase Dashboard -> SQL Editor

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS face_auth_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS face_video_url TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS face_video_path TEXT;

ALTER TABLE public.executions ADD COLUMN IF NOT EXISTS auth_summary JSONB;
