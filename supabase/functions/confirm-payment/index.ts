import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  orderEmailFromCompleteResult,
  sendCustomerConfirmationEmail,
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

    const alreadyCompleted = Boolean(result.already_completed);
    const alreadyEmailed = Boolean(result.email_sent);

    // Respond to admin immediately — no waiting for SMTP
    const response = jsonResponse({
      ok: true,
      alreadyCompleted,
      emailed: alreadyEmailed || !alreadyCompleted,
      orderNumber: String(result.order.order_number ?? ''),
      status: String(result.order.status ?? 'RECEIVED'),
      paymentReference: result.payment_reference ?? null,
    });

    // Send the customer email in the background after responding
    if (!alreadyEmailed) {
      const emailPayload = orderEmailFromCompleteResult({
        order: result.order,
        items: result.items as never,
      });

      const sendAndMark = async () => {
        const emailed = await sendCustomerConfirmationEmail(emailPayload);
        if (emailed) {
          await admin.rpc('admin_mark_payment_email_sent', {
            p_admin_token: adminToken,
            p_order_id: orderId,
          });
        }
      };

      // waitUntil keeps the function alive after the response is sent
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(sendAndMark());
      } else {
        // Fallback: fire-and-forget (still non-blocking for the response)
        sendAndMark().catch(() => undefined);
      }
    }

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not confirm payment';
    return jsonResponse({ error: message }, 400);
  }
});
