-- Migration: Fix overly permissive INSERT Row Level Security (RLS) on impressions and clicks tables

-- 1. Drop existing insecure policies that allow arbitrary user_id spoofing
DROP POLICY IF EXISTS "Allow public insert to impressions" ON impressions;
DROP POLICY IF EXISTS "Allow public insert to clicks" ON clicks;

-- 2. Ensure RLS is enabled on impressions and clicks tables
ALTER TABLE impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;

-- 3. Create strict INSERT policy for impressions: user_id must be NULL or match auth.uid()
CREATE POLICY "Allow public insert to impressions" ON impressions
FOR INSERT TO public
WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
);

-- 4. Create strict INSERT policy for clicks: user_id must be NULL or match auth.uid()
CREATE POLICY "Allow public insert to clicks" ON clicks
FOR INSERT TO public
WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
);
