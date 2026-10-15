-- Migration: Prevent non-admin and non-service_role users from setting is_pro status or altering Stripe identifiers on profiles table.
-- Extends protect_is_admin trigger function so that updates to is_pro, stripe_customer_id, and stripe_subscription_id
-- are restricted to service_role or supreme administrator (enism2007@hotmail.com).

CREATE OR REPLACE FUNCTION protect_is_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- Protection zero-confiance contre l'escalade de privilège d'administration suprême
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
        IF auth.jwt() ->> 'email' <> 'enism2007@hotmail.com' AND current_user <> 'service_role' THEN
            NEW.is_admin = OLD.is_admin;
        END IF;
    END IF;

    -- Protection zero-confiance contre l'auto-promotion PRO et l'altération des identifiants Stripe
    IF (NEW.is_pro IS DISTINCT FROM OLD.is_pro OR
        NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id OR
        NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id) THEN
        IF auth.jwt() ->> 'email' <> 'enism2007@hotmail.com' AND current_user <> 'service_role' THEN
            NEW.is_pro = OLD.is_pro;
            NEW.stripe_customer_id = OLD.stripe_customer_id;
            NEW.stripe_subscription_id = OLD.stripe_subscription_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_is_admin ON profiles;
CREATE TRIGGER trg_protect_is_admin
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION protect_is_admin();
