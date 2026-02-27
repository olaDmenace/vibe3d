-- Add soft-delete column to projects table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for efficient filtering of non-deleted projects
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at
  ON public.projects (deleted_at)
  WHERE deleted_at IS NULL;

-- Update RLS policies to exclude soft-deleted projects from normal queries
-- (Owner can still see their own deleted projects for restoration)
