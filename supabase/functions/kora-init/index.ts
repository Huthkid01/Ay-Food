import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  createKoraMerchantReference,
  KORA_API_BASE,
  koraErrorMessage,
  resolveAppUrl,
  type KoraInitializeResponse,
} from '../_shared/kora-payment.ts';
import { getKoraChargeNgn, getKoraProcessingFeeNgn } from '../_shared/kora-fees.ts';

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

    const body = (await req.json()) as { orderNumber?: string };
    const orderNumber = String(body.orderNumber ?? '').trim();
    if (orderNumber.length < 4) {
      return jsonResponse({ error: 'orderNumber is required' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, order_number, total, customer_name, customer_email, customer_phone, status')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (orderError || !order) {
      return jsonResponse({ error: 'Order not found' }, 404);
    }

    const { data: payment, error: paymentError } = await admin
      .from('payments')
      .select('id, reference, amount, status, provider')
      .eq('order_id', order.id)
      .eq('provider', 'KORA')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError || !payment) {
      return jsonResponse({ error: 'Kora payment record not found for this order' }, 404);
    }

    if (payment.status === 'COMPLETED') {
      return jsonResponse({
        ok: true,
        alreadyPaid: true,
        reference: payment.reference,
        orderNumber: order.order_number,
      });
    }

    const orderTotalNgn = Math.round(Number(order.total));
    if (!Number.isFinite(orderTotalNgn) || orderTotalNgn <= 0) {
      return jsonResponse({ error: 'Invalid order amount' }, 400);
    }

    const processingFeeNgn = getKoraProcessingFeeNgn(orderTotalNgn);
    const chargeAmountNgn = getKoraChargeNgn(orderTotalNgn);

    // Prefer existing pending reference; otherwise mint a new one
    let reference = String(payment.reference || '').trim();
    if (!reference.startsWith('KORA-')) {
      reference = createKoraMerchantReference();
    }

    await admin
      .from('payments')
      .update({
        reference,
        amount: chargeAmountNgn,
        metadata: {
          source: 'ay-food-checkout',
          order_total_ngn: orderTotalNgn,
          processing_fee_ngn: processingFeeNgn,
          charge_amount_ngn: chargeAmountNgn,
        },
      })
      .eq('id', payment.id);

    const appUrl = resolveAppUrl(req);
    const redirectUrl = `${appUrl}/checkout?kora=return&reference=${encodeURIComponent(reference)}`;
    const notificationUrl = `${supabaseUrl}/functions/v1/kora-webhook`;

    const initResponse = await fetch(`${KORA_API_BASE}/charges/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${koraSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: chargeAmountNgn,
        currency: 'NGN',
        reference,
        redirect_url: redirectUrl,
        notification_url: notificationUrl,
        narration: `Ay Food Palace order ${order.order_number}`,
        channels: ['card', 'bank_transfer', 'pay_with_bank'],
        customer: {
          email: order.customer_email,
          name: order.customer_name,
        },
        metadata: {
          source: 'ay-food-checkout',
          order_number: order.order_number,
          order_id: order.id,
          order_total_ngn: String(orderTotalNgn),
          processing_fee_ngn: String(processingFeeNgn),
        },
      }),
    });

    const initPayload = (await initResponse.json()) as KoraInitializeResponse & {
      message?: string;
    };

    if (!initResponse.ok || !initPayload.status || !initPayload.data?.checkout_url) {
      await admin
        .from('payments')
        .update({
          status: 'FAILED',
          metadata: {
            source: 'ay-food-checkout',
            init_error: initPayload.message || 'Kora initialize failed',
          },
        })
        .eq('id', payment.id);

      throw new Error(koraErrorMessage(initResponse.status, initPayload));
    }

    await admin
      .from('payments')
      .update({
        status: 'PROCESSING',
        provider_ref: initPayload.data.reference ?? null,
        metadata: {
          source: 'ay-food-checkout',
          checkout_url: initPayload.data.checkout_url,
          order_number: order.order_number,
          order_total_ngn: orderTotalNgn,
          processing_fee_ngn: processingFeeNgn,
          charge_amount_ngn: chargeAmountNgn,
        },
      })
      .eq('id', payment.id);

    return jsonResponse({
      ok: true,
      reference,
      checkoutUrl: initPayload.data.checkout_url,
      orderNumber: order.order_number,
      amount: chargeAmountNgn,
      orderTotal: orderTotalNgn,
      processingFee: processingFeeNgn,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Server error' },
      500,
    );
  }
});
