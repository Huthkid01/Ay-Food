/**
 * Customer thank-you via Truehost SMTP.
 * Owner alert via FormSubmit AJAX (no page redirect).
 *
 * Secrets:
 * - SMTP_HOST (workplace.truehost.cloud)
 * - SMTP_USER / SMTP_PASSWORD
 * - optional: SMTP_PORT (587), SMTP_FROM_EMAIL, SMTP_FROM_NAME
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
  subtotal?: number;
  tax?: number;
  delivery_fee?: number;
  discount?: number;
  total: number;
  items: OrderEmailItem[];
};

const DEFAULT_PACK_FEE = 300;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNgn(amount: number) {
  return `NGN ${Math.round(amount).toLocaleString('en-NG')}`;
}

function normalizePackName(raw?: string | null): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return 'Other items';
  const match = trimmed.match(/^pack\s*(\d+)$/i);
  if (match) return `Pack ${Number(match[1])}`;
  return trimmed;
}

function packSortKey(name: string): [number, string] {
  const match = name.match(/^pack\s*(\d+)$/i) || name.match(/(\d+)/);
  const num = match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  return [num, name.toLowerCase()];
}

function comparePackNames(a: string, b: string): number {
  const [na, la] = packSortKey(a);
  const [nb, lb] = packSortKey(b);
  if (na !== nb) return na - nb;
  return la.localeCompare(lb);
}

function itemLineTotal(item: OrderEmailItem): number {
  const qty = item.quantity ?? 1;
  return Number(item.total_price ?? (item.unit_price ?? 0) * qty) || 0;
}

function groupItemsByPack(items: OrderEmailItem[]) {
  const groups: Array<{ packName: string; items: OrderEmailItem[]; subtotal: number }> = [];
  const indexByName = new Map<string, number>();

  for (const item of items) {
    const packName = normalizePackName(item.pack_name);
    let idx = indexByName.get(packName);
    if (idx === undefined) {
      idx = groups.length;
      indexByName.set(packName, idx);
      groups.push({ packName, items: [], subtotal: 0 });
    }
    groups[idx].items.push(item);
    groups[idx].subtotal += itemLineTotal(item);
  }

  groups.sort((a, b) => comparePackNames(a.packName, b.packName));
  for (const group of groups) {
    group.items.sort((a, b) =>
      String(a.food_name || '').localeCompare(String(b.food_name || ''), undefined, {
        sensitivity: 'base',
      }),
    );
  }
  return groups;
}

function formatItemLine(item: OrderEmailItem) {
  const name = item.food_name || 'Item';
  const size =
    item.portion_name && item.portion_name.toLowerCase() !== 'standard'
      ? ` (${item.portion_name})`
      : '';
  const qty = item.quantity ?? 1;
  const lineTotal = itemLineTotal(item);
  return { name, size, qty, lineTotal };
}

function sumItems(items: OrderEmailItem[]): number {
  return items.reduce((sum, item) => sum + itemLineTotal(item), 0);
}

function deriveOrderTotals(order: OrderEmailPayload) {
  const itemsTotal = Math.round(sumItems(order.items));
  const packs = groupItemsByPack(order.items);
  const packCount = packs.filter((p) => p.packName !== 'Other items').length || packs.length;
  const orderSubtotal = Math.round(Number(order.subtotal ?? 0));
  const deliveryFee = Math.round(Number(order.delivery_fee ?? 0));
  const tax = Math.round(Number(order.tax ?? 0));
  const discount = Math.round(Number(order.discount ?? 0));
  const total = Math.round(Number(order.total ?? 0));

  let packFees = orderSubtotal > itemsTotal ? orderSubtotal - itemsTotal : 0;
  if (packFees <= 0 && packCount > 0) {
    packFees = packCount * DEFAULT_PACK_FEE;
  }

  return { itemsTotal, packFees, packCount, deliveryFee, tax, discount, total, packs };
}

function isDeliveryOrder(order: OrderEmailPayload): boolean {
  return String(order.order_type || '').toUpperCase() === 'DELIVERY';
}

function formatItems(items: OrderEmailItem[]) {
  if (!items.length) return '-';
  const groups = groupItemsByPack(items);
  const blocks: string[] = [];
  for (const group of groups) {
    blocks.push(`${group.packName}:`);
    for (const item of group.items) {
      const { name, size, qty, lineTotal } = formatItemLine(item);
      blocks.push(`  - ${name}${size} x${qty}: ${formatNgn(lineTotal)}`);
    }
    blocks.push(`  Pack subtotal: ${formatNgn(group.subtotal)}`);
  }
  return blocks.join('\n');
}

function formatTotalsText(order: OrderEmailPayload): string {
  const t = deriveOrderTotals(order);
  const lines = [
    `Items subtotal: ${formatNgn(t.itemsTotal)}`,
    `Pack fees (${t.packCount} pack${t.packCount === 1 ? '' : 's'}): ${formatNgn(t.packFees)}`,
  ];
  if (isDeliveryOrder(order)) {
    lines.push(`Delivery fee: ${formatNgn(t.deliveryFee)}`);
  } else {
    lines.push('Delivery fee: NGN 0 (Pickup)');
  }
  if (t.tax > 0) lines.push(`Tax: ${formatNgn(t.tax)}`);
  if (t.discount > 0) lines.push(`Discount: -${formatNgn(t.discount)}`);
  lines.push(`Total: ${formatNgn(t.total)}`);
  return lines.join('\n');
}

/** Inbox-safe pack summary: Pack 1 → Pack 2 → … with simple tables. */
function formatItemsHtml(items: OrderEmailItem[]) {
  if (!items.length) {
    return '<p style="margin:0;padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#555555;">No items</p>';
  }

  const groups = groupItemsByPack(items);
  return groups.map((group) => renderPackSectionHtml(group)).join('');
}

