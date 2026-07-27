import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  isSuccessfulCharge,
  isValidKoraWebhookSignature,
  resolveChargedAmount,
  resolveMerchantReference,
  type KoraChargeData,
} from '../_shared/kora-payment.ts';
import {
  orderEmailFromCompleteResult,
  sendOrderPaidEmails,
} from '../_shared/order-email.ts';

interface KoraWebhookPayload {
  event?: string;
  data?: KoraChargeData;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type, x-korapay-signature',
      },
    });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const koraSecretKey = Deno.env.get('KORA_SECRET_KEY');

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase environment is not configured');
    }
    if (!koraSecretKey) {
      throw new Error('Kora secret key is not configured');
    }

    const rawBody = await req.text();
    const payload = JSON.parse(rawBody) as KoraWebhookPayload;
    const signature = req.headers.get('x-korapay-signature');
    const payment = payload.data;

    const validSignature = await isValidKoraWebhookSignature(
      signature,
      payment,
      koraSecretKey,
    );
    if (!validSignature) {
      console.warn('kora-webhook ignored invalid signature');
      return jsonResponse({ ok: true, ignored: true });
    }

    if (payload.event !== 'charge.success' || !payment || !isSuccessfulCharge(payment)) {
      return jsonResponse({ ok: true, ignored: true });
    }

    const merchantReference = resolveMerchantReference(
      String(payment.reference ?? ''),
      payment,
    );
    if (!merchantReference) {
      return jsonResponse({ ok: true, ignored: true });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const charged = resolveChargedAmount(payment);

    const { data: complete, error: completeError } = await admin.rpc(
      'complete_kora_order_payment',
      {
        p_reference: merchantReference,
        p_provider_ref: String(payment.reference || ''),
        p_provider_metadata: {
          provider: 'kora',
          source: 'kora_webhook',
          charged_amount: charged,
          charged_currency: payment.currency ?? 'NGN',
          transaction_status: payment.transaction_status ?? payment.status ?? null,
        },
      },
    );

    if (completeError) {
      // Payment may use payment_reference as merchant ref — try alternate
      console.error('complete_kora_order_payment', completeError.message);
      throw new Error(completeError.message || 'Failed to complete payment');
    }

    const result = complete as {
      already_completed?: boolean;
      email_sent?: boolean;
      order: Record<string, unknown>;
      items: Array<Record<string, unknown>>;
    };

    if (!result.email_sent) {
      const emailed = await sendOrderPaidEmails(
        orderEmailFromCompleteResult({
          order: result.order,
          items: result.items as never,
        }),
      );
      if (emailed) {
        await admin.rpc('mark_kora_payment_email_sent', {
          p_reference: merchantReference,
        });
      }
    }

    return jsonResponse({
      ok: true,
      orderNumber: String(result.order.order_number ?? ''),
      duplicate: Boolean(result.already_completed),
    });
  } catch (err) {
    console.error('kora-webhook error', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Server error' },
      500,
    );
  }
});
