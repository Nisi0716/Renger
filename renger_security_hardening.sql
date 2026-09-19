-- =========================================================================
-- RENGER SECURITY HARDENING MIGRATION - ZERO TRUST POLICIES
-- =========================================================================

-- 1. EXTENSIONS NÉCESSAIRES
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. VERROUILLAGE DES MISES À JOUR SUR BOOKINGS
REVOKE UPDATE (status, total_price, trailer_id, renter_id, owner_id) 
ON public.bookings FROM authenticated, anon;

-- Seul le service_role (Edge Functions / Webhooks) peut modifier les statuts
CREATE OR REPLACE FUNCTION prevent_unauthorized_booking_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (auth.role() <> 'service_role' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        RAISE EXCEPTION 'Action interdite : Seul le webhook Stripe certifié peut modifier le statut de paiement.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_booking_status ON public.bookings;
CREATE TRIGGER tr_protect_booking_status
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION prevent_unauthorized_booking_update();

-- 3. PROTECTION CONTRE LE SURBOOKING & DOUBLE DÉBIT (CONTRAINTE GIST)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_overlapping_bookings;
ALTER TABLE public.bookings
ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING gist (
    trailer_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
)
WHERE (status IN ('paye', 'indisponible'));

-- 4. POLITIQUES RLS SUR TRAILERS
ALTER TABLE public.trailers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view trailers" ON public.trailers;
CREATE POLICY "Public can view trailers" ON public.trailers
FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Owners can insert own trailers" ON public.trailers;
CREATE POLICY "Owners can insert own trailers" ON public.trailers
FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update own trailers" ON public.trailers;
CREATE POLICY "Owners can update own trailers" ON public.trailers
FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete own trailers" ON public.trailers;
CREATE POLICY "Owners can delete own trailers" ON public.trailers
FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- 5. POLITIQUES RLS SUR BOOKINGS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties can view bookings" ON public.bookings;
CREATE POLICY "Parties can view bookings" ON public.bookings
FOR SELECT TO authenticated
USING (auth.uid() = renter_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Strict booking insertion" ON public.bookings;
CREATE POLICY "Strict booking insertion" ON public.bookings
FOR INSERT TO authenticated
WITH CHECK (
    -- Cas 1 : Propriétaire bloque ses dates
    (
        status = 'indisponible' 
        AND total_price = 0 
        AND auth.uid() = (SELECT owner_id FROM public.trailers WHERE id = trailer_id)
        AND auth.uid() = renter_id
    )
    OR
    -- Cas 2 : Réservation normale initiée par le locataire
    (
        status = 'en_attente'
        AND auth.uid() = renter_id
        AND auth.uid() <> (SELECT owner_id FROM public.trailers WHERE id = trailer_id)
    )
);

-- 6. POLITIQUES RLS SUR MESSAGES (CHAT PRIVÉ)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages" ON public.messages
FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Sender can insert message" ON public.messages;
CREATE POLICY "Sender can insert message" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- 7. STOCKAGE SECURISE (BUCKETS SUPABASE)
UPDATE storage.buckets
SET public = false
WHERE id = 'inspections';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
    max_file_size = 5242880
WHERE id IN ('trailers-images', 'avatars');

-- 8. PROTECTION CONTRE LA FALSIFICATION HEURISTIQUE (VULN-10)
CREATE OR REPLACE FUNCTION verify_inspection_message()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.content LIKE '📸 [État des lieux%' THEN
        IF NOT EXISTS (
            SELECT 1 FROM storage.objects 
            WHERE bucket_id = 'inspections' 
            AND name = NEW.image_url 
            AND owner = auth.uid()
        ) THEN
            RAISE EXCEPTION 'Falsification d''état des lieux détectée (Image absente ou propriétaire invalide).';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_verify_inspection_message ON public.messages;
CREATE TRIGGER tr_verify_inspection_message
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION verify_inspection_message();
