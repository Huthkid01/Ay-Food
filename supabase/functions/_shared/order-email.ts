/**
 * Customer thank-you via Brevo SMTP.
 * Owner alert via FormSubmit (same as before).
 *
 * Secrets:
 * - BREVO_SMTP_LOGIN, BREVO_SMTP_PASSWORD
 * - optional: BREVO_SMTP_HOST, BREVO_SMTP_PORT, BREVO_FROM_EMAIL, BREVO_FROM_NAME
 * - optional: FORMSUBMIT_EMAIL, APP_URL, ADMIN_ORDER_EMAIL
 */

import nodemailer from 'npm:nodemailer@6.9.16';

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

function formatItemsHtml(items: OrderEmailItem[]) {
  if (!items.length) return '<p>—</p>';
  const rows = items
    .map((item) => {
      const name = item.food_name || 'Item';
      const size =
        item.portion_name && item.portion_name.toLowerCase() !== 'standard'
          ? ` (${item.portion_name})`
          : '';
      const pack = item.pack_name ? ` [${item.pack_name}]` : '';
      const qty = item.quantity ?? 1;
      const lineTotal = item.total_price ?? (item.unit_price ?? 0) * qty;
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${name}${size}${pack}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${qty}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${formatNgn(lineTotal)}</td>
      </tr>`;
    })
    .join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
    <thead>
      <tr>
        <th align="left" style="padding:8px 0;border-bottom:2px solid #ddd;">Item</th>
        <th style="padding:8px 0;border-bottom:2px solid #ddd;">Qty</th>
        <th align="right" style="padding:8px 0;border-bottom:2px solid #ddd;">Price</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function getAppUrl() {
  const configured = Deno.env.get('APP_URL')?.trim().replace(/\/$/, '');
  if (configured) {
    return configured.startsWith('http') ? configured : `https://${configured}`;
  }
  return 'https://www.ayfoodpalace.com';
}

function getOwnerInbox() {
  return (
    Deno.env.get('FORMSUBMIT_EMAIL')?.trim() ||
    Deno.env.get('ADMIN_ORDER_EMAIL')?.trim() ||
    'contact@ayfoodpalace.com'
  );
}

function getFromAddress() {
  const email =
    Deno.env.get('BREVO_FROM_EMAIL')?.trim() ||
    getOwnerInbox();
  const name = Deno.env.get('BREVO_FROM_NAME')?.trim() || 'Ay Food Palace';
  return { email, name, header: `${name} <${email}>` };
}

function createBrevoTransport() {
  const user = Deno.env.get('BREVO_SMTP_LOGIN')?.trim();
  const pass = Deno.env.get('BREVO_SMTP_PASSWORD')?.trim();
  const host = Deno.env.get('BREVO_SMTP_HOST')?.trim() || 'smtp-relay.brevo.com';
  const port = Number(Deno.env.get('BREVO_SMTP_PORT')?.trim() || '587');

  if (!user || !pass) {
    throw new Error(
      'Brevo SMTP is not configured. Set BREVO_SMTP_LOGIN and BREVO_SMTP_PASSWORD in Supabase secrets.',
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/** Customer thank-you + order summary (Brevo SMTP only). */
async function sendCustomerThankYou(order: OrderEmailPayload): Promise<boolean> {
  const customerEmail = order.customer_email?.trim();
  if (!customerEmail) {
    console.error('sendCustomerThankYou: missing customer email');
    return false;
  }

  const appUrl = getAppUrl();
  const trackUrl = `${appUrl}/track?order=${encodeURIComponent(order.order_number)}`;
  const itemsText = formatItems(order.items);
  const itemsHtml = formatItemsHtml(order.items);
  const orderType = order.order_type === 'DELIVERY' ? 'Delivery' : 'Pickup';
  const from = getFromAddress();

  const text = [
    `Hi ${order.customer_name},`,
    '',
    'Thank you for your order at Ay Food Palace!',
    '',
    "We've received your payment and your order is confirmed.",
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

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;line-height:1.5;">
    <h1 style="font-size:22px;margin:0 0 12px;">Thank you for your order!</h1>
    <p style="margin:0 0 16px;">Hi ${order.customer_name}, we've received your payment and your order at <strong>Ay Food Palace</strong> is confirmed.</p>
    <p style="margin:0 0 8px;"><strong>Tracking number:</strong> ${order.order_number}</p>
    <p style="margin:0 0 20px;"><a href="${trackUrl}" style="color:#f97316;">Track your order</a></p>
    <h2 style="font-size:16px;margin:0 0 8px;">Your items</h2>
    ${itemsHtml}
    <p style="margin:16px 0 0;"><strong>Total paid:</strong> ${formatNgn(order.total)}</p>
    <p style="margin:4px 0 0;"><strong>Order type:</strong> ${orderType}</p>
    <p style="margin:24px 0 0;color:#555;font-size:13px;">Questions? Reply to this email or chat with us on <a href="${appUrl}" style="color:#f97316;">ayfoodpalace.com</a>.</p>
  </div>`;

  try {
    const transporter = createBrevoTransport();
    await transporter.sendMail({
      from: from.header,
      to: customerEmail,
      replyTo: from.email,
      subject: `Thank you for your order — ${order.order_number}`,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error('Brevo customer email failed', err);
    return false;
  }
}

/** Owner / kitchen alert (FormSubmit — unchanged channel). */
async function sendOwnerFormSubmitAlert(order: OrderEmailPayload): Promise<boolean> {
  const ownerEmail = getOwnerInbox();
  const appUrl = getAppUrl();
  const trackUrl = `${appUrl}/track?order=${encodeURIComponent(order.order_number)}`;
  const itemsText = formatItems(order.items);
  const orderType = order.order_type === 'DELIVERY' ? 'Delivery' : 'Pickup';
  const address =
    order.order_type === 'DELIVERY'
      ? order.delivery_address?.trim() || '—'
      : 'N/A (pickup)';

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${ownerEmail}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        _subject: `Order paid: ${order.order_number}`,
        _template: 'table',
        _captcha: 'false',
        _replyto: order.customer_email,
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
    console.error('FormSubmit owner alert failed', err);
    return false;
  }
}

/**
 * After Kora payment:
 * 1) Brevo → customer thank-you / order summary
 * 2) FormSubmit → owner order alert
 *
 * Returns true if the customer email succeeded (owner alert is best-effort).
 */
export async function sendOrderPaidEmails(order: OrderEmailPayload): Promise<boolean> {
  const customerOk = await sendCustomerThankYou(order);
  // Owner alert should still fire even if customer SMTP fails
  await sendOwnerFormSubmitAlert(order);
  return customerOk;
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
