/**
 * Manual SMTP test (Truehost).
 * POST { "to": "email@example.com" } or { "to": ["a@x.com","b@x.com"] }
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

    const body = (await req.json().catch(() => ({}))) as {
      to?: string | string[];
    };

    const recipients = (Array.isArray(body.to) ? body.to : [body.to])
      .map((v) => String(v ?? '').trim().toLowerCase())
      .filter((v) => v.includes('@'));

    if (!recipients.length) {
      return jsonResponse({ error: 'Valid "to" email is required' }, 400);
    }

    const results: Array<{ to: string; ok: boolean; orderNumber?: string; error?: string }> =
      [];

    for (const to of recipients) {
      const orderNumber = `TEST-${Date.now().toString().slice(-6)}`;
      try {
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
        results.push(
          ok
            ? { to, ok: true, orderNumber }
            : {
                to,
                ok: false,
                orderNumber,
                error: 'SMTP send failed. Check SMTP secrets / Truehost mailbox.',
              },
        );
      } catch (err) {
        results.push({
          to,
          ok: false,
          orderNumber,
          error: err instanceof Error ? err.message : 'Send failed',
        });
      }
    }

    const allOk = results.every((r) => r.ok);
    return jsonResponse({ ok: allOk, results }, allOk ? 200 : 500);
  } catch (err) {
    console.error('smtp-test-email failed', err);
    return jsonResponse(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to send test email',
      },
      500,
    );
  }
});
