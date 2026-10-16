# Sentinel-Backend Journal

## 2026-04-18 - Missing Webhook Event Idempotency in Stripe Webhook Handler Causing Compounding Boost Durations

**Vulnerability:**
The `stripe-webhook` Edge Function processed `checkout.session.completed` events without verifying if the event (`event.id`) had already been processed. When Stripe retried delivering webhooks or when duplicate event payloads were received for trailer boost purchases (`metadata.type === 'boost'`), the handler repeatedly re-executed `startDate.setDate(startDate.getDate() + durationDays)` on the updated `boost_end_date`, exponentially/linearly compounding the boost duration for a single payment (e.g. 7 days becoming 14, 21, or 28 days), as well as triggering duplicate booking confirmation emails and profile subscription updates.

**Learning:**
Stripe webhooks do not guarantee at-most-once delivery and will retry unacknowledged requests. Without checking event IDs against a persisted idempotency table, state mutations (especially relative/additive mutations like extending dates) will execute multiple times on retries or duplicate deliveries.

**Prevention:**
Always store processed Stripe event IDs (`event.id`) in a dedicated `processed_webhook_events` table protected by RLS. Query this table at the start of the webhook handler and return an immediate 200 OK response if `event.id` is already recorded before executing any state-mutating side effects.

## 2026-04-17 - Client-Side Privilege Escalation on Profiles Table via Unprotected PRO and Stripe Fields

**Vulnerability:**
While `profiles` table had an UPDATE policy restricting updates to record owners (`auth.uid() = id`) and a trigger (`protect_is_admin`) preventing `is_admin` escalation, sensitive financial and subscription columns (`is_pro`, `stripe_customer_id`, `stripe_subscription_id`) were omitted from trigger checks. Any authenticated user could send a client-side UPDATE query to set `is_pro = true` for free, skipping the 39 CHF/month Stripe PRO subscription fee and taking 100% of payout earnings (0% platform commission instead of 20%), or modify Stripe Customer IDs.

**Learning:**
Relying solely on `auth.uid() = id` for table UPDATE policies allows users to modify any column on their record. When a table stores both user-editable fields (e.g. name, avatar, IBAN) and backend-managed privileged fields (`is_pro`, `is_admin`, `stripe_customer_id`), an explicit trigger or column-level security check must protect all backend-managed fields from direct client updates.

**Prevention:**
Always restrict modifications of sensitive financial, subscription, or role columns (`is_pro`, `is_admin`, `stripe_customer_id`, `stripe_subscription_id`) to `service_role` or authorized supreme administrators in `BEFORE UPDATE` database triggers.

## 2026-04-02 - Overly Permissive Row-Level Security Insert Policies on Impressions and Clicks Tables

**Vulnerability:**
The `impressions` and `clicks` tables used `CREATE POLICY "Allow public insert to impressions" ON impressions FOR INSERT TO public WITH CHECK (true);` and `CREATE POLICY "Allow public insert to clicks" ON clicks FOR INSERT TO public WITH CHECK (true);`. This permitted any unauthenticated or authenticated user to insert arbitrary records into `impressions` and `clicks` while spoofing any `user_id` value (e.g. associating clicks/impressions with victim user IDs), corrupting user analytics and telemetry data.

**Learning:**
Public INSERT policies for analytics or telemetry tables were created with unconstrained `WITH CHECK (true)` checks to allow unauthenticated visitor tracking without enforcing that provided `user_id` fields match `auth.uid()` when authenticated, or remain `NULL` when anonymous.

**Prevention:**
When allowing public inserts on tracking/telemetry tables with optional `user_id` foreign keys, always enforce `WITH CHECK (user_id IS NULL OR user_id = auth.uid())` so anonymous requests cannot supply arbitrary `user_id` values and authenticated requests can only insert records attributed to themselves.

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
