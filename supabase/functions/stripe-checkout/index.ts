import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Formatage élégant de date suisse (JJ.MM.AAAA)
function formatSwissDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-')
    return `${d}.${m}.${y}`
  } catch {
    return dateStr
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    // 1. Authentification du locataire
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé." }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Utilisateur non authentifié." }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const { trailerId, startDate, endDate, cautionAmount } = body

    if (!trailerId || !startDate || !endDate) {
      return new Response(JSON.stringify({ error: "Paramètres de réservation manquants." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Récupération de l'annonce remorque
    const { data: trailer, error: trailerError } = await supabaseAdmin
      .from('trailers')
      .select('*')
      .eq('id', trailerId)
      .single()

    if (trailerError || !trailer) {
      return new Response(JSON.stringify({ error: "Remorque introuvable." }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (trailer.owner_id === user.id) {
      return new Response(JSON.stringify({ error: "Vous ne pouvez pas louer votre propre remorque." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (startDate < todayStr) {
      return new Response(JSON.stringify({ error: "La date de début ne peut pas être dans le passé." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (startDate > endDate) {
      return new Response(JSON.stringify({ error: "La date de fin doit être postérieure à la date de début." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Calculs financiers précis (Location + Frais Renger 5% min 4.90 CHF)
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    
    // Rate Limiting (VULN-11) : max 5 réservations récentes dans les 10 dernières minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentBookingsCount } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('renter_id', user.id)
      .gte('created_at', tenMinutesAgo);

    if (recentBookingsCount !== null && recentBookingsCount >= 5) {
      return new Response(JSON.stringify({ error: "Trop de tentatives de réservation. Veuillez patienter 10 minutes." }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérification stricte avant insertion (Prévention Surbooking - VULN-03)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: conflicts } = await supabaseAdmin
      .from('bookings')
      .select('id, status, created_at')
      .eq('trailer_id', trailerId)
      .in('status', ['paye', 'en_attente', 'indisponible'])
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    const hasValidConflict = conflicts?.some(c => {
      if (c.status === 'en_attente') {
         return c.created_at > thirtyMinutesAgo;
      }
      return true;
    });

    if (hasValidConflict) {
      return new Response(JSON.stringify({ 
        error: "Ces dates ne sont plus disponibles. Veuillez en choisir d'autres." 
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Prix de base de la location
    const totalRentalPrice = diffDays * Number(trailer.price)

    // Frais de traitement Renger acheteur : 5% avec minimum garanti de 4.90 CHF (arrondi suisse aux 5 centimes)
    const rawServiceFee = totalRentalPrice * 0.05
    const serviceFee = Math.max(4.90, Math.round(rawServiceFee * 20) / 20)
    
    // Total effectivement débité sur la carte
    const totalPaidPrice = parseFloat((totalRentalPrice + serviceFee).toFixed(2))

    // Montant de la caution (empreinte non débitée)
    const isHeavy = ['cheval', 'voiture', 'refrigere'].includes(trailer.category) || (trailer.payload && trailer.payload > 1200)
    const caution = Number(trailer.caution) > 0 ? Number(trailer.caution) : (isHeavy ? 400 : 200);

    // 4. Création de la réservation en statut 'en_attente'
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert([{
        trailer_id: trailer.id,
        renter_id: user.id,
        owner_id: trailer.owner_id,
        start_date: startDate,
        end_date: endDate,
        total_price: totalPaidPrice,
        status: 'en_attente'
      }])
      .select()
      .single()

    if (bookingError || !booking) {
      throw new Error("Erreur réservation BDD : " + (bookingError?.message || 'Inconnue'))
    }

    // URLs de redirection
    const rawOrigin = req.headers.get('origin') || req.headers.get('referer') || 'https://renger.ch'
    const origin = rawOrigin.replace(/\/+$/, '')
    const successUrl = `${origin}?payment=success&booking_id=${booking.id}`
    const cancelUrl = `${origin}?payment=cancel&booking_id=${booking.id}`

    // Filtre pour ne pas afficher le logo SVG/placeholder géant dans l'encart photo de Stripe
    const hasRealPhoto = trailer.image_url && 
      !trailer.image_url.includes('Logo') && 
      !trailer.image_url.includes('placehold.co') &&
      !trailer.image_url.endsWith('.svg')

    // 5. Création de la session Stripe avec 3 lignes distinctes et transparentes
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: booking.id.toString(),
      line_items: [
        // LIGNE 1 : Location de la remorque (montant revenant au propriétaire)
        {
          price_data: {
            currency: 'chf',
            product_data: {
              name: `Location : ${trailer.title} (${diffDays} jour${diffDays > 1 ? 's' : ''})`,
              description: `Période du ${formatSwissDate(startDate)} au ${formatSwissDate(endDate)}`,
              ...(hasRealPhoto ? { images: [trailer.image_url] } : {}),
            },
            unit_amount: Math.round(totalRentalPrice * 100),
          },
          quantity: 1,
        },
        // LIGNE 2 : Frais de traitement Renger (5%, min. 4.90 CHF)
        {
          price_data: {
            currency: 'chf',
            product_data: {
              name: `Frais de traitement Renger`,
              description: `Frais de service plateforme sécurisée (5%, min. 4.90 CHF)`,
            },
            unit_amount: Math.round(serviceFee * 100),
          },
          quantity: 1,
        }
      ],
      // Message de réassurance clair et visible au-dessus du bouton de validation
      custom_text: {
        submit: {
          message: `🛡️ Empreinte bancaire : La caution de ${caution} CHF n'est pas débitée (0 CHF prélevé). Elle sera automatiquement libérée sans frais après l'état des lieux de retour.`
        }
      },
      metadata: {
        booking_id: booking.id.toString(),
        trailer_id: trailer.id.toString(),
        renter_id: user.id,
        owner_id: trailer.owner_id,
        rental_price: totalRentalPrice.toFixed(2),
        service_fee: serviceFee.toFixed(2),
        caution_amount: caution.toString(),
      },
      payment_intent_data: {
        setup_future_usage: 'off_session',
        description: `Renger #${booking.id} - ${trailer.title}`,
        metadata: {
          booking_id: booking.id.toString(),
          rental_price: totalRentalPrice.toFixed(2),
          service_fee: serviceFee.toFixed(2),
          caution_amount: caution.toString(),
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return new Response(JSON.stringify({ 
      url: session.url, 
      bookingId: booking.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error("Erreur stripe-checkout:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

