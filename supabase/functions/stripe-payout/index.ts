import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gestion du pre-flight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Méthode non autorisée. Seul POST est accepté." }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error("Secret STRIPE_SECRET_KEY manquant.")

    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceRoleKey) throw new Error("Secret SERVICE_ROLE_KEY manquant.")

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://cwifrzajxrcpnqceyxnj.supabase.co'

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 1. Authentification stricte de l'utilisateur
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé. Jeton de session absent." }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Session invalide ou utilisateur non authentifié." }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Rate Limiting anti-DoS financier (max 5 demandes par 10 minutes par user.id)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count: recentAttempts } = await supabaseAdmin
      .from('rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action', 'stripe_payout')
      .gte('created_at', tenMinutesAgo)

    if (recentAttempts !== null && recentAttempts >= 5) {
      return new Response(JSON.stringify({ 
        error: "Trop de demandes de retrait récentes. Veuillez patienter 10 minutes avant de réitérer." 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Enregistrement de la tentative dans rate_limits
    try {
      await supabaseAdmin.from('rate_limits').insert([{
        user_id: user.id,
        action: 'stripe_payout'
      }])
    } catch (_rateErr) {
      console.warn("Journalisation rate_limits non bloquante:", _rateErr)
    }

    // 3. Récupération du profil propriétaire (Stripe Connect & statut PRO)
    let { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, stripe_account_id, is_pro')
      .eq('id', user.id)
      .maybeSingle()

    // Si le profil n'existe pas encore dans public.profiles, création automatique
    if (!profile && !profileErr) {
      const { data: newProfile, error: createErr } = await supabaseAdmin
        .from('profiles')
        .insert([{ id: user.id }])
        .select('id, stripe_account_id, is_pro')
        .maybeSingle()
      if (!createErr && newProfile) {
        profile = newProfile
      }
    }

    if (!profile) {
      console.error("Erreur récupération profil:", profileErr)
      return new Response(JSON.stringify({ 
        error: "Profil propriétaire introuvable. Veuillez recharger votre page de profil." 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!profile.stripe_account_id) {
      return new Response(JSON.stringify({ 
        error: "Aucun compte Stripe Connect associé. Veuillez d'abord configurer vos coordonnées bancaires via Stripe Connect dans vos paramètres." 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Calcul du solde réel côté serveur (ZERO TRUST : jamais confiance aux montants fournis par le client)
    const todayStr = new Date().toISOString().split('T')[0]

    // Récupérer toutes les réservations payées/confirmées du propriétaire
    const { data: bookings, error: bookingsErr } = await supabaseAdmin
      .from('bookings')
      .select('id, start_date, end_date, total_price, status, trailer_id, trailers(price)')
      .eq('owner_id', user.id)
      .in('status', ['paye', 'paid', 'confirmed'])

    if (bookingsErr) {
      throw new Error("Erreur de lecture des réservations : " + bookingsErr.message)
    }

    let totalNetEarnings = 0
    const isPro = !!profile.is_pro
    const commissionRate = isPro ? 1.00 : 0.80

    for (const b of (bookings || [])) {
      const endStr = b.end_date ? b.end_date.split('T')[0] : ''
      // Ne comptabiliser que les locations terminées (restitution effectuée avant aujourd'hui)
      if (endStr && todayStr > endStr) {
        const sStr = String(b.start_date).split('T')[0]
        const eStr = String(b.end_date).split('T')[0]
        const sDate = new Date(sStr + 'T00:00:00Z')
        const eDate = new Date(eStr + 'T00:00:00Z')
        const diffMs = Math.abs(eDate.getTime() - sDate.getTime())
        const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1)
        const dailyPrice = (b.trailers && (b.trailers as any).price != null) ? Number((b.trailers as any).price) : 0
        const baseRental = dailyPrice > 0 ? (days * dailyPrice) : (Number(b.total_price) || 0)
        totalNetEarnings += (baseRental * commissionRate)
      }
    }
    totalNetEarnings = Math.round(totalNetEarnings * 100) / 100

    // Récupérer tous les retraits déjà traités ou en cours (ignorer les échecs)
    const { data: pastPayouts, error: payoutsErr } = await supabaseAdmin
      .from('payouts')
      .select('id, amount, status')
      .eq('user_id', user.id)
      .in('status', ['en_attente', 'en_cours', 'vire', 'traite'])

    if (payoutsErr) {
      throw new Error("Erreur de lecture de l'historique des retraits : " + payoutsErr.message)
    }

    const totalWithdrawn = (pastPayouts || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const verifiedBalance = Math.max(0, Math.round((totalNetEarnings - totalWithdrawn) * 100) / 100)

    const MIN_PAYOUT_AMOUNT = 80.00
    if (verifiedBalance < MIN_PAYOUT_AMOUNT) {
      return new Response(JSON.stringify({ 
        error: `Solde insuffisant. Le seuil minimum de retrait est de ${MIN_PAYOUT_AMOUNT.toFixed(2)} CHF (Votre solde disponible vérifié : ${verifiedBalance.toFixed(2)} CHF).`,
        availableBalance: verifiedBalance,
        minThreshold: MIN_PAYOUT_AMOUNT
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payoutAmount = verifiedBalance

    // 5. Création de la ligne d'enregistrement dans `payouts` avec statut 'en_cours'
    const { data: payoutRow, error: insertErr } = await supabaseAdmin
      .from('payouts')
      .insert([{
        user_id: user.id,
        amount: payoutAmount,
        status: 'en_cours'
      }])
      .select()
      .single()

    if (insertErr || !payoutRow) {
      throw new Error("Impossible de créer l'enregistrement de retrait : " + (insertErr?.message || "Erreur base de données"))
    }

    // 6. Exécution du transfert bancaire vers le compte Stripe Connect du propriétaire
    let transfer
    try {
      transfer = await stripe.transfers.create({
        amount: Math.round(payoutAmount * 100), // En centimes suisses
        currency: 'chf',
        destination: profile.stripe_account_id,
        description: `Virement de gains locatifs Renger (${user.email || user.id})`,
        metadata: {
          user_id: user.id,
          payout_id: payoutRow.id,
          user_email: user.email || '',
          platform: 'Renger Suisse'
        }
      })
    } catch (stripeErr: any) {
      console.error("Échec du transfert Stripe Connect:", stripeErr)
      
      // Mise à jour de la demande en 'echoue' pour libérer le solde de l'utilisateur
      await supabaseAdmin
        .from('payouts')
        .update({ 
          status: 'echoue',
          error_message: stripeErr.message || "Erreur de virement Stripe"
        })
        .eq('id', payoutRow.id)

      return new Response(JSON.stringify({ 
        error: `Échec du virement Stripe : ${stripeErr.message || "Vérifiez que vos coordonnées bancaires sont bien validées sur Stripe Connect."}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 7. Mise à jour de la demande en 'vire' avec l'identifiant du transfert
    await supabaseAdmin
      .from('payouts')
      .update({ 
        status: 'vire',
        stripe_transfer_id: transfer.id
      })
      .eq('id', payoutRow.id)

    // Log analytique du versement réussi
    try {
      await supabaseAdmin.from('analytics_events').insert([{
        event_name: 'payout_completed',
        user_id: user.id,
        page_url: `stripe-payout/${payoutRow.id}`,
        session_id: transfer.id
      }])
    } catch (_) {}

    return new Response(JSON.stringify({
      success: true,
      amount: payoutAmount,
      transferId: transfer.id,
      status: 'vire',
      message: `Virement de ${payoutAmount.toFixed(2)} CHF effectué avec succès vers votre compte Stripe Connect.`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error("Erreur critique stripe-payout:", err)
    return new Response(JSON.stringify({ error: err.message || "Erreur interne lors du traitement du virement." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
