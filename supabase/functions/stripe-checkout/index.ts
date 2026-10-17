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

interface PricingTier {
  unit: 'hours' | 'days'
  duration: number
  price: number
}

function normalizePricingTiers(rawTiers: unknown): PricingTier[] {
  let parsed: unknown = rawTiers
  if (typeof parsed === 'string') {
    const trimmed = parsed.trim()
    if (!trimmed) return []
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []

  const dedupMap = new Map<string, PricingTier>()
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const rawUnit = String(rec.unit || '').toLowerCase().trim()
    let unit: 'hours' | 'days' | null = null
    if (['hour', 'hours', 'h', 'heure', 'heures'].includes(rawUnit)) {
      unit = 'hours'
    } else if (['day', 'days', 'j', 'jour', 'jours', 'd'].includes(rawUnit)) {
      unit = 'days'
    }
    if (!unit) continue

    const duration = parseInt(String(rec.duration ?? rec.value ?? rec.count ?? ''), 10)
    const price = Math.round(Number(rec.price) * 100) / 100
    if (!Number.isFinite(duration) || duration <= 0 || duration > 365) continue
    if (unit === 'hours' && duration > 72) continue
    if (!Number.isFinite(price) || price <= 0 || price > 50000) continue

    const key = `${unit}:${duration}`
    const existing = dedupMap.get(key)
    if (!existing || price < existing.price) {
      dedupMap.set(key, { unit, duration, price })
    }
  }

  const result = Array.from(dedupMap.values())
  result.sort((a, b) => {
    if (a.unit !== b.unit) return a.unit === 'hours' ? -1 : 1
    return a.duration - b.duration
  })
  return result
}

