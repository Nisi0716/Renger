# Sentinel-Backend Journal

## 2026-03-30 - Overly Permissive Row-Level Security on Inspections Table

**Vulnerability:**
The `inspections` table was created with `ENABLE ROW LEVEL SECURITY;`, but contained a dangerously permissive policy `CREATE POLICY "Allow participants to read inspections" ON inspections FOR SELECT USING (true);` alongside `CREATE POLICY "Allow public insert to inspections" ON inspections FOR INSERT TO public WITH CHECK (true);`. This allowed any unauthenticated or authenticated user on the internet to read or insert inspection records, leaking sensitive geolocation data (latitude, longitude), timestamps, and image URLs of private inspections across all rentals.

**Learning:**
Developers used `USING (true)` and `WITH CHECK (true)` during initial prototyping to allow easy insertion and reading without checking user authentication or relationship to the trailer/booking.

**Prevention:**
Always restrict RLS `SELECT` policies to authenticated users who are either the owner of the resource (`user_id = auth.uid()`) or the owner of the linked parent resource (`trailer_id IN (SELECT id FROM trailers WHERE owner_id = auth.uid())`). Avoid public `USING (true)` or `WITH CHECK (true)` on tables storing private or sensitive user data.

## 2026-03-31 - Overly Permissive Read Access on Analytics Events Table

**Vulnerability:**
The `analytics_events` table had RLS enabled, but contained a policy `CREATE POLICY "Allow authenticated to read analytics" ON analytics_events FOR SELECT TO authenticated USING (true);`. This allowed any authenticated user to select and inspect all analytics tracking records across the platform (including user IDs, page URLs visited, session IDs, and timestamps of other users).

**Learning:**
Initial policy setups often grant blanket `USING (true)` access to `authenticated` users as a temporary placeholder for admin views or analytics, leading to user data leakage across tenant boundaries.

**Prevention:**
Ensure `analytics_events` or user activity logs enforce strict user boundary checks (`user_id = auth.uid()`) for regular `authenticated` users unless specific role-based security (e.g. admin checks) is implemented.
