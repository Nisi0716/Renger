# Sentinel-Backend Journal

## 2026-03-31 - Overly Permissive Row-Level Security on Analytics Events Table

**Vulnerability:**
The `analytics_events` table was protected by `CREATE POLICY "Allow authenticated to read analytics" ON analytics_events FOR SELECT TO authenticated USING (true);`. This permitted any authenticated user to query and extract all analytics records across the platform, exposing sensitive tracking information such as user IDs, session IDs, and browsing history (`page_url`, `event_name`).

**Learning:**
Initial boilerplate SQL used `USING (true)` for reading analytics under the assumption that all authenticated users or admins could read global events, without enforcing individual ownership or role restrictions.

**Prevention:**
Always restrict RLS `SELECT` policies on analytics or tracking tables storing user/session identifiers to `auth.uid() = user_id`. Global read access on sensitive telemetry data should never be granted to `authenticated` users via `USING (true)`.

## 2026-03-30 - Overly Permissive Row-Level Security on Inspections Table

**Vulnerability:**
The `inspections` table was created with `ENABLE ROW LEVEL SECURITY;`, but contained a dangerously permissive policy `CREATE POLICY "Allow participants to read inspections" ON inspections FOR SELECT USING (true);` alongside `CREATE POLICY "Allow public insert to inspections" ON inspections FOR INSERT TO public WITH CHECK (true);`. This allowed any unauthenticated or authenticated user on the internet to read or insert inspection records, leaking sensitive geolocation data (latitude, longitude), timestamps, and image URLs of private inspections across all rentals.

**Learning:**
Developers used `USING (true)` and `WITH CHECK (true)` during initial prototyping to allow easy insertion and reading without checking user authentication or relationship to the trailer/booking.

**Prevention:**
Always restrict RLS `SELECT` policies to authenticated users who are either the owner of the resource (`user_id = auth.uid()`) or the owner of the linked parent resource (`trailer_id IN (SELECT id FROM trailers WHERE owner_id = auth.uid())`). Avoid public `USING (true)` or `WITH CHECK (true)` on tables storing private or sensitive user data.