function renderPackSectionHtml(group: {
  packName: string;
  items: OrderEmailItem[];
  subtotal: number;
}) {
  const rows = group.items
    .map((item) => {
      const { name, size, qty, lineTotal } = formatItemLine(item);
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;color:#222222;">${escapeHtml(name)}${escapeHtml(size)}</td>
        <td align="center" width="48" style="padding:8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;color:#222222;">${qty}</td>
        <td align="right" width="96" style="padding:8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;color:#222222;">${formatNgn(lineTotal)}</td>
      </tr>`;
    })
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 16px 0;">
    <tr>
      <td colspan="3" style="padding:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.4;font-weight:bold;color:#111111;">
        ${escapeHtml(group.packName)}
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 6px 0;border-bottom:1px solid #dddddd;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#666666;">Item</td>
      <td align="center" width="48" style="padding:0 0 6px 0;border-bottom:1px solid #dddddd;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#666666;">Qty</td>
      <td align="right" width="96" style="padding:0 0 6px 0;border-bottom:1px solid #dddddd;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#666666;">Amount</td>
    </tr>
    ${rows}
    <tr>
      <td colspan="2" style="padding:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#555555;">Pack subtotal</td>
      <td align="right" style="padding:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111111;">${formatNgn(group.subtotal)}</td>
    </tr>
  </table>`;
}

function formatTotalsHtml(order: OrderEmailPayload): string {
  const t = deriveOrderTotals(order);
  const deliveryLabel = isDeliveryOrder(order) ? 'Delivery fee' : 'Delivery fee (Pickup)';
  const deliveryValue = isDeliveryOrder(order) ? formatNgn(t.deliveryFee) : 'NGN 0';

  const rows = [
    ['Items subtotal', formatNgn(t.itemsTotal)],
    [`Pack fees (${t.packCount} pack${t.packCount === 1 ? '' : 's'})`, formatNgn(t.packFees)],
    [deliveryLabel, deliveryValue],
  ];
  if (t.tax > 0) rows.push(['Tax', formatNgn(t.tax)]);
  if (t.discount > 0) rows.push(['Discount', `-${formatNgn(t.discount)}`]);

  const body = rows
    .map(
      ([label, value]) => `<tr>
      <td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#555555;">${escapeHtml(label)}</td>
      <td align="right" style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222222;">${escapeHtml(value)}</td>
    </tr>`,
    )
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
    ${body}
    <tr>
      <td style="padding:10px 0 0 0;border-top:1px solid #dddddd;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#111111;">Total</td>
      <td align="right" style="padding:10px 0 0 0;border-top:1px solid #dddddd;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#111111;">${formatNgn(t.total)}</td>
    </tr>
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
    Deno.env.get('SMTP_FROM_EMAIL')?.trim() ||
    Deno.env.get('SMTP_USER')?.trim() ||
    'contact@ayfoodpalace.com';
  const name = Deno.env.get('SMTP_FROM_NAME')?.trim() || 'Ay Food Palace';
  return { email, name, header: `"${name.replace(/"/g, '')}" <${email}>` };
}

function createMessageId(orderNumber: string, fromEmail: string) {
  const domain = fromEmail.includes('@') ? fromEmail.split('@')[1] : 'ayfoodpalace.com';
  const safeOrder = orderNumber.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 24) || 'order';
  const stamp = `${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  return `<${safeOrder}.${stamp}@${domain}>`;
}

function createSmtpTransport() {
  const user = Deno.env.get('SMTP_USER')?.trim();
  const pass = Deno.env.get('SMTP_PASSWORD')?.trim();
  const host =
    Deno.env.get('SMTP_HOST')?.trim() || 'workplace.truehost.cloud';
  const port = Number(Deno.env.get('SMTP_PORT')?.trim() || '587');

  if (!user || !pass) {
    throw new Error(
      'SMTP is not configured. Set SMTP_USER and SMTP_PASSWORD in Supabase secrets.',
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
  });
}

function buildCustomerEmail(order: OrderEmailPayload) {
  const appUrl = getAppUrl();
  const trackUrl = `${appUrl}/track?order=${encodeURIComponent(order.order_number)}`;
  const itemsText = formatItems(order.items);
  const itemsHtml = formatItemsHtml(order.items);
  const totalsText = formatTotalsText(order);
  const totalsHtml = formatTotalsHtml(order);
  const delivery = isDeliveryOrder(order);
  const orderType = delivery ? 'Delivery' : 'Pickup';
  const customerName = (order.customer_name || 'there').trim() || 'there';
  const safeName = escapeHtml(customerName);
  const safeOrder = escapeHtml(order.order_number);
  const addressLine =
    delivery && order.delivery_address?.trim()
      ? `Delivery address: ${order.delivery_address.trim()}`
      : delivery
        ? 'Delivery address: —'
        : 'Fulfillment: Pickup (customer collects from restaurant)';
  const safeAddress = escapeHtml(addressLine);

  const subject = `Your Ay Food Palace order ${order.order_number}`;

  const text = [
    `Hi ${customerName},`,
    '',
    'Your order at Ay Food Palace is confirmed. Payment was received successfully.',
    '',
    `Order number: ${order.order_number}`,
    `Order type: ${orderType}`,
    addressLine,
    `Track your order: ${trackUrl}`,
    '',
    'Order summary:',
    itemsText,
    '',
    totalsText,
    '',
    'Need help? Reply to this email or visit https://www.ayfoodpalace.com',
    '',
    'Ay Food Palace',
    'Omoleye, Ogijo, Ogun State, Nigeria',
    'contact@ayfoodpalace.com',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Order ${safeOrder}</title>
  <!--[if mso]>
  <style type="text/css">
    table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <!--[if mso]>
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td>
        <![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:560px;width:100%;background-color:#ffffff;">
          <tr>
            <td style="padding:24px 24px 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.4;color:#111111;font-weight:bold;">
              Order confirmed
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 16px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#333333;">
              Hi ${safeName}, your order at Ay Food Palace is confirmed. Payment was received successfully.
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 16px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#333333;">
              <strong>Order number:</strong> ${safeOrder}<br>
              <strong>Order type:</strong> ${orderType}<br>
              ${safeAddress}<br>
              <a href="${trackUrl}" style="color:#c2410c;text-decoration:underline;">Track your order</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.4;color:#111111;font-weight:bold;">
              Order summary
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 8px 24px;">
              ${itemsHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 24px 24px;">
              ${totalsHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px 24px;border-top:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#666666;">
              Need help? Reply to this email or visit
              <a href="${appUrl}" style="color:#c2410c;text-decoration:underline;">ayfoodpalace.com</a>.<br><br>
              Ay Food Palace<br>
              Omoleye, Ogijo, Ogun State, Nigeria<br>
              <a href="mailto:contact@ayfoodpalace.com" style="color:#666666;text-decoration:underline;">contact@ayfoodpalace.com</a>
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html, trackUrl };
}

/** Customer thank-you + order summary (Truehost SMTP, inbox-friendly). */
async function sendCustomerThankYou(order: OrderEmailPayload): Promise<boolean> {
  const customerEmail = order.customer_email?.trim();
  if (!customerEmail) {
    console.error('sendCustomerThankYou: missing customer email');
    return false;
  }

  const content = buildCustomerEmail(order);
  const from = getFromAddress();
  const messageId = createMessageId(order.order_number, from.email);

  try {
    const transporter = createSmtpTransport();
    await transporter.sendMail({
      from: from.header,
      to: customerEmail,
      replyTo: from.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      messageId,
      priority: 'normal',
      headers: {
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
        'X-Entity-Ref-ID': order.order_number,
        Precedence: 'auto_reply',
      },
      textEncoding: 'quoted-printable',
    });
    return true;
  } catch (err) {
    console.error('Truehost customer email failed', err);
    return false;
  }
}

/** Owner / kitchen alert via FormSubmit AJAX — kitchen fields only (no tracking URL). */
async function sendOwnerFormSubmitAlert(order: OrderEmailPayload): Promise<boolean> {
  const ownerEmail = getOwnerInbox();
  const appUrl = getAppUrl();
  const itemsText = formatItems(order.items);
  const totalsText = formatTotalsText(order);
  const delivery = isDeliveryOrder(order);
  const orderType = delivery ? 'Delivery' : 'Pickup';
  const address = delivery
    ? order.delivery_address?.trim() || '—'
    : 'Pickup (no delivery address)';

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${ownerEmail}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: appUrl,
        Referer: `${appUrl}/`,
      },
      body: JSON.stringify({
        _subject: `New paid order — ${order.order_number}`,
        _template: 'table',
        _captcha: 'false',
        _replyto: order.customer_email,
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        order_type: orderType,
        address,
        amount_paid: formatNgn(order.total),
        order_items: itemsText,
        fees: totalsText,
      }),
    });

    const payload = (await res.json().catch(() => null)) as
      | { success?: string | boolean; message?: string }
      | null;
    const success =
      res.ok &&
      (payload == null ||
        payload.success === true ||
        payload.success === 'true' ||
        String(payload.success).toLowerCase() === 'true');

    if (!success) {
      console.error('FormSubmit owner alert rejected', res.status, payload);
      return false;
    }
    return true;
  } catch (err) {
    console.error('FormSubmit owner alert failed', err);
    return false;
  }
}

/**
 * After Kora payment:
 * 1) FormSubmit AJAX → owner alert (browser also sends; no page redirect)
 * 2) Truehost SMTP → customer thank-you / order summary
 */
export async function sendOrderPaidEmails(order: OrderEmailPayload): Promise<boolean> {
  await sendOwnerFormSubmitAlert(order);
  return await sendCustomerThankYou(order);
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
    subtotal: Number(o.subtotal ?? 0),
    tax: Number(o.tax ?? 0),
    delivery_fee: Number(o.delivery_fee ?? 0),
    discount: Number(o.discount ?? 0),
    total: Number(o.total ?? 0),
    items: result.items ?? [],
  };
}
