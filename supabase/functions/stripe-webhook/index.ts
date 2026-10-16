import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { sendBookingConfirmationEmails } from "./email.ts";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const signature = req.headers.get('Stripe-Signature');
  if (!signature) {
    return new Response('Missing Stripe-Signature header', { status: 400 });
  }

  const body = await req.text();
  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      undefined,
      cryptoProvider
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Contrôle d'Idempotence : Vérification si l'événement Stripe a déjà été traité
  if (event?.id) {
    const { data: existingEvent } = await supabase
      .from('processed_webhook_events')
      .select('id')
      .eq('id', event.id)
      .maybeSingle();

    if (existingEvent) {
      console.log(`Webhook event ${event.id} already processed. Skipping duplicate execution.`);
      return new Response(JSON.stringify({ received: true, idempotent: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    try {
      if (metadata.booking_id) {
        // Logique pour valider une réservation payée
        const paymentIntentId = typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : (session.payment_intent as any)?.id;

        const { error } = await supabase
          .from('bookings')
          .update({ 
            status: 'paye',
            stripe_payment_intent_id: paymentIntentId || null,
          })
          .eq('id', metadata.booking_id);
          
        if (error) throw error;
        console.log(`Booking ${metadata.booking_id} marked as 'paye' (PaymentIntent: ${paymentIntentId}).`);

        // Envoi sécurisé des e-mails Resend de confirmation (Locataire + Propriétaire)
        try {
          await sendBookingConfirmationEmails({
            supabase,
            bookingId: metadata.booking_id,
            session,
          });
        } catch (emailErr: any) {
          console.error(`Erreur notification email Resend (non bloquante): ${emailErr?.message}`);
        }
      } else if (metadata.type === 'pro_subscription') {
        if (!metadata.user_id) {
          throw new Error('Missing user_id in metadata');
        }
        const updateData: Record<string, any> = { is_pro: true };
        if (session.customer) {
          updateData.stripe_customer_id = typeof session.customer === 'string' ? session.customer : (session.customer as any).id;
        }
        if (session.subscription) {
          updateData.stripe_subscription_id = typeof session.subscription === 'string' ? session.subscription : (session.subscription as any).id;
        }
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', metadata.user_id);
        
        if (error) throw error;
        console.log(`User ${metadata.user_id} upgraded to PRO (customer: ${updateData.stripe_customer_id}, sub: ${updateData.stripe_subscription_id}).`);
      } else if (metadata.type === 'boost') {
        if (!metadata.trailer_id) {
          throw new Error('Missing trailer_id in metadata');
        }
        
        let durationDays = parseInt(metadata.duration_days, 10);
        if (isNaN(durationDays) || durationDays <= 0) {
          durationDays = metadata.plan === 'weekend' ? 3 : 7;
        }
        
        const { data: trailer } = await supabase
          .from('trailers')
          .select('boost_end_date')
          .eq('id', metadata.trailer_id)
          .single();

        let startDate = new Date();
        if (trailer && trailer.boost_end_date) {
            const currentBoostEnd = new Date(trailer.boost_end_date);
            if (currentBoostEnd > startDate) {
                startDate = currentBoostEnd;
            }
        }
        startDate.setDate(startDate.getDate() + durationDays);
        
        const { error } = await supabase
          .from('trailers')
          .update({ boost_end_date: startDate.toISOString() })
          .eq('id', metadata.trailer_id);
          
        if (error) throw error;
        console.log(`Trailer ${metadata.trailer_id} boosted until ${startDate.toISOString()}.`);
      }
    } catch (err: any) {
      console.error(`Error processing webhook event: ${err.message}`);
      return new Response(`Error: ${err.message}`, { status: 500 });
    }
  } else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer as any)?.id;
    const subscriptionId = subscription.id;

    try {
      let query = supabase.from('profiles').update({ is_pro: false });
      if (subscriptionId && customerId) {
        query = query.or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`);
      } else if (subscriptionId) {
        query = query.eq('stripe_subscription_id', subscriptionId);
      } else if (customerId) {
        query = query.eq('stripe_customer_id', customerId);
      }
      const { error } = await query;
      if (error) throw error;
      console.log(`Subscription ${subscriptionId} deleted. Profile is_pro set to false.`);
    } catch (err: any) {
      console.error(`Error handling customer.subscription.deleted: ${err.message}`);
      return new Response(`Error: ${err.message}`, { status: 500 });
    }
  } else if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer as any)?.id;
    const subscriptionId = subscription.id;

    if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      try {
        let query = supabase.from('profiles').update({ is_pro: false });
        if (subscriptionId && customerId) {
          query = query.or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`);
        } else if (subscriptionId) {
          query = query.eq('stripe_subscription_id', subscriptionId);
        } else if (customerId) {
          query = query.eq('stripe_customer_id', customerId);
        }
        const { error } = await query;
        if (error) throw error;
        console.log(`Subscription ${subscriptionId} status updated to ${subscription.status}. is_pro set to false.`);
      } catch (err: any) {
        console.error(`Error processing customer.subscription.updated: ${err.message}`);
      }
    } else if (subscription.status === 'active') {
      try {
        let query = supabase.from('profiles').update({ is_pro: true });
        if (subscriptionId && customerId) {
          query = query.or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`);
        } else if (subscriptionId) {
          query = query.eq('stripe_subscription_id', subscriptionId);
        } else if (customerId) {
          query = query.eq('stripe_customer_id', customerId);
        }
        const { error } = await query;
        if (error) throw error;
        console.log(`Subscription ${subscriptionId} status updated to active. is_pro set to true.`);
      } catch (err: any) {
        console.error(`Error processing customer.subscription.updated (active): ${err.message}`);
      }
    }
  }

  // Enregistrement de l'événement pour garantir l'idempotence sur les réessais futurs
  if (event?.id) {
    try {
      await supabase
        .from('processed_webhook_events')
        .insert([{ id: event.id, event_type: event.type }]);
    } catch (dbErr: any) {
      console.warn(`Idempotency log error for event ${event.id}:`, dbErr?.message);
    }
  }

  return new Response(JSON.stringify({ received: true }), { 
    headers: { 'Content-Type': 'application/json' } 
  });
});
