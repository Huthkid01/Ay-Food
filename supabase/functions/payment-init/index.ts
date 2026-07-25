import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const { orderId, provider } = await req.json();
    if (!orderId || !provider) {
      return jsonResponse({ error: 'orderId and provider required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return jsonResponse({ error: 'Order not found' }, 404);
    }

    const reference = `PAY-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

    await supabase.from('payments').insert({
      order_id: order.id,
      provider,
      amount: order.total,
      currency: 'NGN',
      status: 'PENDING',
      reference,
    });

    // Placeholder checkout URL — wire Paystack/Flutterwave secrets next
    const authorizationUrl = `${appUrl}/track?order=${order.order_number}&ref=${reference}&provider=${provider}`;

    return jsonResponse({
      reference,
      authorizationUrl,
      amount: order.total,
      provider,
      message: 'Set PAYSTACK_SECRET_KEY / FLUTTERWAVE_SECRET_KEY to enable live checkout',
    });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Server error' }, 500);
  }
});
