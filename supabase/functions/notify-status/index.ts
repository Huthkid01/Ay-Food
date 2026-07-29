import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { sendOutForDeliveryEmail } from '../_shared/order-email.ts';

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

    // Only send emails for statuses that need customer notification
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

    // Verify admin token
    const { error: tokenError } = await admin.rpc('require_admin_token', {
      p_token: adminToken,
    });
    if (tokenError) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Fetch order + items directly from DB
    const { data: rawOrder, error: orderError } = await admin
      .from('orders')
      .select('id, order_number, order_type, customer_name, customer_email, customer_phone, subtotal, tax, delivery_fee, discount, total, delivery_address')
      .eq('id', orderId)
      .single();

    if (orderError || !rawOrder) {
      console.error('Order fetch error:', orderError);
      return jsonResponse({ error: 'Order not found' }, 404);
    }

    const { data: itemRows } = await admin
      .from('order_items')
      .select('food_name, portion_name, quantity, unit_price, total_price, pack_name')
      .eq('order_id', orderId);

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
      items: (itemRows ?? []) as never,
    };

    // Respond to admin instantly — email fires in background
    const response = jsonResponse({ ok: true, emailed: true, status });
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(sendOutForDeliveryEmail(emailPayload));
    } else {
      sendOutForDeliveryEmail(emailPayload).catch((e) => console.error('Email error:', e));
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not send notification';
    console.error('notify-status error:', err);
    return jsonResponse({ error: message }, 400);
  }
});
