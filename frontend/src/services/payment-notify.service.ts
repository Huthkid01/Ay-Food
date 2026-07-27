import { formatCurrency } from '../utils/helpers';
import type { WhatsAppOrderDetails } from '../utils/whatsapp-order';
import { postFormSubmitBrowser, type FormSubmitResult } from '../lib/formsubmit-browser';

function formatItems(order: WhatsAppOrderDetails): string {
  if (order.items.length === 0) return '—';
  return order.items
    .map((item) => {
      const size =
        item.portionName && item.portionName.toLowerCase() !== 'standard'
          ? ` (${item.portionName})`
          : '';
      const pack = item.packName ? ` [${item.packName}]` : '';
      return `• ${item.foodName}${size}${pack} x${item.quantity} — ${formatCurrency(item.unitPrice * item.quantity)}`;
    })
    .join('\n');
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
