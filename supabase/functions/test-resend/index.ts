import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendResendEmail } from "../stripe-webhook/email.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Secret RESEND_API_KEY manquant. Configurez-le dans Supabase Dashboard -> Edge Functions -> Secrets." 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const to = body.to || 'delivered@resend.dev'; // Adresse de test Resend par défaut
    const configuredFrom = Deno.env.get('RESEND_FROM_EMAIL');
    const from = configuredFrom
      ? configuredFrom.replace(/info@renger\.ch/gi, 'contact@renger.ch')
      : 'Renger <contact@renger.ch>';

    const result = await sendResendEmail({
      apiKey,
      from,
      to,
      subject: "Test de configuration Resend - Renger",
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #fafaf9; color: #1c1917;">
          <h2 style="color: #d85110;">✓ Test Resend réussi !</h2>
          <p>Votre clé d'API Resend est correctement configurée sur votre projet Supabase <strong>Renger</strong>.</p>
          <p>Expéditeur : <code>${from}</code><br>Destinataire : <code>${to}</code></p>
        </div>
      `,
    });

    if (result.error) {
      return new Response(JSON.stringify({ success: false, error: result.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Email de test envoyé avec succès à ${to} !`, 
      id: result.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
