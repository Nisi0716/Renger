-- ==========================================
-- 16. GESTION DU SOLDE ET DES RETRAITS PROPRIÉTAIRE (SEUIL MINIMUM 80 CHF)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 80.00),
    status TEXT NOT NULL DEFAULT 'en_attente', -- 'en_attente', 'en_cours', 'traite', 'vire', 'echoue'
    stripe_transfer_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payouts 
ADD COLUMN IF NOT EXISTS stripe_transfer_id text,
ADD COLUMN IF NOT EXISTS error_message text;

CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON public.payouts(user_id);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payouts" ON public.payouts;
CREATE POLICY "Users can view their own payouts" ON public.payouts
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can request a payout" ON public.payouts;
CREATE POLICY "Users can request a payout" ON public.payouts
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND amount >= 80.00);

DROP POLICY IF EXISTS "Admin can view all payouts" ON public.payouts;
CREATE POLICY "Admin can view all payouts" ON public.payouts
    FOR SELECT TO authenticated USING (public.is_syni_admin());
