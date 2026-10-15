-- ==========================================
-- SCRIPT DE MIGRATION SUPABASE - RENGER PRO & TRACKING
-- ==========================================
-- ExÃ©cutez ce script dans l'Ã©diteur SQL de votre dashboard Supabase.

-- 1. Ajout des colonnes de GÃ©olocalisation pour les remorques
ALTER TABLE trailers 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS location_city text,
ADD COLUMN IF NOT EXISTS location text;

-- 2. CrÃ©ation de la table des IMPRESSIONS (Vues globales dans la grille)
CREATE TABLE IF NOT EXISTS impressions (
    id uuid default gen_random_uuid() primary key,
    trailer_id bigint references trailers(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete set null, -- null si visiteur anonyme
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. CrÃ©ation de la table des CLICS (Vues de la page dÃ©tail)
CREATE TABLE IF NOT EXISTS clicks (
    id uuid default gen_random_uuid() primary key,
    trailer_id bigint references trailers(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. CrÃ©ation de la table de TRACKING / ANALYTICS (RGPD/nLPD)
CREATE TABLE IF NOT EXISTS analytics_events (
    id uuid default gen_random_uuid() primary key,
    event_name text not null,
    page_url text,
    user_id uuid references auth.users(id) on delete set null,
    session_id text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. SÃ©curitÃ© : Activation de Row Level Security (RLS)
ALTER TABLE impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- 6. Politiques d'insertion (Tout le monde peut crÃ©er un Ã©vÃ©nement, mÃªme non connectÃ©)
CREATE POLICY "Allow public insert to impressions" ON impressions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public insert to clicks" ON clicks FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public insert to analytics_events" ON analytics_events FOR INSERT TO public WITH CHECK (true);

-- 7. Politiques de lecture (Seul le propriÃ©taire de la remorque peut voir ses impressions et clics)
CREATE POLICY "Allow owners to read impressions" ON impressions FOR SELECT USING (
  trailer_id IN (SELECT id FROM trailers WHERE owner_id = auth.uid())
);
CREATE POLICY "Allow owners to read clicks" ON clicks FOR SELECT USING (
  trailer_id IN (SELECT id FROM trailers WHERE owner_id = auth.uid())
);

-- Seul l'admin (ou authentifiÃ©) peut lire les analytics_events (Ã  ajuster selon vos rÃ´les)
-- Seul l'utilisateur peut lire ses propres analytics_events
CREATE POLICY "Allow users to read own analytics" ON analytics_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ==========================================
-- FIN DU SCRIPT
-- ==========================================


-- 8. CrÃ©ation de la table des INSPECTIONS (Anti-arnaque)
CREATE TABLE IF NOT EXISTS inspections (
    id uuid default gen_random_uuid() primary key,
    booking_id uuid, -- Facultatif
    trailer_id bigint references trailers(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete set null,
    mode text not null, -- 'departure' or 'return'
    step integer not null, -- 1 to 4
    image_url text not null,
    latitude double precision,
    longitude double precision,
    accuracy double precision,
    timestamp timestamp with time zone not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to insert inspections" ON inspections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow participants and owners to read inspections" ON inspections FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    trailer_id IN (SELECT id FROM trailers WHERE owner_id = auth.uid())
);


-- 9. Ajout de la date de fin de boost pour les remorques
ALTER TABLE trailers
ADD COLUMN IF NOT EXISTS boost_end_date timestamp with time zone;

-- 10. Ajout des colonnes Stripe & PRO sur profiles (Abonnements PRO & Portail Stripe)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription ON profiles(stripe_subscription_id);

-- 11. Table de contrôle de débit (Rate Limiting anti-DDoS / Stripe abuse)
CREATE TABLE IF NOT EXISTS rate_limits (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    action text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(user_id, action, created_at);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read own rate limits" ON rate_limits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated users to insert own rate limits" ON rate_limits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 12. Colonne d'administration suprême Syni sur profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- Attribution du privilège administrateur suprême
UPDATE profiles SET is_admin = true WHERE email = 'enism2007@hotmail.com';

-- Protection Zéro-Confiance : Empêcher l'escalade de privilège par modification directe du client
CREATE OR REPLACE FUNCTION protect_is_admin()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
        IF auth.jwt() ->> 'email' <> 'enism2007@hotmail.com' AND current_user <> 'service_role' THEN
            NEW.is_admin = OLD.is_admin;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_is_admin ON profiles;
CREATE TRIGGER trg_protect_is_admin
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION protect_is_admin();

-- 13. Cycle de vie universel & Soft-delete CO art. 958f (Conservation légale 10 ans)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted ON profiles(is_deleted);

ALTER TABLE trailers
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_trailers_is_deleted ON trailers(is_deleted);

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_bookings_is_deleted ON bookings(is_deleted);


-- ============ 20260415000000_search_events ============
-- Migration : collecte des recherches du catalogue (alimente Syni Copilot / Google Colab)
-- Principes : minimisation des données (nLPD) -> AUCUN user_id, texte de recherche tronqué à 80 car.,
-- insertion publique strictement bornée par des contraintes, lecture réservée à l'administrateur suprême.

-- 0. Fonction d'autorisation (SECURITY DEFINER pour éviter toute récursion RLS sur profiles)
CREATE OR REPLACE FUNCTION public.is_syni_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true);
$$;

-- 1. Table des recherches
CREATE TABLE IF NOT EXISTS public.search_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    category text NOT NULL DEFAULT 'all'
        CHECK (category IN ('all','utilitaire','cheval','voiture','moto','refrigere','porte-velo','bagage')),
    search_text text CHECK (search_text IS NULL OR char_length(search_text) <= 80),
    has_dates boolean NOT NULL DEFAULT false,
    results_count integer NOT NULL DEFAULT 0 CHECK (results_count BETWEEN 0 AND 10000),
    results_avg_price numeric(8,2) CHECK (results_avg_price IS NULL OR results_avg_price BETWEEN 0 AND 100000),
    results_min_price numeric(8,2) CHECK (results_min_price IS NULL OR results_min_price BETWEEN 0 AND 100000),
    results_max_price numeric(8,2) CHECK (results_max_price IS NULL OR results_max_price BETWEEN 0 AND 100000),
    session_id text CHECK (session_id IS NULL OR char_length(session_id) <= 64),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_search_events_created_at ON public.search_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_events_category ON public.search_events (category, created_at DESC);

-- 2. Sécurité : RLS
ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert to search_events" ON public.search_events;
CREATE POLICY "Allow public insert to search_events" ON public.search_events
    FOR INSERT TO public WITH CHECK (true);  -- bornes appliquées par les CHECK de colonnes

DROP POLICY IF EXISTS "Allow admin to read search_events" ON public.search_events;
CREATE POLICY "Allow admin to read search_events" ON public.search_events
    FOR SELECT TO authenticated USING (public.is_syni_admin());

-- Aucune politique UPDATE / DELETE : les événements sont immuables côté client.

-- 3. Lecture administrateur des signaux d'intérêt utilisés par Syni (impressions, clics, analytics)
DROP POLICY IF EXISTS "Allow admin to read impressions" ON public.impressions;
CREATE POLICY "Allow admin to read impressions" ON public.impressions
    FOR SELECT TO authenticated USING (public.is_syni_admin());

DROP POLICY IF EXISTS "Allow admin to read clicks" ON public.clicks;
CREATE POLICY "Allow admin to read clicks" ON public.clicks
    FOR SELECT TO authenticated USING (public.is_syni_admin());

DROP POLICY IF EXISTS "Allow admin to read analytics_events" ON public.analytics_events;
CREATE POLICY "Allow admin to read analytics_events" ON public.analytics_events
    FOR SELECT TO authenticated USING (public.is_syni_admin());

-- ==========================================
-- 15. EXPÉRIENCE PROPRIÉTAIRE RENGER (VIREMENT 48H & SPÉCIFICITÉS SUISSES)
-- ==========================================
-- Profils : Titulaire du compte et IBAN suisse pour virement bancaire sous 48h
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS iban text;

-- Remorques : Système de freinage, plaque cantonale suisse, caution personnalisable et antivol
ALTER TABLE trailers 
ADD COLUMN IF NOT EXISTS is_braked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS license_plate text,
ADD COLUMN IF NOT EXISTS deposit_amount integer DEFAULT 200,
ADD COLUMN IF NOT EXISTS has_hitch_lock boolean DEFAULT false;
