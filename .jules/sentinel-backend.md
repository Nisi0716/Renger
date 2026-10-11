# Sentinel-Backend Journal

## 2026-03-30 - Overly Permissive Row-Level Security on Inspections Table

**Vulnerability:**
The `inspections` table was created with `ENABLE ROW LEVEL SECURITY;`, but contained a dangerously permissive policy `CREATE POLICY "Allow participants to read inspections" ON inspections FOR SELECT USING (true);` alongside `CREATE POLICY "Allow public insert to inspections" ON inspections FOR INSERT TO public WITH CHECK (true);`. This allowed any unauthenticated or authenticated user on the internet to read or insert inspection records, leaking sensitive geolocation data (latitude, longitude), timestamps, and image URLs of private inspections across all rentals.

**Learning:**
Developers used `USING (true)` and `WITH CHECK (true)` during initial prototyping to allow easy insertion and reading without checking user authentication or relationship to the trailer/booking.

**Prevention:**
Always restrict RLS `SELECT` policies to authenticated users who are either the owner of the resource (`user_id = auth.uid()`) or the owner of the linked parent resource (`trailer_id IN (SELECT id FROM trailers WHERE owner_id = auth.uid())`). Avoid public `USING (true)` or `WITH CHECK (true)` on tables storing private or sensitive user data.

## 2026-03-31 - Overly Permissive Row-Level Security on Analytics Events Table

**Vulnerability:**
The `analytics_events` table was created with `ENABLE ROW LEVEL SECURITY;`, but contained an overly permissive SELECT policy `CREATE POLICY "Allow authenticated to read analytics" ON analytics_events FOR SELECT TO authenticated USING (true);`. This allowed any logged-in user to query and read all analytics tracking records across the entire platform, leaking user activity, user IDs, session IDs, and visited page URLs.

**Learning:**
The SELECT policy was created with `USING (true)` for authenticated users as a placeholder for admin analytics access without restricting reads to the owner of the tracking event (`user_id = auth.uid()`).

**Prevention:**
Always restrict RLS `SELECT` policies to the owner of the user record (`auth.uid() = user_id`) unless strict role-based access control (RBAC) or admin checks are implemented. Avoid `USING (true)` on tables containing user activity, sessions, or tracking data.
