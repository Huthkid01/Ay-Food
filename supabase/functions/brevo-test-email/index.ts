/**
 * One-off / manual Brevo test (sample order summary).
 * POST { "to": "email@example.com" }
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { sendOrderPaidEmails } from '../_shared/order-email.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const body = (await req.json().catch(() => ({}))) as { to?: string };
    const to = String(body.to ?? '').trim().toLowerCase();
    if (!to || !to.includes('@')) {
      return jsonResponse({ error: 'Valid "to" email is required' }, 400);
    }

    const orderNumber = `TEST-${Date.now().toString().slice(-6)}`;
    const ok = await sendOrderPaidEmails({
      order_number: orderNumber,
      customer_name: 'Test Customer',
      customer_phone: '08173097933',
      customer_email: to,
      order_type: 'DELIVERY',
      delivery_address: 'Omoleye, Ogijo (test)',
      total: 8500,
      items: [
        {
          food_name: 'Jollof Rice',
          portion_name: 'Regular',
          quantity: 1,
          unit_price: 3500,
          total_price: 3500,
          pack_name: 'Pack 1',
        },
        {
          food_name: 'Fried Chicken',
          portion_name: '2 pcs',
          quantity: 1,
          unit_price: 3000,
          total_price: 3000,
          pack_name: 'Pack 1',
        },
        {
          food_name: 'Plantain',
          portion_name: 'Side',
          quantity: 1,
          unit_price: 1000,
          total_price: 1000,
          pack_name: 'Pack 1',
        },
      ],
    });

    if (!ok) {
      return jsonResponse(
        {
          ok: false,
          error:
            'Brevo send failed. Confirm sender email is verified in Brevo, or set BREVO_API_KEY (recommended for Edge Functions).',
        },
        500,
      );
    }

    return jsonResponse({
      ok: true,
      to,
      orderNumber,
      note: 'Sample order-summary thank-you email sent via Brevo',
    });
  } catch (err) {
    console.error('brevo-test-email failed', err);
    return jsonResponse(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to send test email',
      },
      500,
    );
  }
});
