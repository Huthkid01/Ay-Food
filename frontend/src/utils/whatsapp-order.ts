import { formatCurrency } from './helpers';
import { comparePackNames, normalizePackName } from './pack-groups';
import { PACK_FEE } from '../types';

export type WhatsAppOrderItem = {
  foodName: string;
  portionName: string;
  quantity: number;
  unitPrice: number;
  packName?: string;
  notes?: string;
};

export type WhatsAppOrderDetails = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderType: 'DELIVERY' | 'PICKUP';
  deliveryAddress?: string;
  deliveryInstructions?: string;
  items: WhatsAppOrderItem[];
  total: number;
  /** Optional extras — only shown when provided */
  subtotal?: number;
  packFees?: number;
  tax?: number;
  deliveryFee?: number;
  paymentProvider?: string;
  paid?: boolean;
  paymentNote?: string;
};

/** Digits only from wa.me URL, tel link, or raw phone. */
export function extractWhatsAppPhone(whatsappUrl: string, fallback = '2348173097933'): string {
  const digits = whatsappUrl.replace(/\D/g, '');
  if (digits.length >= 10) return digits;
  return fallback;
}

function groupWhatsAppItemsByPack(items: WhatsAppOrderItem[]) {
  const groups: Array<{ packName: string; items: WhatsAppOrderItem[] }> = [];
  const indexByName = new Map<string, number>();

  for (const item of items) {
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
  for (const group of groups) {
    group.items.sort((a, b) =>
      a.foodName.localeCompare(b.foodName, undefined, { sensitivity: 'base' }),
    );
  }
  return groups;
}

function deriveWhatsAppFees(order: WhatsAppOrderDetails) {
  const packs = groupWhatsAppItemsByPack(order.items);
  const packCount = packs.filter((p) => p.packName !== 'Other items').length || packs.length;
  const itemsTotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const packFees =
    order.packFees != null && order.packFees >= 0
      ? order.packFees
      : order.subtotal != null && order.subtotal > itemsTotal
        ? Math.round(order.subtotal - itemsTotal)
        : packCount * PACK_FEE;
  const deliveryFee =
    order.deliveryFee != null
      ? order.deliveryFee
      : order.orderType === 'DELIVERY'
        ? 0
        : 0;
  return { packs, packCount, itemsTotal, packFees, deliveryFee };
}

/**
 * Friendly WhatsApp order note for the kitchen.
 * Keeps name, phone, email, address, items by pack (1→2→3…), fees, and total.
 */
export function buildOrderWhatsAppMessage(order: WhatsAppOrderDetails): string {
  const lines: string[] = [
    `Hi Ay Food Palace! 👋`,
    `I just placed an order (${order.orderNumber}).`,
    '',
  ];

  if (order.customerName?.trim()) {
    lines.push(`Name: ${order.customerName.trim()}`);
  }
  if (order.customerPhone?.trim()) {
    lines.push(`WhatsApp: ${order.customerPhone.trim()}`);
  }
  if (order.customerEmail?.trim()) {
    lines.push(`Email: ${order.customerEmail.trim()}`);
  }

  if (order.orderType === 'DELIVERY') {
    lines.push(`Order type: Delivery`);
    if (order.deliveryAddress?.trim()) {
      lines.push(`Address: ${order.deliveryAddress.trim()}`);
    }
    if (order.deliveryInstructions?.trim()) {
      lines.push(`Note: ${order.deliveryInstructions.trim()}`);
    }
  } else {
    lines.push(`Order type: Pickup`);
  }

  const fees = deriveWhatsAppFees(order);

  if (order.items.length > 0) {
    lines.push('', 'My order:');
    for (const pack of fees.packs) {
      lines.push('', `*${pack.packName}*`);
      for (const item of pack.items) {
        const size =
          item.portionName && item.portionName.toLowerCase() !== 'standard'
            ? ` (${item.portionName})`
            : '';
        lines.push(
          `• ${item.foodName}${size} x${item.quantity} — ${formatCurrency(item.unitPrice * item.quantity)}`,
        );
      }
    }
  }

  lines.push('', `Items subtotal: ${formatCurrency(fees.itemsTotal)}`);
  lines.push(
    `Pack fees (${fees.packCount} pack${fees.packCount === 1 ? '' : 's'}): ${formatCurrency(fees.packFees)}`,
  );
  if (order.orderType === 'DELIVERY') {
    lines.push(`Delivery fee: ${formatCurrency(order.deliveryFee ?? fees.deliveryFee)}`);
  } else {
    lines.push('Delivery fee: ₦0 (Pickup)');
  }
  lines.push(`Total: ${formatCurrency(order.total)}`);

  if (order.paid && order.paymentProvider?.toLowerCase() === 'kora') {
    lines.push('', `I've paid via Kora. Looking forward to my order — thank you! 🙏`);
  } else if (order.paid) {
    lines.push('', `I've made the bank transfer. Please confirm when you see it — thank you! 🙏`);
  } else if (order.paymentNote?.trim()) {
    lines.push('', order.paymentNote.trim());
  }

  return lines.join('\n');
}

export function buildOrderWhatsAppUrl(
  whatsappUrl: string,
  order: WhatsAppOrderDetails,
): string {
  const phone = extractWhatsAppPhone(whatsappUrl);
  const text = buildOrderWhatsAppMessage(order);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function openOrderOnWhatsApp(
  whatsappUrl: string,
  order: WhatsAppOrderDetails,
): void {
  const url = buildOrderWhatsAppUrl(whatsappUrl, order);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.assign(url);
  }
}