function calculateTieredRentalPrice(
  trailer: { price?: number | string; pricing_tiers?: unknown },
  diffDays: number,
  durationHours?: number | null
) {
  const baseDailyPrice = Math.max(0, Number(trailer?.price) || 0)
  const tiers = normalizePricingTiers(trailer?.pricing_tiers)
  const safeDays = Math.max(1, Math.trunc(diffDays) || 1)
  const requestedHours = durationHours !== null && durationHours !== undefined
    ? parseInt(String(durationHours), 10)
    : null

  if (safeDays === 1 && requestedHours && requestedHours > 0) {
    const hourTier = tiers.find(t => t.unit === 'hours' && t.duration === requestedHours)
    if (hourTier) {
      const p = Math.round(hourTier.price * 100) / 100
      return {
        rentalPrice: p,
        mode: 'hours' as const,
        durationHours: hourTier.duration,
        durationDays: 1,
        hasCustomTierApplied: true,
        label: `Forfait ${hourTier.duration}h × ${hourTier.price} CHF`,
      }
    }
  }

  const dayTiersMap = new Map<number, number>()
  dayTiersMap.set(1, baseDailyPrice)
  for (const t of tiers) {
    if (t.unit === 'days' && t.duration >= 1 && t.duration <= safeDays) {
      const existing = dayTiersMap.get(t.duration)
      if (existing === undefined || t.price < existing) {
        dayTiersMap.set(t.duration, t.price)
      }
    }
  }

  const hasAnyMultiDayOrCustomDayTier = tiers.some(
    t => t.unit === 'days' && t.duration <= safeDays && (t.duration > 1 || t.price !== baseDailyPrice)
  )
  if (!hasAnyMultiDayOrCustomDayTier) {
    const linearTotal = Math.round(safeDays * baseDailyPrice * 100) / 100
    return {
      rentalPrice: linearTotal,
      mode: 'days' as const,
      durationHours: null,
      durationDays: safeDays,
      hasCustomTierApplied: false,
      label: `${safeDays} jour${safeDays > 1 ? 's' : ''} × ${baseDailyPrice} CHF / jour`,
    }
  }

  const availableDayTiers = Array.from(dayTiersMap.entries())
    .map(([duration, price]) => ({ duration, price }))
    .sort((a, b) => b.duration - a.duration)

  const dp = new Array<number>(safeDays + 1).fill(Infinity)
  dp[0] = 0

  for (let d = 1; d <= safeDays; d++) {
    for (const tier of availableDayTiers) {
      if (tier.duration <= d) {
        const candidate = Math.round((dp[d - tier.duration] + tier.price) * 100) / 100
        if (candidate < dp[d]) {
          dp[d] = candidate
        }
      }
    }
  }

  const bestPrice = Math.round(dp[safeDays] * 100) / 100
  return {
    rentalPrice: bestPrice,
    mode: 'days' as const,
    durationHours: null,
    durationDays: safeDays,
    hasCustomTierApplied: true,
    label: `${safeDays} jour${safeDays > 1 ? 's' : ''}`,
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
    const { trailerId, startDate, endDate, cautionAmount, durationHours } = body

    if (!trailerId || !startDate || !endDate) {
      return new Response(JSON.stringify({ error: "Paramètres de réservation manquants." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Récupération de l'annonce remorque (Source de vérité Zero-Trust)
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

    if (!trailer.price || Number(trailer.price) <= 0 || isNaN(Number(trailer.price))) {
      return new Response(JSON.stringify({ error: "Prix journalier de la remorque invalide." }), {
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
    // Normalisation UTC minuit pour immuniser contre les décalages DST (changement d'heure) et fuseaux
    const startParts = String(startDate).split('T')[0].split('-').map(Number)
    const endParts = String(endDate).split('T')[0].split('-').map(Number)
    const utcStart = Date.UTC(startParts[0], startParts[1] - 1, startParts[2])
    const utcEnd = Date.UTC(endParts[0], endParts[1] - 1, endParts[2])
    const diffTime = Math.abs(utcEnd - utcStart)
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1

    // Validation stricte du forfait horaire si demandé par le client (Zero-Trust)
    let validatedDurationHours: number | null = null
    if (durationHours !== undefined && durationHours !== null && durationHours !== '') {
      const parsedHours = parseInt(String(durationHours), 10)
      const normalizedTiers = normalizePricingTiers(trailer.pricing_tiers)
      const matchingHourTier = normalizedTiers.find(t => t.unit === 'hours' && t.duration === parsedHours)
      if (!Number.isFinite(parsedHours) || parsedHours <= 0 || diffDays !== 1 || !matchingHourTier) {
        return new Response(JSON.stringify({ error: "Forfait horaire invalide ou indisponible pour cette remorque." }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      validatedDurationHours = parsedHours
    }
    
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
      .in('status', ['paye', 'paid', 'confirmed', 'active', 'en_attente', 'indisponible'])
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
    
    // Calcul du prix de la location (avec paliers dégressifs ou horaires depuis la BDD)
    const pricingCalc = calculateTieredRentalPrice(trailer, diffDays, validatedDurationHours)
    const totalRentalPrice = pricingCalc.rentalPrice

    // Frais de traitement Renger acheteur : 5% avec minimum garanti de 4.90 CHF (arrondi suisse aux 5 centimes)
    const rawServiceFee = totalRentalPrice * 0.05
    const serviceFee = Math.max(4.90, Math.round(rawServiceFee * 20) / 20)
    
    // Total effectivement débité sur la carte
    const totalPaidPrice = parseFloat((totalRentalPrice + serviceFee).toFixed(2))

    // Montant de la caution (empreinte non débitée) : barème standard suisse Renger
    const isHeavy = ['cheval', 'voiture', 'refrigere'].includes(trailer.category) || (trailer.payload && trailer.payload > 1200)
    const isMedium = trailer.category === 'moto' || (trailer.payload && trailer.payload > 750)
    const customCaution = Number(trailer.deposit_amount) > 0 ? Number(trailer.deposit_amount) : (Number(trailer.caution) > 0 ? Number(trailer.caution) : (Number(trailer.deposit) > 0 ? Number(trailer.deposit) : 0))
    const caution = customCaution > 0 ? customCaution : (isHeavy ? 400 : (isMedium ? 300 : 200))

    // 4. Création de la réservation en statut 'en_attente' (avec repli gracieux si colonnes rental_price/duration_hours absentes)
    const baseBookingInsert: Record<string, unknown> = {
      trailer_id: trailer.id,
      renter_id: user.id,
      owner_id: trailer.owner_id,
      start_date: startDate,
      end_date: endDate,
      total_price: totalPaidPrice,
      rental_price: totalRentalPrice,
      ...(validatedDurationHours ? { duration_hours: validatedDurationHours } : {}),
      status: 'en_attente'
    }

    let { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert([baseBookingInsert])
      .select()
      .single()

    let attempts = 0
    while (bookingError && bookingError.message && attempts < 3) {
      attempts++
      const errMsg = bookingError.message.toLowerCase()
      let retryNeeded = false

      if (errMsg.includes('rental_price') && 'rental_price' in baseBookingInsert) {
        delete baseBookingInsert.rental_price
        retryNeeded = true
      }
      if (errMsg.includes('duration_hours') && 'duration_hours' in baseBookingInsert) {
        delete baseBookingInsert.duration_hours
        retryNeeded = true
      }
      if ((errMsg.includes('bigint') || errMsg.includes('integer') || errMsg.includes('smallint')) && typeof baseBookingInsert.total_price === 'number' && !Number.isInteger(baseBookingInsert.total_price)) {
        baseBookingInsert.total_price = Math.round(totalPaidPrice)
        retryNeeded = true
      }

      if (retryNeeded) {
        const fallbackInsert = await supabaseAdmin
          .from('bookings')
          .insert([baseBookingInsert])
          .select()
          .single()
        booking = fallbackInsert.data
        bookingError = fallbackInsert.error
      } else {
        break
      }
    }

    if (bookingError || !booking) {
      throw new Error("Erreur réservation BDD : " + (bookingError?.message || 'Inconnue'))
    }

    // URLs de redirection (supporte les origines Capacitor iOS renger:// / capacitor:// et Android https://localhost)
    const rawOrigin = req.headers.get('origin') || req.headers.get('referer') || 'https://renger.ch'
    const cleanedOrigin = rawOrigin.replace(/\/+$/, '')
    const isCapacitorOrigin = !cleanedOrigin || cleanedOrigin === 'null' || /^(renger|capacitor):\/\//i.test(cleanedOrigin) || /^https?:\/\/localhost$/i.test(cleanedOrigin)
    const origin = isCapacitorOrigin ? 'https://renger.ch' : cleanedOrigin
    const successUrl = `${origin}?payment=success&booking_id=${booking.id}`
    const cancelUrl = `${origin}?payment=cancel&booking_id=${booking.id}`

    // Filtre pour ne pas afficher le logo SVG/placeholder géant dans l'encart photo de Stripe
    const hasRealPhoto = trailer.image_url && 
      !trailer.image_url.includes('Logo') && 
      !trailer.image_url.includes('placehold.co') &&
      !trailer.image_url.endsWith('.svg')

    const durationLabel = pricingCalc.mode === 'hours'
      ? `${pricingCalc.durationHours}h`
      : `${diffDays} jour${diffDays > 1 ? 's' : ''}`

    // 5. Création de la session Stripe avec 2 lignes de paiement + empreinte bancaire caution (0 CHF)
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
              name: `Location : ${trailer.title} (${durationLabel})`,
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
        ...(validatedDurationHours ? { duration_hours: String(validatedDurationHours) } : {}),
      },
      payment_intent_data: {
        setup_future_usage: 'off_session',
        description: `Renger #${booking.id} - ${trailer.title}`,
        metadata: {
          booking_id: booking.id.toString(),
          rental_price: totalRentalPrice.toFixed(2),
          service_fee: serviceFee.toFixed(2),
          caution_amount: caution.toString(),
          ...(validatedDurationHours ? { duration_hours: String(validatedDurationHours) } : {}),
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

