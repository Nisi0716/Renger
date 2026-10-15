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
