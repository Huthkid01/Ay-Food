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

    const body = await req.json();
    const {
      items,
      orderType,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      deliveryInstructions,
      packFees = 0,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return jsonResponse({ error: 'Cart is empty' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: restaurant, error: restErr } = await supabase
      .from('restaurants')
      .select('id, tax_rate, restaurant_settings(default_delivery_fee)')
      .eq('slug', 'ay-food')
      .single();

    if (restErr || !restaurant) {
      return jsonResponse({ error: 'Restaurant not found' }, 404);
    }

    const itemsSubtotal = items.reduce(
      (sum: number, item: { unitPrice: number; quantity: number }) =>
        sum + Number(item.unitPrice) * Number(item.quantity),
      0
    );
    const subtotal = itemsSubtotal + Number(packFees || 0);
    const tax = (subtotal * Number(restaurant.tax_rate)) / 100;
    const settings = Array.isArray(restaurant.restaurant_settings)
      ? restaurant.restaurant_settings[0]
      : restaurant.restaurant_settings;
    const deliveryFee =
      orderType === 'DELIVERY' ? Number(settings?.default_delivery_fee ?? 1500) : 0;
    const total = subtotal + tax + deliveryFee;
    const orderNumber = `AY-${Date.now().toString().slice(-8)}`;

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        restaurant_id: restaurant.id,
        status: 'RECEIVED',
        order_type: orderType,
        subtotal,
        tax,
        delivery_fee: deliveryFee,
        discount: 0,
        total,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        delivery_address: deliveryAddress ?? null,
        delivery_instructions: deliveryInstructions ?? null,
      })
      .select('*')
      .single();

    if (orderErr || !order) {
      return jsonResponse({ error: orderErr?.message ?? 'Failed to create order' }, 500);
    }

    const lineItems = items.map(
      (item: {
        foodId?: string;
        foodName?: string;
        portionName: string;
        quantity: number;
        unitPrice: number;
        notes?: string;
        packName?: string;
      }) => ({
        order_id: order.id,
        food_id: item.foodId ?? null,
        food_name: item.foodName ?? 'Item',
        portion_name: item.portionName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.unitPrice * item.quantity,
        notes: item.notes ?? null,
        pack_name: item.packName ?? null,
      })
    );

    const { error: itemsErr } = await supabase.from('order_items').insert(lineItems);
    if (itemsErr) {
      return jsonResponse({ error: itemsErr.message }, 500);
    }

    await supabase.from('order_status_history').insert({
      order_id: order.id,
      status: 'RECEIVED',
      note: 'Order received',
    });

    return jsonResponse({ order });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Server error' }, 500);
  }
});
