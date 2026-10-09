-- Migration: Fix overly permissive Row Level Security (RLS) on analytics_events table

-- 1. Drop existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Allow authenticated to read analytics" ON analytics_events;

-- 2. Ensure RLS is enabled on analytics_events table
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- 3. Create strict SELECT policy: Users can only read their own analytics events
CREATE POLICY "Allow users to read own analytics" ON analytics_events
FOR SELECT TO authenticated
USING (
    auth.uid() = user_id
);
