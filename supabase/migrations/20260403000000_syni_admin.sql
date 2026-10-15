-- Migration Supabase: Colonne is_admin pour le panel d'administration suprême Syni
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- Attribution automatique du statut administrateur suprême pour le compte officiel
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

-- ==============================================================================
-- CYCLE DE VIE UNIVERSEL & SOFT-DELETE CO ART. 958f (CONSERVATION LÉGALE 10 ANS)
-- ==============================================================================

-- 1. Soft-delete sur les profils utilisateurs
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted ON profiles(is_deleted);

-- 2. Soft-delete sur la flotte de remorques
ALTER TABLE trailers
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_trailers_is_deleted ON trailers(is_deleted);

-- 3. Soft-delete sur les réservations et transactions financières
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bookings_is_deleted ON bookings(is_deleted);
