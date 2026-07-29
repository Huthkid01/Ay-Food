import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  orderEmailFromCompleteResult,
  sendOutForDeliveryEmail,
} from '../_shared/order-email.ts';

// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as {
      orderId?: string;
      status?: string;
      adminToken?: string;
    };

    const orderId = body.orderId?.trim();
    const status = body.status?.trim().toUpperCase();
    const adminToken = body.adminToken?.trim();

    if (!orderId || !status || !adminToken) {
      return jsonResponse({ error: 'orderId, status and adminToken are required' }, 400);
    }

    // Only send emails for statuses that customers care about
    const EMAIL_STATUSES = ['OUT_FOR_DELIVERY'];
    if (!EMAIL_STATUSES.includes(status)) {
      return jsonResponse({ ok: true, emailed: false, reason: 'no email for this status' });
    }

    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) throw new Error('Supabase service credentials not configured');

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch full order details for the email
    const { data: orderData, error: orderError } = await admin.rpc('get_order_by_number_for_admin', {
      p_order_id: orderId,
      p_admin_token: adminToken,
    });

    if (orderError || !orderData) {
      // Fallback: fetch order directly from DB without RPC
      const { data: rawOrder, error: rawError } = await admin
        .from('orders')
        .select(`
          id, order_number, status, order_type,
          customer_name, customer_email, customer_phone,
          subtotal, tax, delivery_fee, discount, total,
          delivery_address,
          order_items (
            id, food_name, portion_name, quantity, unit_price, total_price, pack_name
          )
        `)
        .eq('id', orderId)
        .single();

      if (rawError || !rawOrder) {
        return jsonResponse({ error: 'Order not found' }, 404);
      }

      const emailPayload = {
        order_number: String(rawOrder.order_number),
        customer_name: String(rawOrder.customer_name),
        customer_phone: String(rawOrder.customer_phone),
        customer_email: String(rawOrder.customer_email),
        order_type: String(rawOrder.order_type),
        delivery_address: rawOrder.delivery_address ?? null,
        subtotal: Number(rawOrder.subtotal ?? 0),
        tax: Number(rawOrder.tax ?? 0),
        delivery_fee: Number(rawOrder.delivery_fee ?? 0),
        discount: Number(rawOrder.discount ?? 0),
        total: Number(rawOrder.total ?? 0),
        items: (rawOrder.order_items ?? []) as never,
      };

      // Respond immediately, email in background
      const response = jsonResponse({ ok: true, emailed: true, status });
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(sendOutForDeliveryEmail(emailPayload));
      } else {
        sendOutForDeliveryEmail(emailPayload).catch(() => undefined);
      }
      return response;
    }

    const emailPayload = orderEmailFromCompleteResult({
      order: orderData.order as Record<string, unknown>,
      items: (orderData.items ?? []) as never,
    });

    const response = jsonResponse({ ok: true, emailed: true, status });
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(sendOutForDeliveryEmail(emailPayload));
    } else {
      sendOutForDeliveryEmail(emailPayload).catch(() => undefined);
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not send notification';
    return jsonResponse({ error: message }, 400);
  }
});
