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

function buildOwnerAlertFields(
  order: WhatsAppOrderDetails,
  opts: { formType: string; paymentStatus: string; messageLead: string },
): Record<string, string> {
  const orderType = order.orderType === 'DELIVERY' ? 'Delivery' : 'Pickup';
  const address =
    order.orderType === 'DELIVERY'
      ? order.deliveryAddress?.trim() || '—'
      : 'N/A (pickup)';

  return {
    _subject: `Order paid: ${order.orderNumber}`,
    _replyto: order.customerEmail?.trim() || '',
    form_type: opts.formType,
    order_number: order.orderNumber,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    customer_email: order.customerEmail?.trim() || '—',
    order_type: orderType,
    delivery_address: address,
    delivery_instructions: order.deliveryInstructions?.trim() || '—',
    items: formatItems(order),
    total: formatCurrency(order.total),
    payment_status: opts.paymentStatus,
    payment_provider: order.paymentProvider || '—',
    message: [
      opts.messageLead,
      `Total: ${formatCurrency(order.total)}`,
      `Name: ${order.customerName}`,
      `Phone: ${order.customerPhone}`,
      `Email: ${order.customerEmail?.trim() || '—'}`,
      `Type: ${orderType}`,
      `Address: ${address}`,
      '',
      'Items:',
      formatItems(order),
    ].join('\n'),
  };
}

/** Alert admin inbox via FormSubmit when customer confirms bank transfer. */
export async function notifyAdminPaymentConfirmed(
  order: WhatsAppOrderDetails,
): Promise<FormSubmitResult> {
  return postFormSubmitBrowser(
    buildOwnerAlertFields(order, {
      formType: 'Order payment confirmed',
      paymentStatus: 'Customer clicked “I have made payment”',
      messageLead: `Customer confirmed bank transfer for order ${order.orderNumber}.`,
    }),
  );
}

/** Alert admin when customer pays with Kora and returns to the site. */
export async function notifyAdminKoraPaid(
  order: WhatsAppOrderDetails,
): Promise<FormSubmitResult> {
  return postFormSubmitBrowser(
    buildOwnerAlertFields(order, {
      formType: 'Customer order paid (Kora)',
      paymentStatus: 'Paid via Kora',
      messageLead: `Customer paid via Kora for order ${order.orderNumber}.`,
    }),
  );
}
