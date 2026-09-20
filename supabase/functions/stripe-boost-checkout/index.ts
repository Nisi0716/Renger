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
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error("Missing Authorization header");

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Unauthorized");

        const { trailer_id, plan } = await req.json();
        if (!trailer_id || !plan) throw new Error("Missing trailer_id or plan");

        // Verify trailer belongs to user (Authorization enforcement at DB level via RLS or explicit check)
        const { data: trailer, error: trailerError } = await supabase
            .from('trailers')
            .select('id, owner_id')
            .eq('id', trailer_id)
            .single();

        if (trailerError || !trailer || trailer.owner_id !== user.id) {
            throw new Error("Unauthorized or trailer not found");
        }

        // Rate Limiter: max 5 requests per 10 minutes
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: rateData, error: rateError } = await supabase
            .from('rate_limits')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .gte('created_at', tenMinutesAgo);

        if (!rateError && rateData && rateData.length >= 5) {
            throw new Error("Rate limit exceeded. Please try again later.");
        }

        // Log the request
        await supabase.from('rate_limits').insert([{ user_id: user.id, action: 'stripe_boost_checkout' }]);

        const isWeek = plan === "week";
        const amount = isWeek ? 990 : 590;
        const planName = isWeek ? "Boost 7 jours" : "Boost Week-end";

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [
                {
                    price_data: {
                        currency: "chf",
                        product_data: {
                            name: planName,
                            description: `Boost de visibilité pour votre annonce`,
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            success_url: `${req.headers.get("origin") || "http://localhost:3000"}?boost_success=true`,
            cancel_url: `${req.headers.get("origin") || "http://localhost:3000"}?boost_canceled=true`,
            metadata: {
                trailer_id,
                plan,
                type: "boost",
                user_id: user.id
            }
        });

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
