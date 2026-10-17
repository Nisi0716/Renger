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

