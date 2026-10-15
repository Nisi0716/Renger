-- ==============================================================================
-- MIGRATION : POLITIQUE D'ANNULATION AUTOMATISÉE ET DURCISSEMENT RLS
-- ==============================================================================

-- 1. Ajout des colonnes de traçabilité d'annulation et de paiement Stripe sur 'bookings'
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS stripe_fee numeric,
ADD COLUMN IF NOT EXISTS refund_amount numeric,
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancelled_by uuid references auth.users(id);

-- 2. Sécurisation de la vue 'trailer_booked_dates' pour Flatpickr
-- Garantit que les réservations annulées (status = 'annule') sont immédiatement libérées
CREATE OR REPLACE VIEW trailer_booked_dates AS
SELECT 
    trailer_id,
    start_date,
    end_date,
    status
FROM bookings
WHERE status IN ('confirmed', 'paid', 'active', 'paye', 'indisponible')
  AND status != 'annule';

-- 3. Durcissement RLS : Interdiction stricte de modification de statut par le client
-- Seul le 'service_role' (Edge Functions & Webhooks) a l'autorisation d'exécuter un UPDATE sur 'bookings'
DROP POLICY IF EXISTS "Prevent client updates on bookings" ON bookings;
CREATE POLICY "Prevent client updates on bookings" 
ON bookings 
FOR UPDATE 
TO authenticated 
USING (false) 
WITH CHECK (false);

COMMENT ON VIEW trailer_booked_dates IS 'Vue exposant les dates indisponibles pour le calendrier Flatpickr, excluant explicitement les réservations annulées.';
