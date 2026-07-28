import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  isSuccessfulCharge,
  KORA_API_BASE,
  koraErrorMessage,
  resolveChargedAmount,
  resolveMerchantReference,
  type KoraChargeData,
} from '../_shared/kora-payment.ts';
import {
  orderEmailFromCompleteResult,
  sendOrderPaidEmails,
} from '../_shared/order-email.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const body = (await req.json()) as { reference?: string };
    const clientReference = String(body.reference ?? '').trim();
    if (clientReference.length < 4) {
      return jsonResponse({ error: 'reference is required' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const chargeRes = await fetch(
      `${KORA_API_BASE}/charges/${encodeURIComponent(clientReference)}`,
      {
        headers: { Authorization: `Bearer ${koraSecretKey}` },
      },
    );
    const chargePayload = (await chargeRes.json()) as {
      status?: boolean;
      message?: string;
      data?: KoraChargeData;
    };

    if (!chargeRes.ok || !chargePayload.data) {
      throw new Error(koraErrorMessage(chargeRes.status, chargePayload));
    }

    const payment = chargePayload.data;
    if (!isSuccessfulCharge(payment)) {
      return jsonResponse({
        ok: false,
        paid: false,
        status: payment.status ?? payment.transaction_status ?? 'pending',
        message: 'Payment not completed yet',
      });
    }

    const merchantReference = resolveMerchantReference(clientReference, payment);
    const charged = resolveChargedAmount(payment);

    const { data: complete, error: completeError } = await admin.rpc(
      'complete_kora_order_payment',
      {
        p_reference: merchantReference,
        p_provider_ref: String(payment.reference || clientReference),
        p_provider_metadata: {
          provider: 'kora',
          source: 'kora_verify',
          charged_amount: charged,
          charged_currency: payment.currency ?? 'NGN',
          transaction_status: payment.transaction_status ?? payment.status ?? null,
        },
      },
    );

    if (completeError) {
      throw new Error(completeError.message || 'Failed to complete payment');
    }

    const result = complete as {
      already_completed?: boolean;
      email_sent?: boolean;
      order: Record<string, unknown>;
      items: Array<Record<string, unknown>>;
      payment_reference: string;
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
      paid: true,
      alreadyCompleted: Boolean(result.already_completed),
      orderNumber: String(result.order.order_number ?? ''),
      total: Number(result.order.total ?? 0),
      subtotal: Number(result.order.subtotal ?? 0),
      deliveryFee: Number(result.order.delivery_fee ?? 0),
      tax: Number(result.order.tax ?? 0),
      customerName: String(result.order.customer_name ?? ''),
      customerPhone: String(result.order.customer_phone ?? ''),
      customerEmail: String(result.order.customer_email ?? ''),
      orderType: String(result.order.order_type ?? ''),
      deliveryAddress: (result.order.delivery_address as string | null) ?? null,
      deliveryInstructions: (result.order.delivery_instructions as string | null) ?? null,
      items: result.items,
      reference: merchantReference,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Server error' },
      500,
    );
  }
});
