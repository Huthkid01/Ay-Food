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

    const { reference } = await req.json();
    if (!reference) {
      return jsonResponse({ error: 'reference required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: payment, error } = await supabase
      .from('payments')
      .update({ status: 'COMPLETED' })
      .eq('reference', reference)
      .select('*, orders(*)')
      .single();

    if (error || !payment) {
      return jsonResponse({ error: error?.message ?? 'Payment not found' }, 404);
    }

    return jsonResponse({ payment });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Server error' }, 500);
  }
});
