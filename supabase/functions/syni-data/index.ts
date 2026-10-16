import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// PostgREST plafonne chaque requête à 1000 lignes : on pagine (plafond 20 000) pour que
// les analyses Syni/Colab portent sur l'historique complet et non sur les 1000 dernières lignes.
async function fetchAllRows(client: any, table: string, columns: string, cap = 20000) {
  const pageSize = 1000
  const rows: any[] = []
  for (let from = 0; from < cap; from += pageSize) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) return { data: rows, error }
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return { data: rows, error: null }
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
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceRoleKey) {
      throw new Error("Secret SERVICE_ROLE_KEY manquant sur le serveur.")
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://cwifrzajxrcpnqceyxnj.supabase.co'
    const masterKeyExpected = Deno.env.get('SYNI_MASTER_KEY') || 'RengerSyni2026!'

    // Initialisation admin avec privilèges complets (service_role)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 1. Authentification stricte via JWT de session
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

    // 2. Contrôle d'accès Administrateur Suprême (enism2007@hotmail.com, einsm2007@gmail.com ou profiles.is_admin = true)
    const adminEmails = ['enism2007@hotmail.com', 'einsm2007@gmail.com']
    let isSupremeAdmin = adminEmails.includes(user.email || '') ||
      user.user_metadata?.is_admin === true ||
      user.is_admin === true

    if (!isSupremeAdmin) {
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        if (profile && (profile.is_admin === true || adminEmails.includes(profile.email || ''))) {
          isSupremeAdmin = true
        }
      } catch (_) {}
    }

    if (!isSupremeAdmin) {
      return new Response(JSON.stringify({ error: "Accès refusé. Réservé exclusivement à l'administrateur suprême." }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Rate Limiting anti-brute force / DoS AVANT validation du mot de passe
    // Empêche toute attaque par force brute sur SYNI_MASTER_KEY (max 30 tentatives par 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count: recentAttempts } = await supabaseAdmin
      .from('rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('action', ['syni_data_request', 'syni_failed_passphrase'])
      .gte('created_at', tenMinutesAgo)

    if (recentAttempts !== null && recentAttempts >= 30) {
      return new Response(JSON.stringify({ error: "Trop de requêtes Syni. Veuillez patienter 10 minutes." }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Validation de la Passphrase Maîtresse SYNI_MASTER_KEY
    const body = await req.json().catch(() => ({}))
    const masterKey = body.masterKey || body.passphrase || ''
    const { timeRange } = body

    if (!masterKey || String(masterKey).trim() !== masterKeyExpected.trim()) {
      // Consigner la tentative infructueuse dans rate_limits
      await supabaseAdmin
        .from('rate_limits')
        .insert([{ user_id: user.id, action: 'syni_failed_passphrase' }])
        .catch(() => null)

      return new Response(JSON.stringify({ error: "Passphrase maîtresse Syni incorrecte." }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Enregistrement de la trace d'audit d'accès réussi dans rate_limits
    await supabaseAdmin
      .from('rate_limits')
      .insert([{ user_id: user.id, action: 'syni_data_request' }])
      .catch(() => null)

    // 5. Agrégation centralisée de toutes les données réelles du site via service_role
    const [
      profilesRes,
      trailersRes,
      bookingsRes,
      inspectionsRes,
      rateLimitsRes,
      analyticsRes,
      impressionsRes,
      clicksRes,
      searchesRes,
      payoutsRes
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('trailers').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('bookings').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('inspections').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('rate_limits').select('*').order('created_at', { ascending: false }).limit(200),
      supabaseAdmin.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(1000),
      fetchAllRows(supabaseAdmin, 'impressions', 'id, trailer_id, user_id, created_at'),
      fetchAllRows(supabaseAdmin, 'clicks', 'id, trailer_id, user_id, created_at'),
      fetchAllRows(supabaseAdmin, 'search_events', 'id, category, search_text, has_dates, results_count, results_avg_price, results_min_price, results_max_price, created_at'),
      supabaseAdmin.from('payouts').select('*').order('created_at', { ascending: false }),
    ])

    // Récupération des emails réels des utilisateurs depuis auth.users
    const authUsersMap: Record<string, string> = {}
    try {
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (authData && authData.users) {
        authData.users.forEach((u: any) => {
          if (u.id && u.email) authUsersMap[u.id] = u.email
        })
      }
    } catch (_authErr) {
      console.warn("Lecture auth.users non bloquante:", _authErr)
    }

    const profiles = (profilesRes.data || []).map((p: any) => ({
      ...p,
      email: p.email || authUsersMap[p.id] || ''
    }))
    const trailers = trailersRes.data || []
    const bookings = bookingsRes.data || []
    const inspections = inspectionsRes.data || []
    const rateLimits = rateLimitsRes.data || []
    const analytics = analyticsRes.data || []
    const impressions = impressionsRes.data || []
    const clicks = clicksRes.data || []
    const searches = searchesRes.data || []
    const payouts = payoutsRes?.data || []

    return new Response(JSON.stringify({
      status: 'ok',
      adminEmail: user.email,
      timestamp: new Date().toISOString(),
      timeRange: timeRange || 'all',
      data: {
        profiles,
        trailers,
        bookings,
        inspections,
        rateLimits,
        analytics,
        impressions,
        clicks,
        searches,
        payouts
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur interne Syni" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
