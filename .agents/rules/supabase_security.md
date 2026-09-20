---
name: Supabase Security Rules
description: Strict security invariants and guidelines for developing Renger with Supabase, Vanilla JS, and Stripe.
trigger: always_on
---

# Supabase & Stripe Security Guidelines

When modifying or creating new features in this codebase (Vanilla JS frontend, Supabase backend, Stripe Edge Functions), always adhere to the following zero-trust principles:

## 1. Financial Transactions & Stripe
*   **Never trust the client**: Never read critical financial amounts (like caution amounts, prices, or discounts) from the client payload. Always query the source of truth in the PostgreSQL database (`trailers`, `bookings`) inside the Edge Function.
*   **Security Deposits (Cautions)**: For Stripe checkout sessions involving a caution without immediate charge, use `payment_intent_data: { setup_future_usage: 'off_session' }` and do NOT create a 0 CHF line item for it.
*   **Rate Limiting**: Any Edge Function interacting with Stripe APIs must implement a strict rate limiter (e.g., max 5 requests per 10 minutes per `user.id`) by querying the database, to prevent financial DoS attacks.

## 2. Row Level Security (RLS) & Authorization
*   **Database is the Enforcer**: Never rely on frontend JavaScript conditions (e.g., `if (currentUser.id !== ownerId)`) for authorization. Always enforce authorization strictly using PostgreSQL RLS policies (`FOR INSERT`, `FOR UPDATE`, `FOR DELETE`).
*   **Status Immutability**: Client applications must never have `UPDATE` permissions on critical status columns (e.g., `status`, `total_price` in `bookings`). Only `service_role` (Edge Functions / Webhooks) can alter them.

## 3. Concurrency & Race Conditions
*   **Prevent Overlaps at the DB Level**: When dealing with bookings or time-based availability, do not rely on JS or Edge Function sequential reads. Always implement PostgreSQL exclusion constraints (e.g., `btree_gist`) to prevent concurrent overlapping transactions.

## 4. Storage & File Uploads
*   **Private by Default**: Sensitive buckets (like `inspections`) must be completely private. Do not provide public URL fallbacks in the frontend. Use signed URLs exclusively.
*   **Strict Validation**: Always validate file uploads. Check the MIME type, whitelist extensions (reject `.svg`, `.html`), and perform "Magic Bytes" validation (reading the first 4 bytes) before interacting with Supabase Storage.

