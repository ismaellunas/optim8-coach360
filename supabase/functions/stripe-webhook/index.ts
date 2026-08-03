import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleStripeWebhookEvent } from './handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

async function recordWebhookFailure(
  supabase: ReturnType<typeof createClient>,
  message: string,
  details: Record<string, unknown>,
) {
  try {
    await supabase.rpc('record_system_health_event', {
      p_kind: 'webhook_failure',
      p_source: 'stripe-webhook',
      p_message: message,
      p_details: details,
    });
  } catch {
    // Best-effort health recording — never mask the original failure.
  }
}

/**
 * Resolve profile_id for invoice events when Stripe invoice metadata lacks it
 * (Checkout does not set invoice metadata.profile_id). Prefer subscription id,
 * then customer id — same pattern as mark_subscription_past_due_by_customer.
 */
async function resolveInvoiceProfileId(
  supabase: ReturnType<typeof createClient>,
  opts: {
    profileId: string | null;
    stripeSubscriptionId: string | null;
    stripeCustomerId: string | null;
  },
): Promise<string | null> {
  if (opts.profileId) {
    return opts.profileId;
  }

  if (opts.stripeSubscriptionId) {
    const { data } = await supabase
      .from('subscriptions')
      .select('profile_id')
      .eq('stripe_subscription_id', opts.stripeSubscriptionId)
      .maybeSingle();
    if (data?.profile_id) {
      return data.profile_id as string;
    }
  }

  if (opts.stripeCustomerId) {
    const { data } = await supabase
      .from('subscriptions')
      .select('profile_id')
      .eq('stripe_customer_id', opts.stripeCustomerId)
      .maybeSingle();
    if (data?.profile_id) {
      return data.profile_id as string;
    }
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'supabase_env_missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let event: Parameters<typeof handleStripeWebhookEvent>[0];
  try {
    event = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const result = handleStripeWebhookEvent(event);
  if (!result.handled) {
    return new Response(JSON.stringify({ received: true, skipped: result.reason }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (result.kind === 'subscription_upsert') {
    const { error } = await supabase.rpc('sync_subscription_from_stripe', {
      p_profile_id: result.upsert.profile_id,
      p_tier: result.upsert.tier,
      p_status: result.upsert.status,
      p_stripe_customer_id: result.upsert.stripe_customer_id,
      p_stripe_subscription_id: result.upsert.stripe_subscription_id,
      p_current_period_end: result.upsert.current_period_end,
      p_trial_ends_at: result.upsert.trial_ends_at,
      p_event_id: result.idempotencyKey,
      p_event_type: result.eventType,
    });

    if (error) {
      await recordWebhookFailure(supabase, error.message, { stage: 'subscription_upsert' });
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ received: true, synced: true, kind: result.kind }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (result.kind === 'payment_failed') {
    const { error } = await supabase.rpc('mark_subscription_past_due_by_customer', {
      p_stripe_customer_id: result.stripeCustomerId,
      p_profile_id: result.profileId,
      p_event_id: result.idempotencyKey,
      p_event_type: result.eventType,
    });

    if (error) {
      await recordWebhookFailure(supabase, error.message, { stage: 'payment_failed' });
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        received: true,
        synced: true,
        kind: result.kind,
        lockedStatus: result.lockedStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  if (result.kind === 'invoice_upsert') {
    const profileId = await resolveInvoiceProfileId(supabase, {
      profileId: result.profileId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      stripeCustomerId: result.stripeCustomerId,
    });

    if (!profileId) {
      return new Response(JSON.stringify({ received: true, skipped: 'missing_profile_id' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabase.rpc('sync_billing_invoice_from_stripe', {
      p_profile_id: profileId,
      p_stripe_invoice_id: result.invoice.stripe_invoice_id,
      p_amount_cents: result.invoice.amount_cents,
      p_currency: result.invoice.currency,
      p_status: result.invoice.status,
      p_hosted_invoice_url: result.invoice.hosted_invoice_url,
      p_invoice_pdf: result.invoice.invoice_pdf,
      p_period_start: result.invoice.period_start,
      p_period_end: result.invoice.period_end,
      p_paid_at: result.invoice.paid_at,
      p_event_id: result.idempotencyKey,
      p_event_type: result.eventType,
    });

    if (error) {
      await recordWebhookFailure(supabase, error.message, { stage: 'invoice_upsert' });
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ received: true, synced: true, kind: result.kind }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (result.kind === 'purchase_upsert') {
    const { data: purchase, error } = await supabase.rpc('sync_purchase_from_stripe', {
      p_buyer_id: result.purchase.buyer_id,
      p_sanity_document_id: result.purchase.sanity_document_id,
      p_stripe_payment_intent_id: result.purchase.stripe_payment_intent_id,
      p_amount_cents: result.purchase.amount_cents,
      p_currency: result.purchase.currency,
      p_scope: result.purchase.scope,
      p_team_id: result.purchase.team_id,
      p_event_id: result.idempotencyKey,
      p_event_type: result.eventType,
    });

    if (error) {
      await recordWebhookFailure(supabase, error.message, { stage: 'purchase_upsert' });
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // STORY-10.2 — seed drip_progress (first module unlocked immediately).
    let dripModules = 0;
    const purchaseId =
      purchase && typeof purchase === 'object' && 'id' in purchase
        ? (purchase as { id: string }).id
        : null;
    if (purchaseId) {
      const { data: inserted, error: dripError } = await supabase.rpc(
        'init_drip_progress_for_purchase',
        { p_purchase_id: purchaseId },
      );
      if (dripError) {
        await recordWebhookFailure(supabase, dripError.message, { stage: 'drip_init' });
        return new Response(JSON.stringify({ error: dripError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      dripModules = typeof inserted === 'number' ? inserted : Number(inserted) || 0;
    }

    return new Response(
      JSON.stringify({
        received: true,
        synced: true,
        kind: result.kind,
        dripModules,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  return new Response(JSON.stringify({ received: true, skipped: 'unhandled_kind' }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
