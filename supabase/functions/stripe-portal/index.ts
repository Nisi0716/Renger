import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.1.1?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2022-11-15",
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing Authorization header");

        const token = authHeader.replace(/^Bearer\s+/i, "");
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error("Unauthorized");

        // Rate Limiter: max 5 requests per 10 minutes per user.id
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { count, data: rateData, error: rateError } = await supabase
            .from("rate_limits")
            .select("id", { count: "exact" })
            .eq("user_id", user.id)
            .eq("action", "stripe_portal")
            .gte("created_at", tenMinutesAgo);

        const currentCount = typeof count === "number" ? count : (rateData?.length ?? 0);
        if (currentCount >= 5) {
            throw new Error("Rate limit exceeded. Please try again later.");
        }

        // Log the rate limit entry
        await supabase.from("rate_limits").insert([{ user_id: user.id, action: "stripe_portal" }]);

        // Resolve stripe_customer_id from profiles
        const { data: profile } = await supabase
            .from("profiles")
            .select("stripe_customer_id, is_pro")
            .eq("id", user.id)
            .maybeSingle();

        let customerId = profile?.stripe_customer_id;

        // Fallback: If not found in DB, lookup in Stripe by email
        if (!customerId && user.email) {
            const cleanEmail = user.email.trim().toLowerCase();
            let customers = await stripe.customers.list({
                email: cleanEmail,
                limit: 1,
            });

            if ((!customers.data || customers.data.length === 0) && cleanEmail !== user.email.trim()) {
                customers = await stripe.customers.list({
                    email: user.email.trim(),
                    limit: 1,
                });
            }

            if (customers.data && customers.data.length > 0) {
                customerId = customers.data[0].id;
                // Save customerId in profiles for future calls
                await supabase
                    .from("profiles")
                    .update({ stripe_customer_id: customerId })
                    .eq("id", user.id);
            }
        }

        if (!customerId) {
            throw new Error("Aucun compte client Stripe actif n'a été trouvé pour votre utilisateur. Veuillez d'abord souscrire un abonnement.");
        }

        let origin = "https://renger.ch";
        const headerOrigin = req.headers.get("origin") || req.headers.get("referer");
        if (headerOrigin && headerOrigin !== "null" && !/^(renger|capacitor):\/\//i.test(headerOrigin)) {
            try {
                const parsedOrigin = new URL(headerOrigin).origin;
                if (parsedOrigin && parsedOrigin !== "null" && !/^https?:\/\/localhost$/i.test(parsedOrigin)) {
                    origin = parsedOrigin;
                }
            } catch (_) {
                origin = "https://renger.ch";
            }
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/profil.html?p=settings-page`,
        });

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (err) {
        console.error("Stripe portal error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
