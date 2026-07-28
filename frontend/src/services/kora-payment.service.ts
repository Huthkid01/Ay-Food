import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { CreateOrderInput } from './orders.service';

export type KoraCheckoutResult = {
  reference: string;
  checkoutUrl: string;
  orderNumber: string;
  amount: number;
};

export type KoraVerifyResult = {
  ok: boolean;
  paid: boolean;
  orderNumber: string;
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  tax?: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderType: string;
  deliveryAddress?: string | null;
  deliveryInstructions?: string | null;
  items: Array<{
    food_name?: string;
    portion_name?: string;
    quantity?: number;
    unit_price?: number;
    total_price?: number;
    pack_name?: string | null;
  }>;
  reference: string;
  error?: string;
  message?: string;
};

const PENDING_KEY = 'ay-food-kora-pending';

export type PendingKoraCheckout = {
  reference: string;
  orderNumber: string;
};

export function savePendingKoraCheckout(pending: PendingKoraCheckout) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // ignore
  }
}

export function readPendingKoraCheckout(): PendingKoraCheckout | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingKoraCheckout;
  } catch {
    return null;
  }
}

export function clearPendingKoraCheckout() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

function assertSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
}

/** Create order + PENDING Kora payment row. */
export async function createOrderAwaitingKora(
  input: CreateOrderInput,
  paymentReference?: string,
): Promise<{ orderNumber: string; total: number; paymentReference: string }> {
  assertSupabase();

  const { data, error } = await supabase.rpc('create_guest_order_awaiting_kora', {
    p_order_number: input.orderNumber,
    p_order_type: input.orderType,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_customer_email: input.customerEmail,
    p_subtotal: input.subtotal,
    p_tax: input.tax,
    p_delivery_fee: input.deliveryFee,
    p_total: input.total,
    p_items: input.items.map((i) => ({
      food_id: i.foodId ?? null,
      food_name: i.foodName,
      portion_name: i.portionName,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      total_price: i.unitPrice * i.quantity,
      notes: i.notes ?? null,
      pack_name: i.packName ?? null,
    })),
    p_delivery_address: input.deliveryAddress ?? null,
    p_delivery_instructions: input.deliveryInstructions ?? null,
    p_discount: input.discount ?? 0,
    p_payment_reference: paymentReference ?? null,
  });

  if (error) throw new Error(error.message || 'Failed to create order');

  const row = data as {
    order?: { order_number?: string; total?: number };
    payment_reference?: string;
  };

  return {
    orderNumber: String(row.order?.order_number ?? input.orderNumber),
    total: Number(row.order?.total ?? input.total),
    paymentReference: String(row.payment_reference ?? ''),
  };
}

/** Initialize Kora hosted checkout for an existing awaiting-payment order. */
export async function startKoraCheckout(orderNumber: string): Promise<KoraCheckoutResult> {
  assertSupabase();

  const { data, error } = await supabase.functions.invoke('kora-init', {
    body: { orderNumber },
  });

  if (error) {
    throw new Error(error.message || 'Could not start Kora payment');
  }

  const payload = data as {
    error?: string;
    ok?: boolean;
    alreadyPaid?: boolean;
    reference?: string;
    checkoutUrl?: string;
    orderNumber?: string;
    amount?: number;
  };

  if (payload.error) throw new Error(payload.error);
  if (payload.alreadyPaid) {
    throw new Error('This order is already paid. Open Track Order with your number.');
  }
  if (!payload.checkoutUrl || !payload.reference) {
    throw new Error('Kora did not return a checkout URL');
  }

  return {
    reference: payload.reference,
    checkoutUrl: payload.checkoutUrl,
    orderNumber: payload.orderNumber || orderNumber,
    amount: Number(payload.amount ?? 0),
  };
}

/** After Kora redirect — verify charge and finalize order emails. */
export async function verifyKoraPayment(reference: string): Promise<KoraVerifyResult> {
  assertSupabase();

  const { data, error } = await supabase.functions.invoke('kora-verify', {
    body: { reference },
  });

  if (error) {
    throw new Error(error.message || 'Could not verify payment');
  }

  const payload = data as KoraVerifyResult & { error?: string };
  if (payload.error) {
    return {
      ok: false,
      paid: false,
      orderNumber: '',
      total: 0,
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      orderType: '',
      items: [],
      reference,
      error: payload.error,
      message: payload.message,
    };
  }

  return payload;
}
