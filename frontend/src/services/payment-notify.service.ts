import { formatCurrency } from '../utils/helpers';
import type { WhatsAppOrderDetails } from '../utils/whatsapp-order';
import { postFormSubmitBrowser, type FormSubmitResult } from '../lib/formsubmit-browser';

function formatItems(order: WhatsAppOrderDetails): string {
  if (order.items.length === 0) return '—';

  const groups: Array<{ packName: string; items: WhatsAppOrderDetails['items'] }> = [];
  const indexByName = new Map<string, number>();

  for (const item of order.items) {
    const packName = item.packName?.trim() || 'Other items';
    let idx = indexByName.get(packName);
    if (idx === undefined) {
      idx = groups.length;
      indexByName.set(packName, idx);
      groups.push({ packName, items: [] });
    }
    groups[idx].items.push(item);
  }

  return groups
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

/** Owner-facing FormSubmit fields only — no tracking URL or internal metadata. */
function buildOwnerAlertFields(order: WhatsAppOrderDetails): Record<string, string> {
  const orderType = order.orderType === 'DELIVERY' ? 'Delivery' : 'Pickup';
  const address =
    order.orderType === 'DELIVERY'
      ? order.deliveryAddress?.trim() || '—'
      : 'Pickup (no delivery address)';

  return {
    _subject: `New paid order — ${order.orderNumber}`,
    _replyto: order.customerEmail?.trim() || '',
    name: order.customerName,
    email: order.customerEmail?.trim() || '—',
    phone: order.customerPhone,
    order_type: orderType,
    address,
    amount_paid: formatCurrency(order.total),
    order_items: formatItems(order),
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
