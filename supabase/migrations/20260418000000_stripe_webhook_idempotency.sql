-- Migration: Stripe Webhook Event Idempotency & Zero Trust Policy
-- Prevents duplicate event processing (e.g., double boosting duration extensions, duplicate email dispatches)

-- 1. Create table to store processed Stripe webhook event IDs
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
    id text PRIMARY KEY, -- Stripe event.id (e.g. evt_1N...)
    event_type text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_created_at ON public.processed_webhook_events(created_at DESC);

-- 2. Enable Row Level Security (RLS) on processed_webhook_events
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- 3. Zero-Trust Policy: Restrict all direct client access (only service_role key can read/insert)
DROP POLICY IF EXISTS "Prevent direct client access to processed_webhook_events" ON public.processed_webhook_events;
CREATE POLICY "Prevent direct client access to processed_webhook_events"
ON public.processed_webhook_events
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
