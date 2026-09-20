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
        await supabase.from('rate_limits').insert([{ user_id: user.id, action: 'stripe_pro_checkout' }]);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "subscription",
            line_items: [
                {
                    price_data: {
                        currency: "chf",
                        product_data: {
                            name: "Renger PRO",
                            description: "Conservez 100% de vos gains sans commission.",
                        },
                        unit_amount: 3900,
                        recurring: { interval: "month" },
                    },
                    quantity: 1,
                },
            ],
            success_url: `${req.headers.get("origin") || "http://localhost:3000"}?pro_success=true`,
            cancel_url: `${req.headers.get("origin") || "http://localhost:3000"}?pro_canceled=true`,
            metadata: {
                user_id: user.id,
                type: "pro_subscription"
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
