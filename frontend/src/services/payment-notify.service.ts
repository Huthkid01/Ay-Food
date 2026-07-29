import { formatCurrency } from '../utils/helpers';
import { comparePackNames, normalizePackName } from '../utils/pack-groups';
import { PACK_FEE } from '../types';
import type { WhatsAppOrderDetails } from '../utils/whatsapp-order';
import { postFormSubmitBrowser, type FormSubmitResult } from '../lib/formsubmit-browser';

function groupItems(order: WhatsAppOrderDetails) {
  const groups: Array<{ packName: string; items: WhatsAppOrderDetails['items'] }> = [];
  const indexByName = new Map<string, number>();

  for (const item of order.items) {
    const packName = normalizePackName(item.packName);
    let idx = indexByName.get(packName);
    if (idx === undefined) {
      idx = groups.length;
      indexByName.set(packName, idx);
      groups.push({ packName, items: [] });
    }
    groups[idx].items.push(item);
  }

  groups.sort((a, b) => comparePackNames(a.packName, b.packName));
  return groups;
}

function formatItems(order: WhatsAppOrderDetails): string {
  if (order.items.length === 0) return '—';

  return groupItems(order)
    .map((group) => {
      const lines = group.items.map((item) => {
        const size =
          item.portionName && item.portionName.toLowerCase() !== 'standard'
            ? ` (${item.portionName})`
            : '';
        return `  • ${item.foodName}${size} x${item.quantity} — ${formatCurrency(item.unitPrice * item.quantity)}`;
      });
      return `${group.packName}:\n${lines.join('\n')}`;
    })
    .join('\n\n');
}

function formatFees(order: WhatsAppOrderDetails): string {
  const packs = groupItems(order);
  const packCount = packs.filter((p) => p.packName !== 'Other items').length || packs.length;
  const itemsTotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const packFees =
    order.packFees != null && order.packFees >= 0
      ? order.packFees
      : order.subtotal != null && order.subtotal > itemsTotal
        ? Math.round(order.subtotal - itemsTotal)
        : packCount * PACK_FEE;
  const lines = [
    `Items subtotal: ${formatCurrency(itemsTotal)}`,
    `Pack fees (${packCount}): ${formatCurrency(packFees)}`,
  ];
  if (order.orderType === 'DELIVERY') {
    lines.push(`Delivery fee: ${formatCurrency(order.deliveryFee ?? 0)}`);
  } else {
    lines.push('Delivery fee: ₦0 (Pickup)');
  }
  lines.push(`Total: ${formatCurrency(order.total)}`);
  return lines.join('\n');
}

/** Owner-facing FormSubmit fields only — no tracking URL or internal metadata. */
function buildOwnerAlertFields(order: WhatsAppOrderDetails): Record<string, string> {
  const orderType = order.orderType === 'DELIVERY' ? 'Delivery' : 'Pickup';
  const address =
    order.orderType === 'DELIVERY'
      ? order.deliveryAddress?.trim() || '—'
      : 'Pickup (no delivery address)';

  return {
    _subject: `New order awaiting payment — ${order.orderNumber}`,
    _replyto: order.customerEmail?.trim() || '',
    name: order.customerName,
    email: order.customerEmail?.trim() || '—',
    phone: order.customerPhone,
    order_type: orderType,
    address,
    amount_paid: formatCurrency(order.total),
    order_items: formatItems(order),
    fees: formatFees(order),
  };
}

/** Alert admin inbox via FormSubmit when customer confirms bank transfer. */
export async function notifyAdminPaymentConfirmed(
  order: WhatsAppOrderDetails,
): Promise<FormSubmitResult> {
  return postFormSubmitBrowser(buildOwnerAlertFields(order));
}

/** Alert admin when customer pays with Kora and returns to the site. */
export async function notifyAdminKoraPaid(
  order: WhatsAppOrderDetails,
): Promise<FormSubmitResult> {
  return postFormSubmitBrowser(buildOwnerAlertFields(order));
}
