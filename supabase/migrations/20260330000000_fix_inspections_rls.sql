-- Migration: Fix overly permissive Row Level Security (RLS) on inspections table

-- 1. Drop existing public / insecure policies
DROP POLICY IF EXISTS "Allow public insert to inspections" ON inspections;
DROP POLICY IF EXISTS "Allow participants to read inspections" ON inspections;

-- 2. Ensure RLS is enabled on inspections table
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- 3. Create strict INSERT policy: Only authenticated users can insert records for themselves
CREATE POLICY "Allow authenticated users to insert inspections" ON inspections
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = user_id
);

-- 4. Create strict SELECT policy: Only the participant (creator) or trailer owner can read inspection records
CREATE POLICY "Allow participants and owners to read inspections" ON inspections
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() OR
    trailer_id IN (
        SELECT id FROM trailers WHERE owner_id = auth.uid()
    )
);
