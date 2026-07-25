import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const orderNumber =
      url.searchParams.get('order') ??
      (req.method === 'POST' ? (await req.json()).orderNumber : null);

    if (!orderNumber) {
      return jsonResponse({ error: 'order number required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*), order_status_history(*)')
      .eq('order_number', orderNumber)
      .single();

    if (error || !order) {
      return jsonResponse({ error: 'Order not found' }, 404);
    }

    return jsonResponse({ order });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Server error' }, 500);
  }
});
