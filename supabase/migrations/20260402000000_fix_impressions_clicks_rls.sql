-- Migration: Fix overly permissive Row Level Security (RLS) on impressions and clicks tables

-- 1. Drop existing overly permissive INSERT policies
DROP POLICY IF EXISTS "Allow public insert to impressions" ON impressions;
DROP POLICY IF EXISTS "Allow public insert to clicks" ON clicks;

-- 2. Ensure RLS is enabled on impressions and clicks tables
ALTER TABLE impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;

-- 3. Create strict INSERT policy for impressions table
-- Restrict user_id so it must either be NULL (anonymous) or match auth.uid() (authenticated owner)
CREATE POLICY "Allow public insert to impressions" ON impressions
FOR INSERT
TO public
WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
);

-- 4. Create strict INSERT policy for clicks table
-- Restrict user_id so it must either be NULL (anonymous) or match auth.uid() (authenticated owner)
CREATE POLICY "Allow public insert to clicks" ON clicks
FOR INSERT
TO public
WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
);
