import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gestion CORS pre-flight
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

    // 1. Initialisation avec SERVICE_ROLE pour contourner les limitations clientes
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 2. Vérification et authentification du demandeur
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé. Jeton de session absent." }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '').trim()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Session expirée ou utilisateur invalide." }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Extraction stricte du payload (Zero Trust : bookingId uniquement)
    const body = await req.json().catch(() => ({}))
    const { bookingId } = body

    if (!bookingId) {
      return new Response(JSON.stringify({ error: "Le paramètre bookingId est requis." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Rate Limiting anti-DoS financier (max 5 tentatives par 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count: recentAttempts } = await supabaseAdmin
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('event_name', 'cancel_booking_attempt')
      .gte('created_at', tenMinutesAgo)

    if (recentAttempts !== null && recentAttempts >= 5) {
      return new Response(JSON.stringify({ error: "Trop de requêtes d'annulation. Veuillez patienter 10 minutes." }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Enregistrement de la tentative dans un bloc try/catch robuste (PostgrestBuilder n'implémente pas .catch)
    try {
      await supabaseAdmin.from('analytics_events').insert([{
        event_name: 'cancel_booking_attempt',
        user_id: user.id,
        page_url: `cancel-booking/${bookingId}`,
        session_id: 'stripe-zero-loss-cancel'
      }])
    } catch (_analyticsErr) {
      console.warn("Analytics non bloquant:", _analyticsErr)
    }

    // 5. Récupération de la réservation depuis la BDD (Source de Vérité unique)
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*, trailers(*)')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Réservation introuvable." }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 6. Vérification des droits : l'utilisateur doit être le locataire ou le propriétaire
    const isRenter = booking.renter_id === user.id
    const isOwner = booking.owner_id === user.id || (booking.trailers && booking.trailers.owner_id === user.id)

    if (!isRenter && !isOwner) {
      return new Response(JSON.stringify({ error: "Action non autorisée sur cette réservation." }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 7. Vérification de l'éligibilité du statut
    if (booking.status === 'annule') {
      return new Response(JSON.stringify({ error: "Cette réservation a déjà été annulée." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const eligibleStatuses = ['paye', 'paid', 'confirmed']
    if (!eligibleStatuses.includes(booking.status)) {
      return new Response(JSON.stringify({ error: `Impossible d'annuler une réservation ayant le statut '${booking.status}'.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 8. Vérification que la réservation n'est pas déjà passée ou terminée
    const todayStr = new Date().toISOString().split('T')[0]
    const bookingEndStr = (booking.end_date || '').split('T')[0]

    if (bookingEndStr && bookingEndStr < todayStr) {
      return new Response(JSON.stringify({ 
        error: "La période de cette réservation est déjà terminée. L'annulation automatisée n'est plus permise." 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 9. Récupération de l'ID du PaymentIntent Stripe associé
    let paymentIntentId: string | null = booking.stripe_payment_intent_id || booking.stripe_payment_id || null

    if (!paymentIntentId) {
      try {
        const searchRes = await stripe.paymentIntents.search({
          query: `metadata['booking_id']:'${booking.id}'`,
          limit: 1,
        })
        if (searchRes.data && searchRes.data.length > 0) {
          paymentIntentId = searchRes.data[0].id
        }
      } catch (searchErr: any) {
        console.warn("Recherche PaymentIntent via search API non concluante :", searchErr?.message)
      }
    }

    if (!paymentIntentId) {
      try {
        const sessions = await stripe.checkout.sessions.list({ limit: 100 })
        const matched = sessions.data.find(
          (s: any) => String(s.client_reference_id) === String(booking.id) ||
                      String(s.metadata?.booking_id) === String(booking.id)
        )
        if (matched && matched.payment_intent) {
          paymentIntentId = typeof matched.payment_intent === 'string'
            ? matched.payment_intent
            : (matched.payment_intent as any).id
        }
      } catch (sessionErr: any) {
        console.warn("Recherche Stripe Checkout Session non concluante :", sessionErr?.message)
      }
    }

    if (!paymentIntentId) {
      // Si la réservation est une réservation de test sans flux bancaire Stripe direct
      const isManualOrTestBooking = !booking.stripe_payment_id && !booking.stripe_payment_intent_id

      if (isManualOrTestBooking) {
        const { error: cancelError } = await supabaseAdmin
          .from('bookings')
          .update({
            status: 'annule',
            refund_amount: 0,
            stripe_fee: 0,
            cancelled_at: new Date().toISOString(),
            cancelled_by: user.id,
          })
          .eq('id', booking.id)

        if (cancelError) {
          throw new Error(`Échec de la mise à jour du statut en base de données : ${cancelError.message}`)
        }

        return new Response(JSON.stringify({
          success: true,
          bookingId: booking.id,
          status: 'annule',
          totalPaid: Number(booking.total_price) || 0,
          stripeFee: 0,
          refundAmount: 0,
          policyApplied: 'manual_test_booking_cancelled',
          message: isOwner
            ? "Réservation annulée par le propriétaire. Les dates ont été libérées dans le calendrier."
            : "Réservation annulée avec succès. Les dates ont été libérées dans le calendrier (aucun débit Stripe à rembourser pour cette réservation)."
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ 
        error: "Impossible de localiser la transaction de paiement Stripe liée à cette réservation." 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 10. Extraction des frais réels Stripe via expand: ['latest_charge.balance_transaction']
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.balance_transaction'],
    })

    const charge = paymentIntent.latest_charge as Stripe.Charge | undefined
    const balanceTransaction = charge?.balance_transaction as Stripe.BalanceTransaction | undefined

    // Frais Stripe réels facturés en centimes
    let stripeFeeCentimes = 0
    if (balanceTransaction && typeof balanceTransaction.fee === 'number') {
      stripeFeeCentimes = balanceTransaction.fee
    } else if (charge && typeof charge.amount === 'number') {
      // Repli prudent au tarif standard Stripe CH (1.5% + 0.30 CHF ou 2.9% + 0.30 CHF)
      stripeFeeCentimes = Math.round(charge.amount * 0.029 + 30)
    }

    const totalPaidCentimes = paymentIntent.amount_received || paymentIntent.amount

    // 11. Calcul du montant de remboursement (Politique Zero-Loss)
    let refundAmountCentimes = 0
    let policyApplied = ''

    if (isOwner) {
      // Cas Propriétaire : Le locataire reçoit 100% du montant payé, le propriétaire assume les coûts
      refundAmountCentimes = totalPaidCentimes
      policyApplied = 'owner_cancellation_100_percent'
    } else {
      // Cas Locataire : Remboursement total payé MOINS les frais Stripe réels (Zero-Loss pour Renger)
      refundAmountCentimes = Math.max(0, totalPaidCentimes - stripeFeeCentimes)
      policyApplied = 'zero_loss_renter_cancellation'
    }

    // 12. Déclenchement du remboursement Stripe (stripe.refunds.create)
    let stripeRefund = null
    if (refundAmountCentimes > 0) {
      stripeRefund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: refundAmountCentimes,
        reason: 'requested_by_customer',
        metadata: {
          booking_id: booking.id.toString(),
          cancelled_by: user.id,
          cancelled_role: isOwner ? 'owner' : 'renter',
          total_paid_centimes: totalPaidCentimes.toString(),
          stripe_fee_centimes: stripeFeeCentimes.toString(),
          refund_amount_centimes: refundAmountCentimes.toString(),
          policy: policyApplied,
        },
      })
    }

    // 13. Mise à jour de la table bookings pour passer le statut à 'annule' et libérer le calendrier
    const refundAmountCHF = parseFloat((refundAmountCentimes / 100).toFixed(2))
    const stripeFeeCHF = parseFloat((stripeFeeCentimes / 100).toFixed(2))

    const updateData: Record<string, any> = {
      status: 'annule',
      refund_amount: refundAmountCHF,
      stripe_fee: stripeFeeCHF,
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      stripe_payment_intent_id: paymentIntentId,
    }

    const { error: fullUpdateError } = await supabaseAdmin
      .from('bookings')
      .update(updateData)
      .eq('id', booking.id)

    if (fullUpdateError) {
      console.warn("Repli vers mise à jour simple du statut 'annule' :", fullUpdateError.message)
      const { error: simpleUpdateError } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'annule' })
        .eq('id', booking.id)

      if (simpleUpdateError) {
        throw new Error(`Échec de la mise à jour du statut en base de données : ${simpleUpdateError.message}`)
      }
    }

    // 14. Réponse JSON claire
    return new Response(JSON.stringify({
      success: true,
      bookingId: booking.id,
      status: 'annule',
      totalPaid: totalPaidCentimes / 100,
      stripeFee: stripeFeeCHF,
      refundAmount: refundAmountCHF,
      policyApplied,
      stripeRefundId: stripeRefund?.id || null,
      message: isOwner
        ? "Réservation annulée par le propriétaire. Le locataire a été remboursé à 100%."
        : `Réservation annulée. Vous avez été remboursé de ${refundAmountCHF.toFixed(2)} CHF (montant total déduction faite des frais bancaires Stripe incompressibles de ${stripeFeeCHF.toFixed(2)} CHF).`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error("Erreur dans cancel-booking:", err.message)
    return new Response(JSON.stringify({ error: err.message || "Erreur interne du serveur." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
