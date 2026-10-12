-- Migration: Fix missing Row Level Security (RLS) on profiles table

-- 1. Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any exist
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- 3. Create SELECT policy: Public read access for profile information (e.g. username, avatar_url)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
FOR SELECT
USING (true);

-- 4. Create INSERT policy: Authenticated users can only insert their own profile
CREATE POLICY "Users can insert their own profile" ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = id
);

-- 5. Create UPDATE policy: Authenticated users can only update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE
TO authenticated
USING (
    auth.uid() = id
)
WITH CHECK (
    auth.uid() = id
);
