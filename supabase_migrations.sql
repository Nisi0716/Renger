-- ==========================================
-- SCRIPT DE MIGRATION SUPABASE - RENGER PRO & TRACKING
-- ==========================================
-- ExÃ©cutez ce script dans l'Ã©diteur SQL de votre dashboard Supabase.

-- 1. Ajout des colonnes de GÃ©olocalisation pour les remorques
ALTER TABLE trailers 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS location_city text;

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
CREATE POLICY "Allow authenticated to read analytics" ON analytics_events FOR SELECT TO authenticated USING (true);

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
