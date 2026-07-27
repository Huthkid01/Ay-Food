/** FormSubmit: admin alert + customer autoresponse thank-you email. */

type OrderEmailItem = {
  food_name?: string;
  portion_name?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  pack_name?: string | null;
};

type OrderEmailPayload = {
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  order_type: string;
  delivery_address?: string | null;
  total: number;
  items: OrderEmailItem[];
};

function formatNgn(amount: number) {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

function formatItems(items: OrderEmailItem[]) {
  if (!items.length) return '—';
  return items
    .map((item) => {
      const name = item.food_name || 'Item';
      const size =
        item.portion_name && item.portion_name.toLowerCase() !== 'standard'
          ? ` (${item.portion_name})`
          : '';
      const pack = item.pack_name ? ` [${item.pack_name}]` : '';
      const qty = item.quantity ?? 1;
      const lineTotal = item.total_price ?? (item.unit_price ?? 0) * qty;
      return `• ${name}${size}${pack} x${qty} — ${formatNgn(lineTotal)}`;
    })
    .join('\n');
}

function getFormSubmitEmail() {
  return (
    Deno.env.get('FORMSUBMIT_EMAIL')?.trim() ||
    'contact@ayfoodpalace.com'
  );
}

function getAppUrl() {
  const configured = Deno.env.get('APP_URL')?.trim().replace(/\/$/, '');
  if (configured) {
    return configured.startsWith('http') ? configured : `https://${configured}`;
  }
  return 'https://www.ayfoodpalace.com';
}

export async function sendOrderPaidEmails(order: OrderEmailPayload): Promise<boolean> {
  const email = getFormSubmitEmail();
  const appUrl = getAppUrl();
  const trackUrl = `${appUrl}/track?order=${encodeURIComponent(order.order_number)}`;
  const itemsText = formatItems(order.items);
  const orderType = order.order_type === 'DELIVERY' ? 'Delivery' : 'Pickup';
  const address =
    order.order_type === 'DELIVERY'
      ? order.delivery_address?.trim() || '—'
      : 'N/A (pickup)';

  const autoresponse = [
    'Thank you for your order at Ay Food Palace!',
    '',
    `We've received your payment and your order is confirmed.`,
    '',
    `Tracking number: ${order.order_number}`,
    `Track your order anytime: ${trackUrl}`,
    '',
    'Your items:',
    itemsText,
    '',
    `Total paid: ${formatNgn(order.total)}`,
    `Order type: ${orderType}`,
    '',
    'If you have any questions, reply to this email or chat with us on the website.',
    '',
    '— Ay Food Palace',
  ].join('\n');

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${email}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        _subject: `Order paid: ${order.order_number}`,
        _template: 'table',
        _captcha: 'false',
        _autoresponse: autoresponse,
        name: order.customer_name,
        email: order.customer_email,
        form_type: 'Customer order paid (Kora)',
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_email: order.customer_email,
        order_type: orderType,
        delivery_address: address,
        items: itemsText,
        total: formatNgn(order.total),
        tracking_url: trackUrl,
        payment_status: 'Paid via Kora',
        message: [
          `Customer paid for order ${order.order_number}.`,
          `Total: ${formatNgn(order.total)}`,
          `Name: ${order.customer_name}`,
          `Phone: ${order.customer_phone}`,
          `Type: ${orderType}`,
          `Track: ${trackUrl}`,
        ].join('\n'),
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('sendOrderPaidEmails failed', err);
    return false;
  }
}

export function orderEmailFromCompleteResult(result: {
  order: Record<string, unknown>;
  items: OrderEmailItem[];
}): OrderEmailPayload {
  const o = result.order;
  return {
    order_number: String(o.order_number ?? ''),
    customer_name: String(o.customer_name ?? ''),
    customer_phone: String(o.customer_phone ?? ''),
    customer_email: String(o.customer_email ?? ''),
    order_type: String(o.order_type ?? 'PICKUP'),
    delivery_address: (o.delivery_address as string | null) ?? null,
    total: Number(o.total ?? 0),
    items: result.items ?? [],
  };
}
