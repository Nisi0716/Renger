-- Migration Supabase: Colonne is_admin pour le panel d'administration suprême Syni
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- Attribution automatique du statut administrateur suprême pour les comptes officiels
UPDATE profiles SET is_admin = true WHERE email IN ('enism2007@hotmail.com', 'einsm2007@gmail.com');

-- Fonction de contrôle d'accès administrateur suprême réutilisable
CREATE OR REPLACE FUNCTION public.is_syni_admin()
RETURNS boolean AS $$
BEGIN
    RETURN (
        auth.jwt() ->> 'email' IN ('enism2007@hotmail.com', 'einsm2007@gmail.com')
        OR current_user = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy pour permettre aux admins de lire toutes les réservations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bookings' AND policyname = 'Admin can view all bookings'
    ) THEN
        CREATE POLICY "Admin can view all bookings" ON public.bookings
        FOR SELECT TO authenticated
        USING (public.is_syni_admin());
    END IF;
END $$;

-- Protection Zéro-Confiance : Empêcher l'escalade de privilège par modification directe du client
CREATE OR REPLACE FUNCTION protect_is_admin()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
        IF auth.jwt() ->> 'email' NOT IN ('enism2007@hotmail.com', 'einsm2007@gmail.com') AND current_user <> 'service_role' THEN
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
