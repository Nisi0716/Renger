# Sentinel-Backend Journal

## 2026-04-02 - Overly Permissive Public INSERT RLS Policies on Impressions and Clicks Tables

**Vulnerability:**
The `impressions` and `clicks` tables used `CREATE POLICY "Allow public insert..." FOR INSERT TO public WITH CHECK (true);`. This permitted any unauthenticated or authenticated actor on the platform to insert impression and click events with arbitrary `user_id` values, enabling identity spoofing in telemetry logs and corrupting owner analytics metrics and user tracking data.

**Learning:**
Public INSERT policies created with `WITH CHECK (true)` on telemetry tables with an optional `user_id` column fail to restrict `user_id` to `auth.uid()` or `NULL`.

**Prevention:**
Always restrict public `INSERT` policies on telemetry tables storing optional user identifiers using `WITH CHECK (user_id IS NULL OR user_id = auth.uid())` to prevent user impersonation in analytics and event logs.

## 2026-04-01 - Missing Row-Level Security Policies on Profiles Table for Mutations

**Vulnerability:**
The `profiles` table stored user profile data alongside sensitive payment information (`stripe_customer_id`, `stripe_subscription_id`, `is_pro` status) added during Stripe migration, but lacked explicit Row-Level Security (RLS) policies for `INSERT` and `UPDATE` operations. Without strict `INSERT` and `UPDATE` policies enforcing `auth.uid() = id`, authenticated users could potentially modify another user's profile record, alter subscription flags (`is_pro`), or tamper with associated Stripe Customer IDs.

**Learning:**
When extending core schema tables like `profiles` with new columns (`is_pro`, `stripe_customer_id`), RLS policies were not explicitly added to restrict mutations to the record owner (`auth.uid() = id`).

**Prevention:**
Always explicitly enable Row-Level Security (`ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`) and attach strict mutation policies (`FOR INSERT` and `FOR UPDATE`) checking `auth.uid() = id` on tables containing user-specific or account-linked data.

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
