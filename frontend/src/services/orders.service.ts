import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { adminRpc } from '../lib/admin-rpc';
import type { AdminOrder, AdminOrderItem, AdminOrderStatus } from './admin-store';

export type CreateOrderInput = {
  orderNumber: string;
  orderType: 'DELIVERY' | 'PICKUP';
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount?: number;
  total: number;
  items: Array<{
    foodId?: string;
    foodName: string;
    portionName: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
    packName?: string;
  }>;
};

type DbOrderRow = {
  id: string;
  order_number: string;
  status: string;
  order_type: string;
  subtotal: number;
  tax: number;
  delivery_fee: number;
  discount: number;
  total: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_address?: string | null;
  delivery_instructions?: string | null;
  created_at: string;
  payment_status?: string | null;
  payment_provider?: string | null;
  payment_amount?: number | null;
  payment_reference?: string | null;
  payment_paid?: boolean | null;
  order_items?: Array<{
    id: string;
    food_name: string;
    portion_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes?: string | null;
    pack_name?: string | null;
  }>;
};

function mapItems(rows?: DbOrderRow['order_items']): AdminOrderItem[] {
  return (rows ?? []).map((i) => ({
    id: i.id,
    portionName: i.portion_name,
    quantity: i.quantity,
    unitPrice: i.unit_price,
    totalPrice: i.total_price,
    notes: i.notes ?? undefined,
    packName: i.pack_name ?? undefined,
    food: { name: i.food_name },
  }));
}

export function mapDbOrder(row: DbOrderRow): AdminOrder {
  const paymentStatus = row.payment_status ? String(row.payment_status) : undefined;
  const paymentPaid =
    typeof row.payment_paid === 'boolean'
      ? row.payment_paid
      : paymentStatus === 'COMPLETED';

  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status as AdminOrderStatus,
    orderType: row.order_type as 'DELIVERY' | 'PICKUP',
    subtotal: Number(row.subtotal),
    tax: Number(row.tax),
    deliveryFee: Number(row.delivery_fee),
    discount: Number(row.discount ?? 0),
    total: Number(row.total),
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    deliveryAddress: row.delivery_address ?? undefined,
    createdAt: row.created_at,
    items: mapItems(row.order_items),
    paymentPaid,
    paymentStatus,
    paymentProvider: row.payment_provider ? String(row.payment_provider) : undefined,
    paymentAmount:
      row.payment_amount != null && Number.isFinite(Number(row.payment_amount))
        ? Number(row.payment_amount)
        : undefined,
    paymentReference: row.payment_reference ? String(row.payment_reference) : undefined,
  };
}

function assertSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY so orders save to the database.',
    );
  }
}

/** Create order in Supabase (source of truth — not localStorage). */
export async function createOrderInDatabase(input: CreateOrderInput): Promise<AdminOrder> {
  assertSupabase();

  const payload = {
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
  };

  const { data, error } = await supabase.rpc('create_guest_order', payload);
  if (error) throw new Error(error.message || 'Failed to create order in database');

  const row = data as DbOrderRow;
  // Re-fetch with items for a complete AdminOrder
  const full = await getOrderByNumber(row.order_number);
  if (full) return full;

  return mapDbOrder({ ...row, order_items: [] });
}

export async function getOrderByNumber(orderNumber: string): Promise<AdminOrder | null> {
  assertSupabase();
  const { data, error } = await supabase.rpc('get_order_by_number', {
    p_order_number: orderNumber.trim(),
  });
  if (error) throw new Error(error.message || 'Failed to load order');
  if (!data) return null;
  return mapDbOrder(data as DbOrderRow);
}

export async function listOrdersFromDatabase(limit = 100): Promise<AdminOrder[]> {
  assertSupabase();
  const data = await adminRpc<DbOrderRow[]>('admin_list_orders', { p_limit: limit });
  const rows = data ?? [];
  return rows.map(mapDbOrder);
}

export async function updateOrderStatusInDatabase(
  orderId: string,
  status: AdminOrderStatus,
): Promise<AdminOrder> {
  assertSupabase();
  const row = await adminRpc<DbOrderRow>('admin_update_order_status', {
    p_order_id: orderId,
    p_status: status,
  });
  const full = await getOrderByNumber(row.order_number);
  if (full) return full;
  return mapDbOrder({ ...row, order_items: [] });
}

/** Admin confirms OPay / bank transfer → marks paid, sets RECEIVED, emails customer. */
export async function confirmPaymentReceivedInDatabase(
  orderId: string,
): Promise<{ orderNumber: string; emailed: boolean; alreadyCompleted: boolean }> {
  assertSupabase();
  const { getAdminToken } = await import('../lib/admin-token');
  const adminToken = getAdminToken();
  if (!adminToken) {
    throw new Error('Admin session expired — please sign in again');
  }

  const { data, error } = await supabase.functions.invoke('confirm-payment', {
    body: { orderId, adminToken },
  });

  if (error) {
    throw new Error(error.message || 'Could not confirm payment');
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    orderNumber?: string;
    emailed?: boolean;
    alreadyCompleted?: boolean;
  };

  if (payload.error || !payload.ok) {
    throw new Error(payload.error || 'Could not confirm payment');
  }

  return {
    orderNumber: payload.orderNumber || '',
    emailed: Boolean(payload.emailed),
    alreadyCompleted: Boolean(payload.alreadyCompleted),
  };
}

export type OrderStats = {
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
  weekOrders: number;
  weekRevenue: number;
  monthOrders: number;
  monthRevenue: number;
  totalCustomers: number;
};

export async function getOrderStatsFromDatabase(): Promise<OrderStats> {
  assertSupabase();
  const s = await adminRpc<Record<string, number>>('admin_order_stats');
  return {
    totalOrders: Number(s.totalOrders ?? 0),
    totalRevenue: Number(s.totalRevenue ?? 0),
    todayOrders: Number(s.todayOrders ?? 0),
    todayRevenue: Number(s.todayRevenue ?? 0),
    weekOrders: Number(s.weekOrders ?? 0),
    weekRevenue: Number(s.weekRevenue ?? 0),
    monthOrders: Number(s.monthOrders ?? 0),
    monthRevenue: Number(s.monthRevenue ?? 0),
    totalCustomers: Number(s.totalCustomers ?? 0),
  };
}

export async function listCustomersFromDatabase() {
  const orders = await listOrdersFromDatabase(500);
  const map = new Map<
    string,
    {
      email: string;
      name: string;
      phone: string;
      orders: number;
      totalSpent: number;
      lastOrderAt: string;
    }
  >();

  for (const order of orders) {
    if (order.status === 'CANCELLED') continue;
    const key = order.customerEmail.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.orders += 1;
      existing.totalSpent += order.total;
      if (new Date(order.createdAt) > new Date(existing.lastOrderAt)) {
        existing.lastOrderAt = order.createdAt;
        existing.name = order.customerName;
        existing.phone = order.customerPhone;
      }
    } else {
      map.set(key, {
        email: order.customerEmail,
        name: order.customerName,
        phone: order.customerPhone,
        orders: 1,
        totalSpent: order.total,
        lastOrderAt: order.createdAt,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.totalSpent - a.totalSpent);
}

/** Wipe all orders (and cascaded items) for a fresh owner handoff. */
export async function clearOrdersInDatabase(): Promise<{ deletedOrders: number }> {
  assertSupabase();
  const data = await adminRpc<{ deletedOrders?: number }>('admin_clear_orders');
  return { deletedOrders: Number(data?.deletedOrders ?? 0) };
}
