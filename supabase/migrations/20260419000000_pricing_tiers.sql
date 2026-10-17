-- ==========================================
-- 21. TARIFS DÉGRESSIFS & PAR DURÉE (PRICING TIERS)
-- ==========================================

-- 1. Colonne pricing_tiers sur trailers (JSONB, tableau de paliers { duration, unit: 'hours'|'days', price })
ALTER TABLE public.trailers ADD COLUMN IF NOT EXISTS pricing_tiers jsonb DEFAULT '[]'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trailers_pricing_tiers_is_array_chk'
    ) THEN
        ALTER TABLE public.trailers
            ADD CONSTRAINT trailers_pricing_tiers_is_array_chk
            CHECK (pricing_tiers IS NULL OR jsonb_typeof(pricing_tiers) = 'array');
    END IF;
END $$;

-- 2. Colonnes sur bookings pour conserver le montant de location hors frais et la formule horaire éventuelle
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rental_price numeric(10, 2);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS duration_hours integer;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bookings_duration_hours_positive_chk'
    ) THEN
        ALTER TABLE public.bookings
            ADD CONSTRAINT bookings_duration_hours_positive_chk
            CHECK (duration_hours IS NULL OR duration_hours > 0);
    END IF;
END $$;

-- 3. Migration du type de total_price sur bookings vers numeric(10,2) pour supporter les centimes (frais Renger 4.90 CHF, etc.)
-- On supprime les policies dépendant de total_price avant l'ALTER TABLE, puis on les recrée
DROP POLICY IF EXISTS "Blocage de dates par le propriétaire" ON public.bookings;
DROP POLICY IF EXISTS "Seul le propriétaire peut bloquer ses remorques" ON public.bookings;
DROP POLICY IF EXISTS "Strict booking insertion" ON public.bookings;

ALTER TABLE public.bookings ALTER COLUMN total_price TYPE numeric(10, 2) USING total_price::numeric(10, 2);

CREATE POLICY "Blocage de dates par le propriétaire" ON public.bookings
FOR INSERT WITH CHECK (
    status = 'indisponible' AND total_price = 0 AND auth.uid() = (
        SELECT trailers.owner_id FROM trailers WHERE trailers.id = bookings.trailer_id
    )
);

CREATE POLICY "Seul le propriétaire peut bloquer ses remorques" ON public.bookings
FOR INSERT WITH CHECK (
    status = 'indisponible' AND total_price = 0 AND auth.uid() = owner_id AND auth.uid() = (
        SELECT trailers.owner_id FROM trailers WHERE trailers.id = bookings.trailer_id
    )
);

CREATE POLICY "Strict booking insertion" ON public.bookings
FOR INSERT WITH CHECK (
    ((status = 'indisponible' AND total_price = 0 AND auth.uid() = (
        SELECT trailers.owner_id FROM trailers WHERE trailers.id = bookings.trailer_id
    ) AND auth.uid() = renter_id))
    OR
    ((status = 'en_attente' AND auth.uid() = renter_id AND auth.uid() <> (
        SELECT trailers.owner_id FROM trailers WHERE trailers.id = bookings.trailer_id
    )))
);

-- 4. Assurer que trailers.price supporte les centimes
ALTER TABLE public.trailers ALTER COLUMN price TYPE numeric(10, 2) USING price::numeric(10, 2);
