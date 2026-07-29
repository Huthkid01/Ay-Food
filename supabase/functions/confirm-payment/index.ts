import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  orderEmailFromCompleteResult,
  sendOrderPaidEmails,
} from '../_shared/order-email.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as {
      orderId?: string;
      adminToken?: string;
    };

    const orderId = body.orderId?.trim();
    const adminToken = body.adminToken?.trim();
    if (!orderId || !adminToken) {
      return jsonResponse({ error: 'orderId and adminToken are required' }, 400);
    }

    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) {
      throw new Error('Supabase service credentials are not configured');
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: complete, error: completeError } = await admin.rpc(
      'admin_confirm_payment_received',
      {
        p_admin_token: adminToken,
        p_order_id: orderId,
      },
    );

    if (completeError) {
      throw new Error(completeError.message || 'Could not confirm payment');
    }

    const result = complete as {
      already_completed?: boolean;
      email_sent?: boolean;
      order: Record<string, unknown>;
      items: Array<Record<string, unknown>>;
      payment_reference?: string;
    };

    let emailed = Boolean(result.email_sent);
    if (!emailed) {
      emailed = await sendOrderPaidEmails(
        orderEmailFromCompleteResult({
          order: result.order,
          items: result.items as never,
        }),
      );
      if (emailed) {
        await admin.rpc('admin_mark_payment_email_sent', {
          p_admin_token: adminToken,
          p_order_id: orderId,
        });
      }
    }

    return jsonResponse({
      ok: true,
      alreadyCompleted: Boolean(result.already_completed),
      emailed,
      orderNumber: String(result.order.order_number ?? ''),
      status: String(result.order.status ?? 'RECEIVED'),
      paymentReference: result.payment_reference ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not confirm payment';
    return jsonResponse({ error: message }, 400);
  }
});
