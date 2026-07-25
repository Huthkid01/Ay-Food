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

/** Alert admin inbox via FormSubmit when customer confirms bank transfer. */
export async function notifyAdminPaymentConfirmed(
  order: WhatsAppOrderDetails,
): Promise<FormSubmitResult> {
  const orderType = order.orderType === 'DELIVERY' ? 'Delivery' : 'Pickup';
  const address =
    order.orderType === 'DELIVERY'
      ? order.deliveryAddress?.trim() || '—'
      : 'N/A (pickup)';

  return postFormSubmitBrowser({
    _subject: `Payment confirmed: ${order.orderNumber}`,
    _replyto: order.customerEmail?.trim() || '',
    form_type: 'Order payment confirmed',
    order_number: order.orderNumber,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    customer_email: order.customerEmail?.trim() || '—',
    order_type: orderType,
    delivery_address: address,
    delivery_instructions: order.deliveryInstructions?.trim() || '—',
    items: formatItems(order),
    total: formatCurrency(order.total),
    payment_status: 'Customer clicked “I have made payment”',
    message: [
      `Customer confirmed bank transfer for order ${order.orderNumber}.`,
      `Total: ${formatCurrency(order.total)}`,
      `Name: ${order.customerName}`,
      `Phone: ${order.customerPhone}`,
      `Type: ${orderType}`,
    ].join('\n'),
  });
}
